module.exports = function(req, res) {
    res.json({ works: true, method: req.method });
};
