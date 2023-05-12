

var express = require('express'),
    router = express.Router();

router.route('/')
    .get(function (req, res, next) {
        req.session.destroy();
        res.redirect('/login');
    });

module.exports = router;