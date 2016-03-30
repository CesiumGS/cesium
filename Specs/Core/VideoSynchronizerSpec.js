/*global defineSuite*/
defineSuite([
        'Core/VideoSynchronizer',
        'Core/Clock',
        'Core/FeatureDetection',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/Math',
        'Specs/pollToPromise'
    ], function(
        VideoSynchronizer,
        Clock,
        FeatureDetection,
        Iso8601,
        JulianDate,
        CesiumMath,
        pollToPromise) {
    'use strict';

    //Video textures do not work on Internet Explorer
    if (FeatureDetection.isInternetExplorer()) {
        return;
    }

    function loadVideo() {
        var element = document.createElement('video');
        var source = document.createElement('source');
        source.setAttribute('src', 'http://cesiumjs.org/videos/Sandcastle/big-buck-bunny_trailer.webm');
        source.setAttribute('type', 'video/webm');
        element.appendChild(source);

        source = document.createElement('source');
        source.setAttribute('src', 'http://cesiumjs.org/videos/Sandcastle/big-buck-bunny_trailer.mp4');
        source.setAttribute('type', 'video/mp4');
        element.appendChild(source);

        source = document.createElement('source');
        source.setAttribute('src', 'http://cesiumjs.org/videos/Sandcastle/big-buck-bunny_trailer.mov');
        source.setAttribute('type', 'video/quicktime');
        element.appendChild(source);

        return element;
    }

    it('Can default construct', function() {
        var videoSynchronizer = new VideoSynchronizer();

        expect(videoSynchronizer.clock).not.toBeDefined();
        expect(videoSynchronizer.element).not.toBeDefined();
        expect(videoSynchronizer.epoch).toBe(Iso8601.MINIMUM_VALUE);
        expect(videoSynchronizer.tolerance).toBe(1.0);
        expect(videoSynchronizer.isDestroyed()).toBe(false);
        expect(videoSynchronizer.destroy()).not.toBeDefined();
        expect(videoSynchronizer.isDestroyed()).toBe(true);
    });

    it('Can construct with options', function() {
        var clock = new Clock();
        var element = document.createElement('video');
        var epoch = new JulianDate();
        var tolerance = 0.15;

        var videoSynchronizer = new VideoSynchronizer({
            clock : clock,
            element : element,
            epoch : epoch,
            tolerance: tolerance
        });

        expect(videoSynchronizer.clock).toBe(clock);
        expect(videoSynchronizer.element).toBe(element);
        expect(videoSynchronizer.epoch).toBe(epoch);
        expect(videoSynchronizer.tolerance).toBe(tolerance);
        expect(videoSynchronizer.isDestroyed()).toBe(false);
        expect(videoSynchronizer.destroy()).not.toBeDefined();
        expect(videoSynchronizer.isDestroyed()).toBe(true);
    });

    it('Syncs time when looping', function() {
        var epoch = JulianDate.fromIso8601('2015-11-01T00:00:00Z');
        var clock = new Clock();
        clock.shouldAnimate = false;
        clock.currentTime = epoch.clone();

        var element = loadVideo();
        element.loop = true;

        var videoSynchronizer = new VideoSynchronizer({
            clock : clock,
            element : element,
            epoch : epoch
        });

        return pollToPromise(function() {
            clock.tick();
            return element.currentTime === 0;
        }).then(function() {
            clock.currentTime = JulianDate.addSeconds(epoch, 10, clock.currentTime);
            return pollToPromise(function() {
                clock.tick();
                return element.currentTime === 10;
            });
        }).then(function() {
            clock.currentTime = JulianDate.addSeconds(epoch, 60, clock.currentTime);
            return pollToPromise(function() {
                clock.tick();
                return CesiumMath.equalsEpsilon(element.currentTime, 60 - element.duration, CesiumMath.EPSILON3);
            });
        }).then(function() {
            clock.currentTime = JulianDate.addSeconds(epoch, -1, clock.currentTime);
            return pollToPromise(function() {
                clock.tick();
                return CesiumMath.equalsEpsilon(element.currentTime, element.duration - 1, CesiumMath.EPSILON1);
            });
        }).then(function() {
            videoSynchronizer.destroy();
        });
    });

    it('Syncs time when not looping', function() {
        var epoch = JulianDate.fromIso8601('2015-11-01T00:00:00Z');
        var clock = new Clock();
        clock.shouldAnimate = false;
        clock.currentTime = epoch.clone();

        var element = loadVideo();

        var videoSynchronizer = new VideoSynchronizer({
            clock : clock,
            element : element,
            epoch : epoch
        });

        return pollToPromise(function() {
            clock.tick();
            return element.currentTime === 0;
        }).then(function() {
            clock.currentTime = JulianDate.addSeconds(epoch, 10, clock.currentTime);
            return pollToPromise(function() {
                clock.tick();
                return element.currentTime === 10;
            });
        }).then(function() {
            clock.currentTime = JulianDate.addSeconds(epoch, 60, clock.currentTime);
            return pollToPromise(function() {
                clock.tick();
                return CesiumMath.equalsEpsilon(element.currentTime, element.duration, CesiumMath.EPSILON3);
            });
        }).then(function() {
            clock.currentTime = JulianDate.addSeconds(epoch, -1, clock.currentTime);
            return pollToPromise(function() {
                clock.tick();
                return element.currentTime === 0;
            });
        }).then(function() {
            videoSynchronizer.destroy();
        });
    });

    it('Plays/pauses video based on clock', function() {
        var epoch = JulianDate.fromIso8601('2015-11-01T00:00:00Z');
        var clock = new Clock();

        var element = loadVideo();

        var videoSynchronizer = new VideoSynchronizer({
            clock : clock,
            element : element,
            epoch : epoch
        });

        return pollToPromise(function() {
            clock.shouldAnimate = false;
            clock.tick();
            return element.paused === true;
        }).then(function() {
            clock.shouldAnimate = true;
            clock.tick();
            return element.paused === false;
        }).then(function() {
            clock.shouldAnimate = false;
            clock.tick();
            return element.paused === true;
        }).then(function() {
            videoSynchronizer.destroy();
        });
    });
});
