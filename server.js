// ============================================
// Backend Proxy Server for Roblox Open Cloud API
// Needed because Roblox API doesn't support CORS
// ============================================

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname)));

// ===== Upload Asset Endpoint =====
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const {
            apiKey,
            creatorId,
            creatorType,
            assetType,
            assetName,
            assetDescription
        } = req.body;

        const file = req.file;

        if (!apiKey || !creatorId || !file) {
            return res.status(400).json({
                error: 'Missing required fields: apiKey, creatorId, file'
            });
        }

        console.log(`[Upload] Asset: ${assetName}, Type: ${assetType}, Creator: ${creatorType}:${creatorId}`);
        console.log(`[Upload] File: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`);

        // Build the request JSON
        const requestPayload = {
            assetType: assetType || 'Model',
            displayName: assetName || 'Untitled Asset',
            description: assetDescription || assetName || 'Uploaded via RBXM Converter',
            creationContext: {
                creator: {}
            }
        };

        if (creatorType === 'Group') {
            requestPayload.creationContext.creator.groupId = creatorId;
        } else {
            requestPayload.creationContext.creator.userId = creatorId;
        }

        // Build multipart form data for Roblox API
        const boundary = '----RBXMConverterBoundary' + Date.now();

        const requestJson = JSON.stringify(requestPayload);

        // Manually construct multipart body
        const parts = [];

        // Part 1: request JSON
        parts.push(
            Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="request"\r\n` +
                `Content-Type: application/json\r\n\r\n` +
                requestJson + '\r\n'
            )
        );

        // Part 2: file content
        const contentTypeMap = {
            'Model': 'application/octet-stream',
            'Decal': 'image/png',
            'Audio': 'audio/mpeg',
        };

        parts.push(
            Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="fileContent"; filename="${file.originalname}"\r\n` +
                `Content-Type: ${contentTypeMap[assetType] || 'application/octet-stream'}\r\n\r\n`
            )
        );
        parts.push(file.buffer);
        parts.push(Buffer.from('\r\n'));

        // End boundary
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        const body = Buffer.concat(parts);

        // Make request to Roblox Open Cloud API
        const robloxResponse = await fetch('https://apis.roblox.com/assets/v1/assets', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length.toString(),
            },
            body: body,
        });

        const responseText = await robloxResponse.text();
        console.log(`[Roblox API] Status: ${robloxResponse.status}`);
        console.log(`[Roblox API] Response: ${responseText.substring(0, 500)}`);

        if (!robloxResponse.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                errorData = { message: responseText };
            }
            return res.status(robloxResponse.status).json({
                error: 'Roblox API error',
                message: errorData.message || errorData.error || responseText,
                details: errorData
            });
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { raw: responseText };
        }

        console.log(`[Upload] Success! Operation path: ${data.path || 'N/A'}`);
        res.json(data);

    } catch (err) {
        console.error('[Upload Error]', err);
        res.status(500).json({
            error: 'Server error',
            message: err.message
        });
    }
});

// ===== Poll Operation Endpoint =====
app.get('/api/poll', async (req, res) => {
    try {
        const { path: operationPath, apiKey } = req.query;

        if (!operationPath || !apiKey) {
            return res.status(400).json({
                error: 'Missing path or apiKey query parameters'
            });
        }

        console.log(`[Poll] Checking: ${operationPath}`);

        const robloxResponse = await fetch(
            `https://apis.roblox.com/assets/v1/${operationPath}`,
            {
                headers: { 'x-api-key': apiKey }
            }
        );

        const responseText = await robloxResponse.text();

        if (!robloxResponse.ok) {
            return res.status(robloxResponse.status).json({
                error: 'Poll failed',
                message: responseText
            });
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { raw: responseText };
        }

        console.log(`[Poll] Done: ${data.done}, AssetId: ${data.response?.assetId || 'pending'}`);
        res.json(data);

    } catch (err) {
        console.error('[Poll Error]', err);
        res.status(500).json({
            error: 'Server error',
            message: err.message
        });
    }
});

// ===== Health Check =====
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== Catch-all: serve index.html =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   RBXM → Roblox Asset ID Converter Server   ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║   🌐 http://localhost:${PORT}                   ║`);
    console.log('║   📡 API Proxy: /api/upload                  ║');
    console.log('║   🔍 Poll:      /api/poll                    ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
});
