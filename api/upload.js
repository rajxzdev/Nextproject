var https = require("https");
var Busboy = require("busboy");

module.exports = function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ success: false, message: "POST only" });
        return;
    }

    var fields = {};
    var fileBuffer = null;
    var fileName = "model.rbxm";
    var busboy;

    try {
        busboy = Busboy({ headers: req.headers });
    } catch (e) {
        console.log("Busboy init error:", e.message);
        res.status(400).json({
            success: false,
            message: "Upload parse error: " + e.message,
        });
        return;
    }

    busboy.on("field", function (name, val) {
        fields[name] = val;
    });

    busboy.on("file", function (name, stream, info) {
        fileName = info.filename || "model.rbxm";
        var chunks = [];
        stream.on("data", function (c) {
            chunks.push(c);
        });
        stream.on("end", function () {
            fileBuffer = Buffer.concat(chunks);
            console.log("File received:", fileName, fileBuffer.length, "bytes");
        });
    });

    busboy.on("error", function (e) {
        console.log("Busboy error:", e.message);
        res.status(400).json({
            success: false,
            message: "File upload error: " + e.message,
        });
    });

    busboy.on("finish", function () {
        console.log("Fields:", JSON.stringify(fields));
        console.log("File:", fileName, fileBuffer ? fileBuffer.length : 0);

        if (!fileBuffer || fileBuffer.length === 0) {
            res.status(400).json({ success: false, message: "File tidak ditemukan atau kosong" });
            return;
        }

        var apiKey = (fields.apiKey || "").trim();
        var assetName = (fields.assetName || "").trim();
        var assetDescription = (fields.assetDescription || "").trim();
        var creatorId = (fields.creatorId || "").trim();
        var creatorType = (fields.creatorType || "User").trim();

        if (!apiKey) { res.json({ success: false, message: "API Key diperlukan" }); return; }
        if (!assetName) { res.json({ success: false, message: "Nama asset diperlukan" }); return; }
        if (!creatorId) { res.json({ success: false, message: "Creator ID diperlukan" }); return; }

        // Build Roblox request
        var requestObj = {
            assetType: "Model",
            displayName: assetName.substring(0, 50),
            description: assetDescription.substring(0, 1000),
            creationContext: { creator: {} },
        };

        if (creatorType === "Group") {
            requestObj.creationContext.creator.groupId = creatorId;
        } else {
            requestObj.creationContext.creator.userId = creatorId;
        }

        var boundary = "RBXM" + Date.now();
        var NL = "\r\n";

        var before = Buffer.from(
            "--" + boundary + NL +
            'Content-Disposition: form-data; name="request"' + NL +
            "Content-Type: application/json" + NL + NL +
            JSON.stringify(requestObj) + NL +
            "--" + boundary + NL +
            'Content-Disposition: form-data; name="fileContent"; filename="' + fileName + '"' + NL +
            "Content-Type: application/octet-stream" + NL + NL
        );

        var after = Buffer.from(NL + "--" + boundary + "--" + NL);
        var fullBody = Buffer.concat([before, fileBuffer, after]);

        console.log("Sending to Roblox:", fullBody.length, "bytes");

        var options = {
            hostname: "apis.roblox.com",
            path: "/assets/v1/assets",
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "multipart/form-data; boundary=" + boundary,
                "Content-Length": fullBody.length,
            },
        };

        var rReq = https.request(options, function (rResp) {
            var chunks = [];
            rResp.on("data", function (c) { chunks.push(c); });
            rResp.on("end", function () {
                var rBody = Buffer.concat(chunks).toString();
                var rStatus = rResp.statusCode;
                console.log("Roblox status:", rStatus);
                console.log("Roblox body:", rBody.substring(0, 500));

                if (rStatus >= 400) {
                    var msg = "Roblox error (" + rStatus + ")";
                    if (rStatus === 401) msg = "API Key tidak valid.";
                    else if (rStatus === 403) msg = "Permission denied. Pastikan API key punya Assets Read+Write dan IP 0.0.0.0/0.";
                    else if (rStatus === 429) msg = "Rate limited. Tunggu 1 menit.";
                    else {
                        try {
                            var e = JSON.parse(rBody);
                            msg = e.message || e.error || JSON.stringify(e);
                        } catch (x) {
                            msg = rBody.substring(0, 300) || msg;
                        }
                    }
                    res.json({ success: false, message: msg });
                    return;
                }

                var data;
                try { data = JSON.parse(rBody); } catch (e) {
                    res.json({ success: false, message: "Response tidak valid dari Roblox" });
                    return;
                }

                var assetId = findId(data);
                if (assetId) {
                    res.json({
                        success: true, assetId: assetId, message: "Upload berhasil!",
                        toolboxUrl: "https://www.roblox.com/library/" + assetId,
                        studioUrl: "rbxassetid://" + assetId,
                    });
                    return;
                }

                if (data.path) {
                    doPoll(data.path, apiKey, 0, function (aid) {
                        if (aid) {
                            res.json({
                                success: true, assetId: aid, message: "Upload berhasil!",
                                toolboxUrl: "https://www.roblox.com/library/" + aid,
                                studioUrl: "rbxassetid://" + aid,
                            });
                        } else {
                            res.json({
                                success: true, assetId: null,
                                message: "Upload terkirim, masih diproses. Cek inventory Roblox kamu.",
                            });
                        }
                    });
                    return;
                }

                res.json({
                    success: true, assetId: null,
                    message: "Upload terkirim. Cek inventory Roblox.",
                });
            });
        });

        rReq.on("error", function (e) {
            console.log("Roblox error:", e.message);
            res.json({ success: false, message: "Gagal konek Roblox: " + e.message });
        });

        rReq.write(fullBody);
        rReq.end();
    });

    req.pipe(busboy);
};

function doPoll(opPath, apiKey, attempt, cb) {
    if (attempt >= 10) { cb(null); return; }
    var p = opPath;
    if (!p.startsWith("/")) p = "/assets/v1/" + p;

    setTimeout(function () {
        var r = https.request({
            hostname: "apis.roblox.com", path: p, method: "GET",
            headers: { "x-api-key": apiKey },
        }, function (resp) {
            var d = "";
            resp.on("data", function (c) { d += c; });
            resp.on("end", function () {
                try {
                    var pd = JSON.parse(d);
                    if (pd.done === true) { cb(findId(pd)); return; }
                    if (pd.error) { cb(null); return; }
                } catch (e) { }
                doPoll(opPath, apiKey, attempt + 1, cb);
            });
        });
        r.on("error", function () { doPoll(opPath, apiKey, attempt + 1, cb); });
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
