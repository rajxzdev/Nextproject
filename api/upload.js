module.exports = function(req, res) {
    res.json({ test: true, method: req.method });
};
