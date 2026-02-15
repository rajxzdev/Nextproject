module.exports = function (req, res) {
    res.status(200).json({
        ok: true,
        message: "Server is alive!",
        time: new Date().toISOString()
    });
};
