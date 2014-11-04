// Hypermasher client JS

// Global for whether Hypermasher has been started by the user yet by any means
var started = false;

// Globals for keeping track of the active and inactive players, metadata divs
var activePlayer;
var activeMetadata = $('#example_video_1_metadata');
var inactivePlayer;
var inactiveMetadata = $('#example_video_2_metadata');

// Globals for video queue, counter, and earliest/latest timestamps of videos in the queue
var videoCounter = 0;
var videos = [];
var earliestTimestamp = 9999999999;
var latestTimestamp = 0;

// SoundCloud widget globals
var widget;
var playlistLength = 0;

// SoundCloud widget iframe element
var soundCloudWidget = '<iframe id="sc-widget" class="hypermasher-audio" width="100%" height="252" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=CUSTOMURL&amp;color=3071a9&amp;auto_play=false&amp;hide_related=true&amp;show_comments=false&amp;show_user=false&amp;show_reposts=false"></iframe>';

// Default playlist (if not specified in querystring)
var defaultPlaylist = 'https%3A//api.soundcloud.com/playlists/50248056';

function updateMap(activePlayerId) {
    // Grab the index of the active video from its player element
    var activeCounter = $("#"+activePlayerId).attr("hypermasher-video-count");

    // Empty the map div
    $(".map").empty();

    var currentVideo = videos[activeCounter];

    // If latitude is included for this video, draw a new map for it
    if ('latitude' in currentVideo) {
        var map = new Datamap({
            element: $(".map")[0],
            scope: 'world',
            fills: {
                defaultFill: '#428bca',
                markerFill: 'red',
            },
            geographyConfig: {
                highlightOnHover: false,
                popupOnHover: false
            }
        });

        bubble = {
            latitude: currentVideo.latitude,
            longitude: currentVideo.longitude,
            radius: 6,
            fillKey: 'markerFill'
        };

        map.bubbles([bubble], {
            borderWidth: 2,
            popupOnHover: false,
            highlightOnHover: false
        });
    }
}

function loadVideo(initial) {
    var player;
    var metadata;

    // If this is our first load, work with the active, visible player
    if (initial) {
        player = activePlayer;
        metadata = activeMetadata;
    } else {
        player = inactivePlayer;
        metadata = inactiveMetadata;
    }

    // Get the next video
    var newVideo = videos[videoCounter];

    // Get the player's element
    var playerDiv = $("#" + player.id());

    // Update the src attribute of the player's source element 
    // (videoPlayer.js load API wasn't working in all browsers for me)
    playerDiv.find("source").attr("src", newVideo.mp4);
    player.load();

    // Record the loaded video's index for reference in updateMap
    playerDiv.attr("hypermasher-video-count", videoCounter);

    // Set the username and Instagram link
    metadata.children(".metadata-user").text(newVideo.username);
    metadata.find("a").attr("href", newVideo.link);

    // Include the reverse-geotagged location if we have it
    var location = metadata.children(".metadata-location");
    if ('location' in newVideo) {
        location.html('<span class="glyphicon glyphicon-map-marker"></span> ' + newVideo.location);
        location.show();
    } else {
        location.hide();
    }

    // Instagram provides timestamps in seconds, not milliseconds
    var createdTime = new Date(parseInt(newVideo.timestamp + "000", 10));
    var secondsAgo = (new Date() - createdTime) / 1000;
    metadata.children(".metadata-time").text(secondsAgo.toReadableInterval());

    // Increase the videoCounter for loading the next video
    videoCounter++;

    // Un-disable the rewind button if videoCounter is greater than 2
    if (videoCounter > 2)
        $(".hypermasher-rewind").removeAttr("disabled");

    // If this is our first load, update the map and then load the hidden player
    if (initial) {
        updateMap(player.id());
        loadVideo(false);
    }
}

