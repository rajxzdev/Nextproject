const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// MIME types
const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

// Helper: baca body JSON
function readJSON(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { resolve({}); }
        });
        req.on('error', reject);
    });
}

// Helper: parse multipart
function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            try {
                const buf = Buffer.concat(chunks);
                const contentType = req.headers['content-type'] || '';
                const boundaryMatch = contentType.match(/boundary=(.+)/);
                if (!boundaryMatch) return reject(new Error('No boundary'));

                const boundary = boundaryMatch[1];
                const result = { fields: {}, file: null };

                const raw = buf.toString('binary');
                const parts = raw.split('--' + boundary).filter(p => p && p !== '--\r\n' && p.trim() !== '--');

                for (const part of parts) {
                    if (part.trim() === '--' || part.trim() === '') continue;

                    const headerEnd = part.indexOf('\r\n\r\n');
                    if (headerEnd === -1) continue;

                    const header = part.substring(0, headerEnd);
                    const content = part.substring(headerEnd + 4);
                    const cleanContent = content.replace(/\r\n$/, '');

                    const nameMatch = header.match(/name="([^"]+)"/);
                    const filenameMatch = header.match(/filename="([^"]+)"/);

                    if (!nameMatch) continue;
                    const name = nameMatch[1];

                    if (filenameMatch) {
                        const filename = filenameMatch[1];
                        const fileStart = buf.indexOf('\r\n\r\n', buf.indexOf(name)) + 4;
                        const nextBoundary = buf.indexOf(Buffer.from('\r\n--' + boundary), fileStart);
                        const fileBuffer = buf.slice(fileStart, nextBoundary);

                        const savePath = path.join(UPLOAD_DIR, Date.now() + '-' + filename);
                        fs.writeFileSync(savePath, fileBuffer);
                        result.file = { name: filename, path: savePath, size: fileBuffer.length };
                    } else {
                        result.fields[name] = cleanContent;
                    }
                }
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

// Helper: https request
function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const https = require('https');
        const req = https.request(options, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

function sendJSON(res, statusCode, obj) {
    const str = JSON.stringify(obj);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(str)
    });
    res.end(str);
}

