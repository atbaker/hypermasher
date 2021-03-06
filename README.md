Hypermasher
===========

<p align="center">
    <img src="hypermasher-preview.gif" alt="Hypermasher preview" title="Hypermasher" style="max-width:100%;">
</p>

**NOTE:** I no longer maintain this repository. I also believe the Instagram API it used has been deprecated. Further, I
no longer own hypermasher.com and I am not responsible for the content there today.

Hypermasher is a [Node.js](http://nodejs.org/) application which shows users a stream of the latest [Hyperlapse](http://blog.instagram.com/post/95829278497/hyperlapse-from-instagram) videos set to chill music.

It was created by [Andrew T. Baker](http://andrewtorkbaker.com/) as part of his [funemployment](http://andrewtorkbaker.com/funemployment). It is open source under the [Apache 2.0 license](http://www.apache.org/licenses/LICENSE-2.0.html).

## Reception

Hypermasher inspired [Hyperlax](http://hyperlax.tv/), a much better implementation of this concept created by [Taylor Crane](https://twitter.com/taykcrane/). 

Both apps were featured in the very first episode of [Rate My App](http://ratemyapp.com).  You can [watch the video here](http://ratemyapp.com/video/6K_HgG_Xmf8/Walkthrough-Two-new-apps-play-realtime-hyperlapse-videos-to-music).

Getting started
---------------

Hypermasher is a fairly lean app and takes minutes to set up. It uses [redis](http://redis.io/) to store metadata about the videos it serves, but has no other components outside of Node.js.

To run Hypermasher, you need to get API keys from Instagram. Once you have those, you can run Hypermasher natively through npm or through Docker using docker-compose.

### Instagram API keys ###

To get your Instagram API keys, visit their developer site: http://instagram.com/developer. Follow the prompts for "Register your Application".

You'll know you're done when you see values for `CLIENT_ID` and `CLIENT_SECRET`.

### Running locally with Docker ###

[Docker](https://docker.com/) is an easy way to run Hypermasher locally, but if you have Node.js and redis-server installed on your machine, you might prefer running Hypermasher through `npm` as described in the next section.

In addition to Docker, you will need [docker-compose](https://docs.docker.com/compose/). Installation instructions here: https://docs.docker.com/compose/install/

To run Hypermasher locally using Docker:

1. Make sure your Docker daemon is running and connected to your client. You can test this by making sure `docker ps` returns a valid result
1. `cd` into the Hypermasher root directory
1. Set the `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` environment variables in a new file called `.env` in this directory
1. Run `docker-compose up -d` (`-d` to run our containers in detached mode)
1. Connect to Hypermasher in your browser at port 8000
    - If you're running Docker natively go to http://localhost:8000
    - If you're using [boot2docker](https://github.com/boot2docker/boot2docker) go to port 8000 on the IP address provided by the `boot2docker ip` command. Ex: http://192.168.59.103:8000

You're now running Hypermasher locally, but we haven't fetched any videos from Instagram yet. To do that, we need to run one additional command:

```bash
$ docker-compose run node bin/getVideos
```

You should see a result like `33 videos primed`. Now refresh your browser - you should see the first video loaded and ready to play. Hit any play button on the screen to start Hypermasher.

### Running locally with npm ###

If you have Node.js and redis-server installed locally, then you can run Hypermasher without Docker.

To run Hypermasher locally through npm:

1. Start the redis server with `redis-server`
1. `cd` into the Hypermasher root directory
1. Install the Node.js dependencies with `npm install`
1. Start Hypermasher with `npm start`
1. Go to http://localhost:3000 to see Hypermasher in your browser

You're now running Hypermasher locally, but we haven't fetched any videos from Instagram yet. To do that, we need to run one additional command:

1. Set the `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` environment variables in your terminal session. I like using [autoenv](https://github.com/kennethreitz/autoenv) to make this easy.
1. Run the command `bin/getVideos`

You should see a result like `33 videos primed`. Now refresh your browser - you should see the first video loaded and ready to play. Hit any play button on the screen to start Hypermasher.

### Running in production ###

When running in production (`export NODE_ENV=production`), Hypermasher caches the rendered template for the /hyperlapse route to speed up response time.

After a deployment, you can clear that template cache by running the executable found at `bin/clearViews`.

Testing
-------

Hypermasher includes a couple end-to-end tests powered by [Protractor](http://angular.github.io/protractor/#/). Hypermasher isn't an Angular app, but I wanted to learn Protractor a little better so I used it anyway.

### Running the tests ###

You will need to install Protrator and a webdriver. For most people, all you need is:

```bash
$ npm install -g protractor
$ webdriver-manager update
```

Before you can run the tests, you need to start the Hypermasher server and the Selenium server:

```bash
$ fig up -d
$ webdriver-manager start
```

Then, run the tests with:

```bash
$ protractor tests/conf.js
```
