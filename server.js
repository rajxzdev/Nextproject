// =============================================
// Backend Proxy for Roblox Open Cloud API
// (Required because Roblox doesn't allow CORS)
// =============================================

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

// Use dynamic import for node-fetch v3 or require for v2
let fetch;
try {
    fetch = require('node-fetch');
} catch (e) {
    fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

const app = express();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

app.use(cors());
app.use(express.static(path.join(__dirname)));

// ===== Upload Endpoint =====
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { apiKey, creatorId, creatorType, assetType, assetName, assetDescription } = req.body;
        const file = req.file;

        if (!apiKey || !creatorId || !file) {
            return res.status(400).json({ message: 'Missing apiKey, creatorId, or file' });
        }

        console.log(`\n📤 Upload: "${assetName}" (${assetType}) by ${creatorType}:${creatorId}`);
        console.log(`   File: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`);

        const reqPayload = {
            assetType: assetType || 'Model',
            displayName: assetName || 'Untitled',
            description: assetDescription || assetName || '',
            creationContext: {
                creator: creatorType === 'Group'
                    ? { groupId: creatorId }
                    : { userId: creatorId }
            }
        };

        const boundary = '----Boundary' + Date.now();
        const reqJson = JSON.stringify(reqPayload);

        const ctMap = { Model: 'application/octet-stream', Decal: 'image/png', Audio: 'audio/mpeg' };

        const parts = [
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${reqJson}\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="fileContent"; filename="${file.originalname}"\r\nContent-Type: ${ctMap[assetType] || 'application/octet-stream'}\r\n\r\n`
            ),
            file.buffer,
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ];

        const body = Buffer.concat(parts);

        const rRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length.toString(),
            },
            body
        });

        const txt = await rRes.text();
        console.log(`   Roblox ${rRes.status}: ${txt.substring(0, 300)}`);

        if (!rRes.ok) {
            let err;
            try { err = JSON.parse(txt); } catch (e) { err = { message: txt }; }
            return res.status(rRes.status).json(err);
        }

        let data;
        try { data = JSON.parse(txt); } catch (e) { data = { raw: txt }; }
        res.json(data);

    } catch (err) {
        console.error('❌ Upload error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ===== Poll Endpoint =====
app.get('/api/poll', async (req, res) => {
    try {
        const { path: opPath, apiKey } = req.query;
        if (!opPath || !apiKey) {
            return res.status(400).json({ message: 'Missing path or apiKey' });
        }

        const rRes = await fetch(`https://apis.roblox.com/assets/v1/${opPath}`, {
            headers: { 'x-api-key': apiKey }
        });

        const txt = await rRes.text();
        if (!rRes.ok) return res.status(rRes.status).json({ message: txt });

        let data;
        try { data = JSON.parse(txt); } catch (e) { data = { raw: txt }; }
        res.json(data);

    } catch (err) {
        console.error('❌ Poll error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ===== Health =====
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ===== Fallback =====
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ===== Start =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🚀 RBXM Converter Server Running    ║
║  🌐 http://localhost:${PORT}             ║
╚═══════════════════════════════════════╝
    `);
});