function sendFile(res, filePath) {
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    } catch (e) {
        // fallback ke index.html
        try {
            const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'));
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch (e2) {
            res.writeHead(404);
            res.end('Not found');
        }
    }
}

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ================================
// SERVER
// ================================
const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];
    const method = req.method;

    console.log(method, url);

    try {
        // ---- VALIDATE KEY ----
        if (url === '/api/validate-key' && method === 'POST') {
            const body = await readJSON(req);
            const key = (body.apiKey || '').trim();

            if (!key) return sendJSON(res, 200, { valid: false, message: 'API Key kosong' });

            try {
                const r = await httpsRequest({
                    hostname: 'apis.roblox.com',
                    path: '/assets/v1/assets?pageSize=1',
                    method: 'GET',
                    headers: { 'x-api-key': key }
                });

                if (r.status === 401 || r.status === 403) {
                    return sendJSON(res, 200, { valid: false, message: 'API Key invalid atau tidak punya permission Assets' });
                }
                return sendJSON(res, 200, { valid: true, message: 'API Key valid!' });
            } catch (e) {
                return sendJSON(res, 200, { valid: true, message: 'Key diterima' });
            }
        }

        // ---- UPLOAD ----
        if (url === '/api/upload' && method === 'POST') {
            let parsed;
            try {
                parsed = await parseMultipart(req);
            } catch (e) {
                console.error('Parse error:', e.message);
                return sendJSON(res, 200, { success: false, message: 'Gagal membaca file: ' + e.message });
            }

            const cleanup = () => {
                try { if (parsed.file && fs.existsSync(parsed.file.path)) fs.unlinkSync(parsed.file.path); } catch (e) { }
            };

            if (!parsed.file) {
                return sendJSON(res, 200, { success: false, message: 'File tidak ditemukan' });
            }

            const apiKey = (parsed.fields.apiKey || '').trim();
            const assetName = (parsed.fields.assetName || '').trim();
            const assetDescription = (parsed.fields.assetDescription || '').trim();
            const creatorId = (parsed.fields.creatorId || '').trim();
            const creatorType = (parsed.fields.creatorType || 'User').trim();

            if (!apiKey) { cleanup(); return sendJSON(res, 200, { success: false, message: 'API Key diperlukan' }); }
            if (!assetName) { cleanup(); return sendJSON(res, 200, { success: false, message: 'Nama asset diperlukan' }); }
            if (!creatorId) { cleanup(); return sendJSON(res, 200, { success: false, message: 'Creator ID diperlukan' }); }

            console.log('--- UPLOAD ---');
            console.log('File:', parsed.file.name, parsed.file.size, 'bytes');
            console.log('Asset:', assetName, '| Creator:', creatorType, creatorId);

            // Baca file
            const fileBuffer = fs.readFileSync(parsed.file.path);
            cleanup();

            // Build request
            const requestObj = {
                assetType: 'Model',
                displayName: assetName.substring(0, 50),
                description: assetDescription.substring(0, 1000),
                creationContext: { creator: {} }
            };

            if (creatorType === 'Group') {
                requestObj.creationContext.creator.groupId = creatorId;
            } else {
                requestObj.creationContext.creator.userId = creatorId;
            }

            // Build multipart
            const boundary = 'RBXBoundary' + Date.now();
            const NL = '\r\n';

            const beforeFile = Buffer.from(
                '--' + boundary + NL +
                'Content-Disposition: form-data; name="request"' + NL +
                'Content-Type: application/json' + NL +
                NL +
                JSON.stringify(requestObj) + NL +
                '--' + boundary + NL +
                'Content-Disposition: form-data; name="fileContent"; filename="' + parsed.file.name + '"' + NL +
                'Content-Type: application/octet-stream' + NL +
                NL,
                'utf-8'
            );

            const afterFile = Buffer.from(NL + '--' + boundary + '--' + NL, 'utf-8');
            const fullBody = Buffer.concat([beforeFile, fileBuffer, afterFile]);

            console.log('Sending to Roblox...', fullBody.length, 'bytes');

            // Send
            let rResult;
            try {
                rResult = await httpsRequest({
                    hostname: 'apis.roblox.com',
                    path: '/assets/v1/assets',
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'multipart/form-data; boundary=' + boundary,
                        'Content-Length': fullBody.length
                    }
                }, fullBody);
            } catch (e) {
                console.error('Roblox request failed:', e.message);
                return sendJSON(res, 200, { success: false, message: 'Gagal konek ke Roblox: ' + e.message });
            }

            console.log('Roblox:', rResult.status, rResult.body.substring(0, 300));

            // Error response
            if (rResult.status >= 400) {
                let msg = 'Roblox error (' + rResult.status + ')';
                if (rResult.status === 401) msg = 'API Key tidak valid.';
                else if (rResult.status === 403) msg = 'Permission denied. Pastikan API key punya Assets Read+Write dan IP 0.0.0.0/0.';
                else if (rResult.status === 429) msg = 'Rate limited. Tunggu 1 menit.';
                else {
                    try { const e = JSON.parse(rResult.body); msg = e.message || e.error || JSON.stringify(e); }
                    catch (x) { msg = rResult.body.substring(0, 200) || msg; }
                }
                return sendJSON(res, 200, { success: false, message: msg });
            }

            // Parse response
            let data;
            try { data = JSON.parse(rResult.body); }
            catch (e) { return sendJSON(res, 200, { success: false, message: 'Response Roblox tidak valid' }); }

            // Direct asset ID
            let assetId = findAssetId(data);
            if (assetId) {
                return sendJSON(res, 200, {
                    success: true, assetId: assetId, message: 'Upload berhasil!',
                    toolboxUrl: 'https://www.roblox.com/library/' + assetId,
                    studioUrl: 'rbxassetid://' + assetId
                });
            }

            // Async operation - poll
            if (data.path) {
                console.log('Polling operation:', data.path);

                let pollPath = data.path;
                if (!pollPath.startsWith('/')) pollPath = '/assets/v1/' + pollPath;

                for (let i = 0; i < 15; i++) {
                    await sleep(3000);
                    try {
                        const pr = await httpsRequest({
                            hostname: 'apis.roblox.com',
                            path: pollPath,
                            method: 'GET',
                            headers: { 'x-api-key': apiKey }
                        });
                        console.log('Poll', i + 1, ':', pr.body.substring(0, 200));
                        const pd = JSON.parse(pr.body);

                        if (pd.done === true) {
                            assetId = findAssetId(pd);
                            if (assetId) {
                                return sendJSON(res, 200, {
                                    success: true, assetId: assetId, message: 'Upload berhasil!',
                                    toolboxUrl: 'https://www.roblox.com/library/' + assetId,
                                    studioUrl: 'rbxassetid://' + assetId
                                });
                            }
                            break;
                        }
                        if (pd.error) break;
                    } catch (e) { console.log('Poll err:', e.message); }
                }
            }

            return sendJSON(res, 200, {
                success: true, assetId: null,
                message: 'Upload terkirim, sedang diproses. Cek inventory Roblox kamu.'
            });
        }

        // ---- STATIC FILES ----
        if (url === '/' || url === '') {
            return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
        }

        const filePath = path.join(PUBLIC_DIR, url);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return sendFile(res, filePath);
        }

        // Fallback to index.html
        return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));

    } catch (err) {
        console.error('FATAL ERROR:', err);
        sendJSON(res, 200, { success: false, message: 'Server error: ' + err.message });
    }
});

server.listen(PORT, () => {
    console.log('');
    console.log('=============================');
    console.log('  RBXM Converter READY');
    console.log('  http://localhost:' + PORT);
    console.log('=============================');
    console.log('');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('PORT ' + PORT + ' sudah dipakai!');
        console.error('Coba: kill process di port itu, atau ganti PORT di server.js');
    } else {
        console.error('Server error:', err);
    }
});
