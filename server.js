const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Upload setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Validate key
app.post('/api/validate-key', async (req, res) => {
    const key = (req.body.apiKey || '').trim();
    if (!key) return res.json({ valid: false, message: 'API Key kosong' });
    if (key.length < 10) return res.json({ valid: false, message: 'API Key terlalu pendek' });

    try {
        const https = require('https');
        const result = await new Promise((resolve, reject) => {
            const r = https.request('https://apis.roblox.com/assets/v1/assets?pageSize=1', {
                method: 'GET',
                headers: { 'x-api-key': key }
            }, (resp) => {
                let d = '';
                resp.on('data', c => d += c);
                resp.on('end', () => resolve({ status: resp.statusCode, body: d }));
            });
            r.on('error', reject);
            r.end();
        });

        if (result.status === 401 || result.status === 403) {
            return res.json({ valid: false, message: 'API Key invalid atau tidak punya permission Assets' });
        }
        return res.json({ valid: true, message: 'API Key valid!' });
    } catch (e) {
        return res.json({ valid: true, message: 'Key diterima (validasi penuh saat upload)' });
    }
});

// Upload file
app.post('/api/upload', (req, res) => {
    const up = upload.single('rbxmFile');

    up(req, res, async (multerErr) => {
        // Handle multer error
        if (multerErr) {
            console.log('Multer error:', multerErr.message);
            return res.json({ success: false, message: 'File error: ' + multerErr.message });
        }

        const cleanup = () => {
            try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) { }
        };

        try {
            if (!req.file) {
                return res.json({ success: false, message: 'File tidak ditemukan. Pilih file .rbxm' });
            }

            const apiKey = (req.body.apiKey || '').trim();
            const assetName = (req.body.assetName || '').trim();
            const assetDescription = (req.body.assetDescription || '').trim();
            const creatorId = (req.body.creatorId || '').trim();
            const creatorType = (req.body.creatorType || 'User').trim();

            if (!apiKey) { cleanup(); return res.json({ success: false, message: 'API Key diperlukan' }); }
            if (!assetName) { cleanup(); return res.json({ success: false, message: 'Nama asset diperlukan' }); }
            if (!creatorId) { cleanup(); return res.json({ success: false, message: 'Creator ID diperlukan' }); }

            const fileData = fs.readFileSync(req.file.path);
            const fileName = req.body.originalName || req.file.originalname || 'model.rbxm';

            console.log('--- Upload ---');
            console.log('File:', fileName, fileData.length, 'bytes');
            console.log('Asset:', assetName);
            console.log('Creator:', creatorType, creatorId);

            // Build request JSON
            const requestObj = {
                assetType: 'Model',
                displayName: assetName.substring(0, 50),
                description: assetDescription.substring(0, 1000),
                creationContext: {
                    creator: {}
                }
            };

            if (creatorType === 'Group') {
                requestObj.creationContext.creator.groupId = creatorId;
            } else {
                requestObj.creationContext.creator.userId = creatorId;
            }

            const requestJsonStr = JSON.stringify(requestObj);

            // Build multipart manually with native https
            const boundary = 'Boundary' + Date.now();
            const CRLF = '\r\n';

            const beforeFile =
                '--' + boundary + CRLF +
                'Content-Disposition: form-data; name="request"' + CRLF +
                'Content-Type: application/json' + CRLF +
                CRLF +
                requestJsonStr + CRLF +
                '--' + boundary + CRLF +
                'Content-Disposition: form-data; name="fileContent"; filename="' + fileName + '"' + CRLF +
                'Content-Type: application/octet-stream' + CRLF +
                CRLF;

            const afterFile = CRLF + '--' + boundary + '--' + CRLF;

            const bodyBuffer = Buffer.concat([
                Buffer.from(beforeFile, 'utf-8'),
                fileData,
                Buffer.from(afterFile, 'utf-8')
            ]);

            cleanup(); // file sudah dibaca, hapus

            console.log('Sending to Roblox...', bodyBuffer.length, 'bytes');

            // Send with native https (paling reliable)
            const https = require('https');
            const robloxResult = await new Promise((resolve, reject) => {
                const options = {
                    hostname: 'apis.roblox.com',
                    path: '/assets/v1/assets',
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'multipart/form-data; boundary=' + boundary,
                        'Content-Length': bodyBuffer.length
                    }
                };

                const r = https.request(options, (resp) => {
                    let data = '';
                    resp.on('data', chunk => data += chunk);
                    resp.on('end', () => {
                        resolve({ status: resp.statusCode, body: data });
                    });
                });

                r.on('error', (e) => reject(e));
                r.write(bodyBuffer);
                r.end();
            });

            console.log('Roblox status:', robloxResult.status);
            console.log('Roblox body:', robloxResult.body);

            // Handle non-OK
            if (robloxResult.status >= 400) {
                let msg = 'Roblox error (' + robloxResult.status + ')';

                if (robloxResult.status === 401) msg = 'API Key tidak valid.';
                else if (robloxResult.status === 403) msg = 'Permission denied. Pastikan API key punya Assets Read + Write, dan IP 0.0.0.0/0 di allowed list.';
                else if (robloxResult.status === 429) msg = 'Rate limited. Tunggu 1 menit.';
                else {
                    try {
                        const e = JSON.parse(robloxResult.body);
                        msg = e.message || e.error || e.Message || JSON.stringify(e);
                    } catch (x) {
                        msg = robloxResult.body.substring(0, 300) || msg;
                    }
                }

                return res.json({ success: false, message: msg });
            }

            // Parse OK response
            let parsed;
            try {
                parsed = JSON.parse(robloxResult.body);
            } catch (e) {
                return res.json({ success: false, message: 'Response Roblox tidak bisa diparse' });
            }

            // Kalau langsung dapat asset
            let assetId = findAssetId(parsed);
            if (assetId) {
                console.log('Direct asset ID:', assetId);
                return res.json({
                    success: true,
                    assetId: assetId,
                    message: 'Upload berhasil!',
                    toolboxUrl: 'https://www.roblox.com/library/' + assetId,
                    studioUrl: 'rbxassetid://' + assetId
                });
            }

            // Kalau dapat operation (async)
            if (parsed.path) {
                console.log('Got operation:', parsed.path);

                assetId = await pollRoblox(parsed.path, apiKey);

                if (assetId) {
                    return res.json({
                        success: true,
                        assetId: assetId,
                        message: 'Upload berhasil!',
                        toolboxUrl: 'https://www.roblox.com/library/' + assetId,
                        studioUrl: 'rbxassetid://' + assetId
                    });
                }

                return res.json({
                    success: true,
                    assetId: null,
                    message: 'Upload terkirim, masih diproses Roblox. Cek inventory kamu dalam 1-5 menit.'
                });
            }

            // Fallback
            return res.json({
                success: true,
                assetId: null,
                message: 'Upload terkirim. Cek inventory Roblox kamu.'
            });

        } catch (err) {
            cleanup();
            console.error('ERROR:', err);
            return res.json({ success: false, message: 'Server error: ' + err.message });
        }
    });
});

