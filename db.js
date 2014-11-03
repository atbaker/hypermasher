// Redis setup

var redis = require("redis");
var dockerUrl = process.env.REDIS_PORT;
var client;

// Connect to a Docker-provided redis instance if it's available
if (dockerUrl !== undefined) {
    var localUrl = require("url").parse(dockerUrl);
    client = redis.createClient(localUrl.port, localUrl.hostname);
} else
    client = redis.createClient();

module.exports = client;