function getVideos(initial) {
    var requestURL;

    // If it's our first fetch, hit get-initial-videos
    if (initial)
        requestURL = "/get-initial-videos?hashtag=hyperlapse";
    else {
        // Otherwise, hit get-videos with the earliest and latest videos this user has seen
        requestURL = "/get-videos?hashtag=hyperlapse&earliest=" + earliestTimestamp + "&latest=" + latestTimestamp;

        // Fire a custom Google Analytics event if GA is present
        if (typeof ga !== 'undefined')
            ga('send', 'event', 'Videos', 'Fetch', 'Current counter', videoCounter);
    }

    // Helper function for use with .some below
    function checkNewVideo(element, index, array, mp4) {
        return element.mp4 === this.mp4;
    }

    // AJAX request
    $.getJSON(requestURL, function(data) {
        // Shuffle the order of the new videos if it's not the first batch
        if (!initial)
            shuffle(data.videos);

        // Process each video in the response
        data.videos.forEach(function(video) {
            // Make sure this video isn't already present in our queue
            if (!videos.some(checkNewVideo, video)) {
                var timestamp = parseInt(video.timestamp, 10);

                // Update the earliest and latest timestamps
                if (timestamp < earliestTimestamp)
                    earliestTimestamp = timestamp;
                else if (timestamp > latestTimestamp)
                    latestTimestamp = timestamp;

                // Add the new video to the queue
                videos.push(video);
            }

            // If it's our first fetch, wait until a few videos are in the queue
            // before we start loading the players (in case the first few videos
            // have bad MP4 URLs)
            if (initial && videos.length === 7) {
                // Add an error handler to the source elements
                $("source").on("error", function(event) {
                    // Get the player for the erroring source element
                    var playerId = $(this).closest('.video-js').attr('id');
                    var player = videojs(playerId);

                    // Investigate the specific error
                    var playerError = player.error();
                    if (playerError && playerError.code === 4) {
                        // This browser can't play mp4s :(
                        window.location = '/incompatible-browser';
                    } else if ($(this).parent().is(":visible")) {
                        // The currently playing video errored - switch players immediately
                        switchVideo();
                    } else {
                        // The hidden video errored - remove it from the queue and load again
                        videos.splice(videoCounter-1, 1);
                        videoCounter--;
                        loadVideo(false);
                    }
                });

                // Perform the initial load on both players
                loadVideo(true);
            }
        });
    });
}

function playVideo(initial) {
    // If a user is starting Hypermasher, play the active, visible player
    if (initial) {
        started = true;
        activePlayer.play();
        $(".vjs-big-play-button").remove();
        updateMap(activePlayer.id());
        return;
    }

    // Switch the players
    activePlayer.hide();
    inactivePlayer.show();

    activeMetadata.hide();
    inactiveMetadata.show();

    // Play the previously inactive, now active player
    if (started)
        inactivePlayer.play();

    // Update the variables
    var tempPlayer = activePlayer;
    activePlayer = inactivePlayer;
    inactivePlayer = tempPlayer;

    var tempMetadata = activeMetadata;
    activeMetadata = inactiveMetadata;
    inactiveMetadata = tempMetadata;

    // Update the map with the location metadata from the new video
    updateMap(activePlayer.id());

    // Fire a custom Google Analytics event if GA is present
    if (typeof ga !== 'undefined')
        ga('send', 'event', 'Videos', 'Play');
}

function switchVideo() {
    // Start playing the next video
    playVideo(false);

    // If we have five or less videos remaining in our queue, fetch more
    if (videoCounter >= (videos.length - 5))
        getVideos(false);

    // Load the next video into the next player
    loadVideo(false);
}

function prepPlayer(player) {
    // Get the widget of the player's parent element
    var width = document.getElementById(activePlayer.id()).parentElement.offsetWidth;

    // Get the height of the window
    var height = $(window).height() * 0.90; // Imprecise, but functional

    // Set the player's size to be the minimum of the width and height
    var playerSize = Math.min(width, height);
    player.width(playerSize).height(playerSize);

    // Start the music if the user clicks the video play button first
    player.on("play", function() {
        if (!started) {
            widget.play();
        }
        started = true;

        // Remove the big play button after initial play - it looks bad
        $(".vjs-big-play-button").remove();
    });

    // Switch players when a player finishes showing a video
    player.on("ended", switchVideo);

    // Remove a couple extra player controls, override the fullscreen-control handler
    $(".vjs-volume-control, .vjs-mute-control").remove();
    $(".vjs-fullscreen-control").click(toggleFullscreen);
}

// Handlers for play/pause buttons
function playAll() {
    widget.play();
    activePlayer.play();
}
function pauseAll() {
    activePlayer.pause();
    widget.pause();
}

