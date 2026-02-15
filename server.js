const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Upload folder
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
        cb(new Error('Only .rbxm and .rbxmx'));
    }
});

// Error handler untuk multer
function handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: 'File error: ' + err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
}

// ============ VALIDATE KEY ============
app.post('/api/validate-key', async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey || !apiKey.trim()) {
            return res.json({ valid: false, message: 'API Key kosong' });
        }

        const r = await fetch('https://apis.roblox.com/assets/v1/assets?pageSize=1', {
            method: 'GET',
            headers: { 'x-api-key': apiKey.trim() }
        });

        if (r.status === 401 || r.status === 403) {
            return res.json({ valid: false, message: 'API Key invalid atau tidak punya permission' });
        }

        return res.json({ valid: true, message: 'API Key valid!' });
    } catch (e) {
        console.error('Validate error:', e.message);
        return res.json({ valid: true, message: 'Key format diterima' });
    }
});

// ============ UPLOAD ============
app.post('/api/upload', upload.single('rbxmFile'), handleMulterError, async (req, res) => {
    function cleanup() {
        try {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        } catch (e) { }
    }

    try {
        // Validasi input
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
        }

        const apiKey = (req.body.apiKey || '').trim();
        const assetName = (req.body.assetName || '').trim();
        const assetDescription = (req.body.assetDescription || '').trim();
        const creatorId = (req.body.creatorId || '').trim();
        const creatorType = (req.body.creatorType || 'User').trim();

        if (!apiKey) { cleanup(); return res.status(400).json({ success: false, message: 'API Key diperlukan' }); }
        if (!assetName) { cleanup(); return res.status(400).json({ success: false, message: 'Nama asset diperlukan' }); }
        if (!creatorId) { cleanup(); return res.status(400).json({ success: false, message: 'Creator ID diperlukan' }); }

        console.log('=== UPLOAD START ===');
        console.log('File:', req.file.originalname, '|', req.file.size, 'bytes');
        console.log('Name:', assetName);
        console.log('Creator:', creatorType, creatorId);

        // Baca file
        const fileBuffer = fs.readFileSync(req.file.path);

        // Build request payload
        const requestJson = {
            assetType: 'Model',
            displayName: assetName.substring(0, 50),
            description: assetDescription.substring(0, 1000),
            creationContext: {
                creator: {}
            }
        };

        if (creatorType === 'Group') {
            requestJson.creationContext.creator.groupId = creatorId;
        } else {
            requestJson.creationContext.creator.userId = creatorId;
        }

        // Build multipart body manual
        const boundary = '----RBXM' + Date.now() + Math.random().toString(36).substr(2);
        const NL = '\r\n';

        const parts = [];

        // Part 1: request JSON
        parts.push(Buffer.from(
            '--' + boundary + NL +
            'Content-Disposition: form-data; name="request"' + NL +
            'Content-Type: application/json' + NL +
            NL +
            JSON.stringify(requestJson) + NL
        ));

        // Part 2: fileContent
        parts.push(Buffer.from(
            '--' + boundary + NL +
            'Content-Disposition: form-data; name="fileContent"; filename="' + req.file.originalname + '"' + NL +
            'Content-Type: application/octet-stream' + NL +
            NL
        ));
        parts.push(fileBuffer);
        parts.push(Buffer.from(NL));

        // End boundary
        parts.push(Buffer.from('--' + boundary + '--' + NL));

        const fullBody = Buffer.concat(parts);

        console.log('Sending to Roblox... (' + fullBody.length + ' bytes)');

        // Kirim ke Roblox
        const uploadRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'multipart/form-data; boundary=' + boundary
            },
            body: fullBody
        });

        const resText = await uploadRes.text();
        cleanup();

        console.log('Roblox status:', uploadRes.status);
        console.log('Roblox response:', resText);

        // Handle error responses
        if (!uploadRes.ok) {
            let msg = 'Roblox API error (' + uploadRes.status + ')';
            try {
                const errObj = JSON.parse(resText);
                if (errObj.message) msg = errObj.message;
                else if (errObj.error) msg = errObj.error;
                else if (errObj.errors && errObj.errors.length) msg = errObj.errors[0].message || JSON.stringify(errObj.errors[0]);
                else msg = resText;
            } catch (e) {
                msg = resText || msg;
            }

            // Tambah info spesifik
            if (uploadRes.status === 401) msg = 'API Key tidak valid. Cek kembali key kamu.';
            if (uploadRes.status === 403) msg = 'Permission denied. Pastikan API key punya permission Assets (Read + Write).';
            if (uploadRes.status === 429) msg = 'Rate limited. Tunggu sebentar lalu coba lagi.';

            return res.json({ success: false, message: msg });
        }

        // Parse response
        let data;
        try {
            data = JSON.parse(resText);
        } catch (e) {
            return res.json({ success: false, message: 'Response dari Roblox tidak valid: ' + resText.substring(0, 200) });
        }

        console.log('Parsed response:', JSON.stringify(data));

        // Cek apakah async operation
        if (data.path && data.done === undefined) {
            // Ini operation, perlu polling
            console.log('Got operation, polling:', data.path);
            const assetId = await pollOperation(data.path, apiKey);

            if (assetId) {
                return res.json({
                    success: true,
                    assetId: String(assetId),
                    message: 'Upload berhasil!',
                    toolboxUrl: 'https://www.roblox.com/library/' + assetId,
                    studioUrl: 'rbxassetid://' + assetId
                });
            }

            return res.json({
                success: true,
                assetId: null,
                message: 'Upload dikirim, sedang diproses Roblox. Cek inventory dalam beberapa menit.'
            });
        }

        // Cek done langsung
        if (data.done === true && data.response) {
            const assetId = data.response.assetId || extractId(data.response.path);
            if (assetId) {
                return res.json({
                    success: true,
                    assetId: String(assetId),
                    message: 'Upload berhasil!',
                    toolboxUrl: 'https://www.roblox.com/library/' + assetId,
                    studioUrl: 'rbxassetid://' + assetId
                });
            }
        }

        // Direct asset response
        const directId = data.assetId || extractId(data.path);
        if (directId) {
            return res.json({
                success: true,
                assetId: String(directId),
                message: 'Upload berhasil!',
                toolboxUrl: 'https://www.roblox.com/library/' + directId,
                studioUrl: 'rbxassetid://' + directId
            });
        }

        // Fallback - berhasil tapi ID belum tersedia
        return res.json({
            success: true,
            assetId: null,
            message: 'Upload terkirim. Cek inventory Roblox kamu.',
            rawResponse: data
        });

    } catch (err) {
        cleanup();
        console.error('=== SERVER ERROR ===');
        console.error(err);

        return res.status(500).json({
            success: false,
            message: 'Server error: ' + (err.message || 'Unknown error')
        });
    }
});

