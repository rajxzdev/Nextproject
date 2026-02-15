var https = require('https');

module.exports = function(req, res) {
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.json({ success: false, message: 'POST only' }); return; }

    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() {
        var rawBody = Buffer.concat(chunks);

        var contentType = req.headers['content-type'] || '';
        var boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) {
            res.json({ success: false, message: 'No boundary found' });
            return;
        }

        var boundary = boundaryMatch[1].trim();
        var parsed = parseMultipart(rawBody, boundary);

        if (!parsed.fileData || parsed.fileData.length === 0) {
            res.json({ success: false, message: 'File tidak ditemukan' });
            return;
        }

        var apiKey = (parsed.fields.apiKey || '').trim();
        var assetName = (parsed.fields.assetName || '').trim();
        var assetDescription = (parsed.fields.assetDescription || '').trim();
        var creatorId = (parsed.fields.creatorId || '').trim();
        var creatorType = (parsed.fields.creatorType || 'User').trim();

        if (!apiKey) { res.json({ success: false, message: 'API Key diperlukan' }); return; }
        if (!assetName) { res.json({ success: false, message: 'Nama asset diperlukan' }); return; }
        if (!creatorId) { res.json({ success: false, message: 'Creator ID diperlukan' }); return; }

        var requestObj = {
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

        var rbxBoundary = 'RBX' + Date.now();
        var NL = '\r\n';

        var before = Buffer.from(
            '--' + rbxBoundary + NL +
            'Content-Disposition: form-data; name="request"' + NL +
            'Content-Type: application/json' + NL + NL +
            JSON.stringify(requestObj) + NL +
            '--' + rbxBoundary + NL +
            'Content-Disposition: form-data; name="fileContent"; filename="' + parsed.fileName + '"' + NL +
            'Content-Type: application/octet-stream' + NL + NL
        );
        var after = Buffer.from(NL + '--' + rbxBoundary + '--' + NL);
        var fullBody = Buffer.concat([before, parsed.fileData, after]);

        var rReq = https.request({
            hostname: 'apis.roblox.com',
            path: '/assets/v1/assets',
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'multipart/form-data; boundary=' + rbxBoundary,
                'Content-Length': fullBody.length
            }
        }, function(rResp) {
            var rChunks = [];
            rResp.on('data', function(c) { rChunks.push(c); });
            rResp.on('end', function() {
                var rBody = Buffer.concat(rChunks).toString();
                var rStatus = rResp.statusCode;

                if (rStatus >= 400) {
                    var msg = 'Roblox error (' + rStatus + ')';
                    if (rStatus === 401) msg = 'API Key tidak valid.';
                    else if (rStatus === 403) msg = 'Permission denied. Cek Assets Read+Write dan IP 0.0.0.0/0.';
                    else if (rStatus === 429) msg = 'Rate limited. Tunggu 1 menit.';
                    else { try { var e = JSON.parse(rBody); msg = e.message || e.error || JSON.stringify(e); } catch(x) { msg = rBody.substring(0, 300); } }
                    res.json({ success: false, message: msg });
                    return;
                }

                var data;
                try { data = JSON.parse(rBody); } catch(e) { res.json({ success: false, message: 'Response invalid' }); return; }

                var assetId = findId(data);
                if (assetId) {
                    res.json({ success: true, assetId: assetId, message: 'Upload berhasil!', toolboxUrl: 'https://www.roblox.com/library/' + assetId, studioUrl: 'rbxassetid://' + assetId });
                    return;
                }

                if (data.path) {
                    doPoll(data.path, apiKey, 0, function(aid) {
                        if (aid) {
                            res.json({ success: true, assetId: aid, message: 'Upload berhasil!', toolboxUrl: 'https://www.roblox.com/library/' + aid, studioUrl: 'rbxassetid://' + aid });
                        } else {
                            res.json({ success: true, assetId: null, message: 'Upload terkirim, masih diproses. Cek inventory.' });
                        }
                    });
                    return;
                }

                res.json({ success: true, assetId: null, message: 'Upload terkirim. Cek inventory Roblox.' });
            });
        });

        rReq.on('error', function(e) {
            res.json({ success: false, message: 'Gagal konek Roblox: ' + e.message });
        });

        rReq.write(fullBody);
        rReq.end();
    });

    req.on('error', function(e) {
        res.json({ success: false, message: 'Request error: ' + e.message });
    });
};

function parseMultipart(body, boundary) {
    var result = { fields: {}, fileData: null, fileName: 'model.rbxm' };
    var boundaryBuf = Buffer.from('--' + boundary);
    var parts = [];
    var start = 0;

    while (true) {
        var idx = bufIndexOf(body, boundaryBuf, start);
        if (idx === -1) break;
        if (start > 0) {
            var partData = body.slice(start, idx);
            if (partData.length > 4) parts.push(partData);
        }
        start = idx + boundaryBuf.length;
        if (body[start] === 0x2D && body[start + 1] === 0x2D) break;
        if (body[start] === 0x0D && body[start + 1] === 0x0A) start += 2;
    }

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var headerEnd = bufIndexOf(part, Buffer.from('\r\n\r\n'), 0);
        if (headerEnd === -1) continue;
        var headerStr = part.slice(0, headerEnd).toString('utf-8');
        var bodyData = part.slice(headerEnd + 4);
        if (bodyData.length >= 2 && bodyData[bodyData.length - 2] === 0x0D && bodyData[bodyData.length - 1] === 0x0A) {
            bodyData = bodyData.slice(0, bodyData.length - 2);
        }
        var nameMatch = headerStr.match(/name="([^"]+)"/);
        if (!nameMatch) continue;
        var filenameMatch = headerStr.match(/filename="([^"]+)"/);
        if (filenameMatch) {
            result.fileName = filenameMatch[1];
            result.fileData = bodyData;
        } else {
            result.fields[nameMatch[1]] = bodyData.toString('utf-8');
        }
    }
    return result;
}

function bufIndexOf(buf, search, offset) {
    for (var i = offset; i <= buf.length - search.length; i++) {
        var found = true;
        for (var j = 0; j < search.length; j++) {
            if (buf[i + j] !== search[j]) { found = false; break; }
        }
        if (found) return i;
    }
    return -1;
}

function doPoll(opPath, apiKey, attempt, cb) {
    if (attempt >= 10) { cb(null); return; }
    var p = opPath;
    if (!p.startsWith('/')) p = '/assets/v1/' + p;
    setTimeout(function() {
        var r = https.request({ hostname: 'apis.roblox.com', path: p, method: 'GET', headers: { 'x-api-key': apiKey } }, function(resp) {
            var d = '';
            resp.on('data', function(c) { d += c; });
            resp.on('end', function() {
                try { var pd = JSON.parse(d); if (pd.done === true) { cb(findId(pd)); return; } if (pd.error) { cb(null); return; } } catch(e) {}
                doPoll(opPath, apiKey, attempt + 1, cb);
            });
        });
        r.on('error', function() { doPoll(opPath, apiKey, attempt + 1, cb); });
        r.end();
    }, 3000);
}

function findId(obj) {
    if (!obj) return null;
    if (obj.assetId) return String(obj.assetId);
    if (obj.path) { var m = obj.path.match(/assets\/(\d+)/); if (m) return m[1]; }
    if (obj.response) return findId(obj.response);
    return null;
}