// Handler for rewind button
function rewind(numVideos) {
    newCounter = videoCounter - numVideos - 2; // subtract an extra 2 for the videos already loaded

    // Don't let the videoCounter go negative
    if (newCounter < 0)
        newCounter = 0;

    // Re-load the active player with the video at the new videoCounter
    videoCounter = newCounter;
    loadVideo(true);
    activePlayer.play();

    // Disable the rewind buttons if videoCounter is less than 2
    if (videoCounter <= 2)
        $(".hypermasher-rewind").attr("disabled", "disabled");
}

// Handler for fullscreen button
function toggleFullscreen() {
    var fullscreen = $("#" + activePlayer.id()).hasClass("vjs-fullscreen");
    if (fullscreen) {
        activePlayer.exitFullscreen();
        inactivePlayer.exitFullscreen();
    } else {
        activePlayer.requestFullscreen();
        inactivePlayer.requestFullscreen();
    }
}

function prepSoundWidget() {
    // Determine if a custom playlist was specified
    var playlistUrl = getParameterByName('playlist');
    if (playlistUrl === '')
        playlistUrl = defaultPlaylist;
    else
        playlistUrl = encodeURIComponent(playlistUrl);

    // Prepare the SoundCloud widget iframe tag
    soundCloudWidget = soundCloudWidget.replace('CUSTOMURL', playlistUrl);

    // Add the iframe to the DOM and instantiate it
    $("#widgetHolder").html(soundCloudWidget);
    widget = SC.Widget("sc-widget");

    // Additional configuration once the widget is ready
    widget.bind(SC.Widget.Events.READY, function() {
        widget.getSounds(function(sounds) {
            playlistLength = sounds.length;

            // Resize the player to fit the window
            if (playlistLength === 1) {
                $("#sc-widget").attr("height", 180);
            } else {
                var heightDiff = $(".hypermasher-main").outerHeight() - $("#hypermasher-sidebar").outerHeight();
                var currentHeight = parseInt($("#sc-widget").attr("height"), 10);
                if ($(".metadata-location:visible").length === 0)
                    heightDiff-= $(".metadata-user").outerHeight();
                $("#sc-widget").attr("height", currentHeight + heightDiff);
            }
        });

        // Start the videos if a user's first click is the SoundCloud widget's play button
        widget.bind(SC.Widget.Events.PLAY, function() {
            if (!started)
                playVideo(true);
        });

        // Loop the playlist when it finishes playing the last track
        widget.bind(SC.Widget.Events.FINISH, function() {
            widget.getCurrentSoundIndex(function(index) {
                if (index === playlistLength - 1)
                    widget.skip(0);
            });
        });
    });
}

$(document).ready(function() {
    // Start the AJAX request to get the video set
    getVideos(true);

    // Initialize the two video players
    videojs("example_video_1", {}, function() {
        activePlayer = this;
        prepPlayer(this);
    });
    videojs("example_video_2", {}, function() {
        inactivePlayer = this;
        prepPlayer(this);

        this.hide();
        $(".hypermasher-video.center-block:hidden").removeAttr("style");
    });

    // Identify the metadata divs
    activeMetadata = $('#example_video_1_metadata');
    inactiveMetadata = $('#example_video_2_metadata');

    // Initialize and prep the SoundCloud widget
    prepSoundWidget();

    // Define click handlers to show/hide video metadata
    $("#metadata-show").click(function() {
        $(this).hide();
        $("#metadata-holder").show();
        inactiveMetadata.hide();
        $("#metadata-hide").show();
        return false;
    });
    $("#metadata-hide").click(function() {
        $(this).hide();
        $("#metadata-holder").hide();
        $("#metadata-show").show();
        return false;
    });

    // Set the correct height for D3 to draw in
    var mapWrapper = $(".map");
    mapWrapper.height(mapWrapper.width() / 2.15);

    // Define handler for custom SoundCloud URL modal
    $("#soundcloudUrl").on("input", function() {
        var playlist = encodeURIComponent($("#soundcloudUrl").val());
        var customUrl = "http://www.hypermasher.com/hyperlapse?playlist=" + playlist;

        $("#hypermasherLink").val(customUrl);
        $("#hypermasherLinkShortcut").attr("href", customUrl);
    });
});
