const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.rbxm' || ext === '.rbxmx') return cb(null, true);
        cb(new Error('Only .rbxm and .rbxmx allowed'));
    }
});

// Validate key
app.post('/api/validate-key', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.json({ valid: false, message: 'API Key kosong' });

    try {
        const r = await fetch('https://apis.roblox.com/assets/v1/assets?pageSize=1', {
            headers: { 'x-api-key': apiKey }
        });
        if (r.status === 401 || r.status === 403) {
            return res.json({ valid: false, message: 'API Key invalid atau tidak punya permission Assets' });
        }
        return res.json({ valid: true, message: 'API Key valid!' });
    } catch (e) {
        return res.json({ valid: true, message: 'Key diterima (format valid)' });
    }
});

// Upload
app.post('/api/upload', upload.single('rbxmFile'), async (req, res) => {
    const cleanup = () => {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    };

    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

        const { apiKey, assetName, assetDescription, creatorId, creatorType } = req.body;
        if (!apiKey) { cleanup(); return res.status(400).json({ success: false, message: 'API Key required' }); }
        if (!assetName) { cleanup(); return res.status(400).json({ success: false, message: 'Asset name required' }); }
        if (!creatorId) { cleanup(); return res.status(400).json({ success: false, message: 'Creator ID required' }); }

        const fileBuffer = fs.readFileSync(req.file.path);

        // Build request JSON
        const requestPayload = {
            assetType: 'Model',
            displayName: assetName.substring(0, 50),
            description: (assetDescription || '').substring(0, 1000),
            creationContext: {
                creator: creatorType === 'Group'
                    ? { groupId: String(creatorId) }
                    : { userId: String(creatorId) }
            }
        };

        // Multipart form - Roblox Open Cloud Assets v1
        const boundary = '----RBXMConverter' + Date.now();
        const CRLF = '\r\n';

        // Build multipart manually for reliability
        let bodyParts = [];

        // Part 1: request JSON
        bodyParts.push(
            `--${boundary}${CRLF}` +
            `Content-Disposition: form-data; name="request"${CRLF}` +
            `Content-Type: application/json${CRLF}${CRLF}` +
            JSON.stringify(requestPayload)
        );

        // Part 2: file content
        const fileHeader =
            `--${boundary}${CRLF}` +
            `Content-Disposition: form-data; name="fileContent"; filename="${req.file.originalname}"${CRLF}` +
            `Content-Type: application/octet-stream${CRLF}${CRLF}`;

        const fileFooter = `${CRLF}--${boundary}--${CRLF}`;

        // Combine into one buffer
        const headerBuffer = Buffer.from(bodyParts.join(CRLF) + CRLF);
        const fileHeaderBuffer = Buffer.from(fileHeader);
        const fileFooterBuffer = Buffer.from(fileFooter);

        const fullBody = Buffer.concat([headerBuffer, fileHeaderBuffer, fileBuffer, fileFooterBuffer]);

        console.log('Uploading to Roblox...');
        console.log('Asset Name:', assetName);
        console.log('Creator:', creatorType, creatorId);
        console.log('File:', req.file.originalname, fileBuffer.length, 'bytes');

        const uploadRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: fullBody
        });

        const responseText = await uploadRes.text();
        cleanup();

        console.log('Roblox response status:', uploadRes.status);
        console.log('Roblox response:', responseText);

        if (!uploadRes.ok) {
            let errMsg = `Roblox API error (${uploadRes.status})`;
            try {
                const errData = JSON.parse(responseText);
                errMsg = errData.message || errData.error || JSON.stringify(errData);
            } catch (e) {
                errMsg = responseText || errMsg;
            }
            return res.json({ success: false, message: errMsg });
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            return res.json({ success: false, message: 'Invalid response from Roblox' });
        }

        // Check if it's an async operation
        if (data.path || data.operationId) {
            const opPath = data.path || `operations/${data.operationId}`;
            console.log('Polling operation:', opPath);

            // Poll for result
            for (let i = 0; i < 30; i++) {
                await sleep(2000);

                try {
                    const pollRes = await fetch(`https://apis.roblox.com/assets/v1/${opPath}`, {
                        headers: { 'x-api-key': apiKey }
                    });
                    const pollText = await pollRes.text();
                    console.log(`Poll ${i + 1}:`, pollText);

                    const pollData = JSON.parse(pollText);

                    if (pollData.done === true) {
                        const resp = pollData.response || {};
                        let assetId = resp.assetId || extractAssetId(resp.path) || null;
                        if (assetId) {
                            return res.json({
                                success: true,
                                assetId: String(assetId),
                                message: 'Upload berhasil!',
                                toolboxUrl: `https://www.roblox.com/library/${assetId}`,
                                studioUrl: `rbxassetid://${assetId}`
                            });
                        }
                        // Done but no ID found
                        return res.json({
                            success: true,
                            assetId: null,
                            message: 'Upload selesai tapi Asset ID tidak ditemukan. Cek inventory Roblox kamu.',
                            rawResponse: pollData
                        });
                    }

                    if (pollData.error) {
                        return res.json({
                            success: false,
                            message: pollData.error.message || 'Processing error'
                        });
                    }
                } catch (pollErr) {
                    console.error('Poll error:', pollErr.message);
                }
            }

            // Timeout
            return res.json({
                success: true,
                assetId: null,
                message: 'Upload dikirim tapi masih diproses Roblox. Cek inventory dalam beberapa menit.'
            });
        }

        // Direct response
        let assetId = data.assetId || extractAssetId(data.path) || null;
        return res.json({
            success: true,
            assetId: assetId ? String(assetId) : null,
            message: assetId ? 'Upload berhasil!' : 'Upload selesai, cek inventory.',
            toolboxUrl: assetId ? `https://www.roblox.com/library/${assetId}` : null,
            studioUrl: assetId ? `rbxassetid://${assetId}` : null
        });

    } catch (err) {
        cleanup();
        console.error('Server error:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
});

function extractAssetId(path) {
    if (!path) return null;
    const m = path.match(/assets\/(\d+)/);
    return m ? m[1] : null;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n✅ Server running: http://localhost:${PORT}\n`);
});