// Poll operation
async function pollRoblox(opPath, apiKey) {
    const https = require('https');

    let fullPath = opPath;
    if (fullPath.startsWith('operations/')) {
        fullPath = '/assets/v1/' + fullPath;
    } else if (!fullPath.startsWith('/')) {
        fullPath = '/assets/v1/' + fullPath;
    }

    console.log('Polling:', fullPath);

    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3000));

        try {
            const result = await new Promise((resolve, reject) => {
                const r = https.request({
                    hostname: 'apis.roblox.com',
                    path: fullPath,
                    method: 'GET',
                    headers: { 'x-api-key': apiKey }
                }, (resp) => {
                    let d = '';
                    resp.on('data', c => d += c);
                    resp.on('end', () => resolve({ status: resp.statusCode, body: d }));
                });
                r.on('error', reject);
                r.end();
            });

            console.log('Poll', i + 1, ':', result.body.substring(0, 200));

            const data = JSON.parse(result.body);

            if (data.done === true && data.response) {
                return findAssetId(data.response) || findAssetId(data);
            }

            if (data.error) {
                console.log('Poll got error:', data.error);
                return null;
            }
        } catch (e) {
            console.log('Poll error:', e.message);
        }
    }

    return null;
}

// Extract asset ID from various response formats
function findAssetId(obj) {
    if (!obj) return null;
    if (obj.assetId) return String(obj.assetId);
    if (obj.path) {
        const m = obj.path.match(/assets\/(\d+)/);
        if (m) return m[1];
    }
    if (obj.response) return findAssetId(obj.response);
    return null;
}

// Catch all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
});

app.listen(PORT, () => {
    console.log('');
    console.log('=================================');
    console.log('  RBXM Converter READY');
    console.log('  http://localhost:' + PORT);
    console.log('=================================');
    console.log('');
});