// ============ POLLING ============
async function pollOperation(opPath, apiKey) {
    // Normalisasi path
    let url = opPath;
    if (!url.startsWith('http')) {
        url = 'https://apis.roblox.com/assets/v1/' + opPath;
    }

    console.log('Polling URL:', url);

    for (let i = 0; i < 20; i++) {
        await sleep(2500);

        try {
            const r = await fetch(url, {
                method: 'GET',
                headers: { 'x-api-key': apiKey }
            });

            const text = await r.text();
            console.log('Poll ' + (i + 1) + ':', text);

            const d = JSON.parse(text);

            if (d.done === true) {
                if (d.response) {
                    return d.response.assetId || extractId(d.response.path) || null;
                }
                return null;
            }

            if (d.error) {
                console.error('Poll error:', d.error);
                return null;
            }
        } catch (e) {
            console.error('Poll exception:', e.message);
        }
    }

    console.log('Polling timeout after 20 attempts');
    return null;
}

function extractId(p) {
    if (!p) return null;
    const m = p.match(/assets\/(\d+)/);
    return m ? m[1] : null;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ============ CATCH ALL ============
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ START ============
app.listen(PORT, () => {
    console.log('');
    console.log('✅ RBXM Converter running at http://localhost:' + PORT);
    console.log('');
});
