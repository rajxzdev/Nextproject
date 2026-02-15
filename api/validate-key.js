var https = require('https');

module.exports = function(req, res) {
    if (req.method !== 'POST') {
        res.json({ valid: false, message: 'POST only' });
        return;
    }

    var body = '';
    req.on('data', function(c) { body += c; });
    req.on('end', function() {
        var parsed = {};
        try { parsed = JSON.parse(body); } catch(e) {}

        var key = (parsed.apiKey || '').trim();
        if (!key) {
            res.json({ valid: false, message: 'API Key kosong' });
            return;
        }

        var opt = {
            hostname: 'apis.roblox.com',
            path: '/assets/v1/assets?pageSize=1',
            method: 'GET',
            headers: { 'x-api-key': key }
        };

        var r = https.request(opt, function(resp) {
            var d = '';
            resp.on('data', function(c) { d += c; });
            resp.on('end', function() {
                if (resp.statusCode === 401 || resp.statusCode === 403) {
                    res.json({ valid: false, message: 'API Key invalid atau tidak punya permission Assets' });
                } else {
                    res.json({ valid: true, message: 'API Key valid!' });
                }
            });
        });

        r.on('error', function() {
            res.json({ valid: true, message: 'Key diterima' });
        });

        r.end();
    });
};
