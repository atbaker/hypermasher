var express = require('express');
var router = express.Router();

var db = require('../db');
var utils = require('../utils');

router.get('/', function(req, res) {
    res.redirect(301, '/hyperlapse');
});

router.get('/hyperlapse', function(req, res) {
    // Cache the rendered homepage template to speed things up
    db.get('renderedHomepage', function(err, reply) {
        // Only use the cache result if we're in prod; always render each req in dev
        if (reply && req.app.settings.env === 'production') {
            res.send(reply);
        }
        else {
            res.render('index', {title: 'Hypermasher - a stream of the latest Hyperlapse videos set to chill music'}, function(err, html) {
                res.send(html);
                db.set('renderedHomepage', html, 'EX', 1800);
            });
        }
    });
});

router.get('/get-initial-videos', function(req, res) {
    var hashtag = req.query.hashtag;

    utils.sendInitialVideos(hashtag, function(videos) {
        res.send({'videos': videos});
    });
});

router.get('/get-videos', function(req, res) {
    var hashtag = req.query.hashtag;
    var earliest = req.query.earliest;
    var latest = req.query.latest;

    utils.sendVideos(hashtag, earliest, latest, function(videos) {
        res.send({'videos': videos});
    });
});

router.get('/new-media', function(req, res) {
    var challenge = req.query['hub.challenge'];
    res.send(challenge);
});

router.post('/new-media', function(req, res) {
    utils.getVideos(function(error, videos) {
        if (error)
            console.error(error);
    });
    res.end();
});

router.get('/about', function(req, res) {
    res.render('about', {title: 'Hypermasher - About'});
});

router.get('/ios', function(req, res) {
    res.render('ios', {title: 'Hypermasher - Incompatible device'});
});

router.get('/incompatible-browser', function(req, res) {
    res.render('browser', {title: 'Hypermasher - Incompatible browser'});
});

module.exports = router;
