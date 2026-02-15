var https = require("https");

module.exports = function (req, res) {
    // Handle CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ valid: false, message: "Method not allowed" });
        return;
    }

    // Vercel sudah parse body otomatis kalau Content-Type: application/json
    var key = "";

    try {
        if (req.body && req.body.apiKey) {
            key = req.body.apiKey.trim();
        }
    } catch (e) {
        res.status(400).json({ valid: false, message: "Body parse error" });
        return;
    }

    if (!key) {
        res.status(200).json({ valid: false, message: "API Key kosong" });
        return;
    }

    if (key.length < 10) {
        res.status(200).json({ valid: false, message: "API Key terlalu pendek" });
        return;
    }

    // Test key dengan Roblox API
    var options = {
        hostname: "apis.roblox.com",
        path: "/assets/v1/assets?pageSize=1",
        method: "GET",
        headers: {
            "x-api-key": key,
        },
    };

    var robloxReq = https.request(options, function (robloxRes) {
        var data = "";
        robloxRes.on("data", function (chunk) {
            data += chunk;
        });
        robloxRes.on("end", function () {
            var status = robloxRes.statusCode;

            console.log("Roblox validate response:", status, data.substring(0, 200));

            if (status === 401) {
                res.status(200).json({
                    valid: false,
                    message: "API Key tidak valid (401 Unauthorized)",
                });
                return;
            }

            if (status === 403) {
                res.status(200).json({
                    valid: false,
                    message: "API Key tidak punya permission. Pastikan sudah tambah Assets API dengan Read+Write.",
                });
                return;
            }

            if (status === 200) {
                res.status(200).json({
                    valid: true,
                    message: "API Key valid! Permission Assets OK.",
                    debug: {
                        robloxStatus: status,
                        response: data.substring(0, 100),
                    },
                });
                return;
            }

            // Status lain (mungkin 400, 404, dll)
            // Key mungkin valid tapi endpoint butuh parameter lain
            res.status(200).json({
                valid: true,
                message: "API Key diterima (status: " + status + ")",
                debug: {
                    robloxStatus: status,
                    response: data.substring(0, 200),
                },
            });
        });
    });

    robloxReq.on("error", function (err) {
        console.log("Roblox request error:", err.message);
        res.status(200).json({
            valid: false,
            message: "Gagal konek ke Roblox: " + err.message,
        });
    });

    robloxReq.setTimeout(10000, function () {
        robloxReq.destroy();
        res.status(200).json({
            valid: false,
            message: "Timeout konek ke Roblox. Coba lagi.",
        });
    });

    robloxReq.end();
};
