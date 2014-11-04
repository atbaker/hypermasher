var request = require('request');

var db = require('./db');
var crg = require('country-reverse-geocoding').country_reverse_geocoding();

var clientId = process.env.INSTAGRAM_CLIENT_ID;
var clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

// Utility function for clearing the database
function clearRedis(callback) {
    db.flushdb(function(err, reply) {
        callback();
    });
}
exports.clearRedis = clearRedis;

// Utility function for clearing the view cache
function clearViews(callback) {
    db.del("renderedHomepage", function(err, reply){
        callback();
    });
}
exports.clearViews = clearViews;

// Main function for fetching videos from Instagram's recent media endpoint
function getVideos(callback) {
    // Make a request to the recent media endpoint
    request({
        method: 'GET',
        uri: 'https://api.instagram.com/v1/tags/hyperlapse/media/recent',
        qs: {
            client_id: clientId,
            count: 50
        }
    }, function(error, response, body) {
        // Make sure the response is valid
        if (!error && response.statusCode == 200) {
            var data;

            // Sometimes Instagram returns invalid JSON for some reason
            try {
                data = JSON.parse(body);
            } catch (e) {
                callback(e, null);
                return;
            }

            // Process each entry in the response
            var videoCounter = 0;
            data.data.forEach(function(media) {
                // We only care if it's a video
                if (media.type === 'video') {
                    // Grab the fields that every video has
                    video = {
                        username: media.user.username,
                        link: media.link,
                        mp4: media.videos.standard_resolution.url,
                        timestamp: media.created_time
                    };

                    // If the video has a location, do some additional processing
                    if (media.location !== null) {
                        video.latitude = media.location.latitude;
                        video.longitude = media.location.longitude;

                        // Use a reverse geocoding package to get the country of each video
                        var reverseGeocode;
                        var country = crg.get_country(media.location.latitude, media.location.longitude);
                        if (country !== null) {
                            if (country.name === 'United States of America')
                                reverseGeocode = 'USA';
                            else
                                reverseGeocode = country.name;
                        }

                        // If the video's location had a name, include it with the country in parentheses
                        if (media.location.name !== undefined)
                            video.location = media.location.name + ' (' + reverseGeocode + ')';
                        else if (reverseGeocode !== undefined)
                            video.location = reverseGeocode;
                    }

                    // Add the video's details to a hash keyed on its id
                    db.hmset(media.id, video);

                    // Add the video's id to a sorted set using its timestamp and the hyperlapse hashtag
                    db.zadd("hyperlapse", media.created_time, media.id);
                    videoCounter++;
                }
            });
            callback(null, videoCounter);
        }
    });
}
exports.getVideos = getVideos;

// Utility function to remove all Instagram API subscriptions
function deleteSubscriptions(callback) {
    request({
        method: 'DELETE',
        uri: 'https://api.instagram.com/v1/subscriptions/',
        qs: {
            client_id: clientId,
            client_secret: clientSecret,
            object: 'all',
        }
    }, function(error, response, body) {
        if (error)
            callback(error);
        callback(null);
    });
}
exports.deleteSubscriptions = deleteSubscriptions;

// Utility function to set up an Instagram API subscription for the hyperlapse hashtag
function setUpSubscriptions(callback) {
    // Delete any existing subscriptions first
    deleteSubscriptions(function(error) {
        if (error) {
            console.log(error);
            return;
        }

        request({
            method: 'POST',
            uri: 'https://api.instagram.com/v1/subscriptions/',
            form: {
                client_id: clientId,
                client_secret: clientSecret,
                object: 'tag',
                aspect: 'media',
                object_id: 'hyperlapse',
                verify_token: 'hypermasher-token',
                callback_url: 'http://www.hypermasher.com/new-media'
            }
        }, function(error, response, body) {
            if (error) {
                console.log(error);
                return;
            }
            callback();
        });
    });
}
exports.setUpSubscriptions = setUpSubscriptions;

// Helper function to retrieve all hash fields for a given video
function getMetadata(ids, callback) {
    var videos = [];

    ids.forEach(function(video) {
        db.hgetall(video, function(err, reply) {
            videos.push(reply);
            if (videos.length === ids.length)
                callback(videos);
        });
    });
}

// Sends the 50 most recent videos to a client. Used when a user first loads loading hypermasher.com
function sendInitialVideos(hashtag, callback) {
    var videos = [];
    db.zrange(hashtag, -50, -1, function(err, replies) {
        if (replies.length >= 1) {
            getMetadata(replies, function(videos) {
                callback(videos);
            });
        } else {
            callback(videos);
        }
    });
}
exports.sendInitialVideos = sendInitialVideos;

// Sends 25 more videos to a client which has already viewed the first 50 videos
function sendVideos(hashtag, earliest, latest, callback) {
    var ids = [];

    // Get the next 25 videos that were posted after the most recent video seen in the client
    db.zrangebyscore(hashtag, latest, "+inf", "LIMIT", 0, 25, function(err, newIds) {
        if (newIds.length < 25) {
            // There aren't enough new videos - include some older videos to pad things out
            db.zrevrangebyscore(hashtag, earliest, "-inf", "LIMIT", 0, 25-newIds.length, function(err, oldIds) {
                ids = newIds.concat(oldIds);
                getMetadata(ids, function(videos) {
                    callback(videos);
                });
            });
        } else {
            // There were enough videos - grab their details
            getMetadata(newIds, function(videos) {
                callback(videos);
            });
        }
    });
}
exports.sendVideos = sendVideos;
