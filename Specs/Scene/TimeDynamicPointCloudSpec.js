defineSuite([
        'Scene/TimeDynamicPointCloud',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Clock',
        'Core/ClockStep',
        'Core/combine',
        'Core/defaultValue',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Core/HeadingPitchRoll',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix4',
        'Core/Resource',
        'Core/TimeIntervalCollection',
        'Core/Transforms',
        'Scene/Cesium3DTileStyle',
        'Scene/ClippingPlane',
        'Scene/ClippingPlaneCollection',
        'Scene/DracoLoader',
        'Scene/PointCloudEyeDomeLighting',
        'Scene/ShadowMode',
        'Specs/createCanvas',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        TimeDynamicPointCloud,
        BoundingSphere,
        Cartesian3,
        Clock,
        ClockStep,
        combine,
        defaultValue,
        defined,
        HeadingPitchRange,
        HeadingPitchRoll,
        JulianDate,
        CesiumMath,
        Matrix4,
        Resource,
        TimeIntervalCollection,
        Transforms,
        Cesium3DTileStyle,
        ClippingPlane,
        ClippingPlaneCollection,
        DracoLoader,
        PointCloudEyeDomeLighting,
        ShadowMode,
        createCanvas,
        createScene,
        pollToPromise,
        when) {
    'use strict';

    var scene;

    var center = new Cartesian3(1215012.8828876738, -4736313.051199594, 4081605.22126042);

    var clock = new Clock({
        clockStep : ClockStep.TICK_DEPENDENT,
        shouldAnimate : true
    });

    var dates = [
        JulianDate.fromIso8601('2018-07-19T15:18:00Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:00.5Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:01Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:01.5Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:02Z'),
        JulianDate.fromIso8601('2018-07-19T15:18:02.5Z')
    ];

    var transforms = [
        Matrix4.fromColumnMajorArray([0.968635634376879,0.24848542777253735,0,0,-0.15986460794399626,0.6231776137472074,0.7655670897127491,0,0.190232265775849,-0.7415555636019701,0.6433560687121489,0,1215012.8828876738,-4736313.051199594,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.968634888916237,0.24848833367832227,0,0,-0.1598664774761181,0.6231771341505793,0.7655670897127493,0,0.19023449044168372,-0.7415549929018358,0.6433560687121489,0,1215027.0918213597,-4736309.406139632,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.9686341434468771,0.24849123958187078,0,0,-0.1598683470068011,0.6231766545483426,0.7655670897127493,0,0.19023671510580634,-0.7415544221950274,0.6433560687121489,0,1215041.3007441103,-4736305.761037043,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.9686333979687994,0.24849414548318288,0,0,-0.15987021653604533,0.6231761749404972,0.7655670897127491,0,0.19023893976821685,-0.7415538514815451,0.6433560687121489,0,1215055.5096559257,-4736302.115891827,4081605.22126042,1]),
        Matrix4.fromColumnMajorArray([0.9686326524820043,0.2484970513822586,0,0,-0.15987208606385075,0.6231756953270434,0.7655670897127492,0,0.19024116442891523,-0.7415532807613887,0.6433560687121489,0,1215069.7185568055,-4736298.470703985,4081605.22126042,1])
    ];

    function createIntervals(useTransforms, useDraco) {
        var folderName;
        if (useTransforms) {
            folderName = 'Data/Cesium3DTiles/PointCloud/PointCloudTimeDynamicWithTransform/';
        } else if (useDraco) {
            folderName = 'Data/Cesium3DTiles/PointCloud/PointCloudTimeDynamicDraco/';
        } else {
            folderName = 'Data/Cesium3DTiles/PointCloud/PointCloudTimeDynamic/';
        }

        var uris = [];
        for (var i = 0; i < 5; ++i) {
            uris.push(folderName + i + '.pnts');
        }

        function dataCallback(interval, index) {
            return {
                uri : uris[index],
                transform : useTransforms ? transforms[index] : undefined
            };
        }

        return TimeIntervalCollection.fromJulianDateArray({
            julianDates : dates,
            dataCallback : dataCallback
        });
    }

    function createTimeDynamicPointCloud(options) {
        options = defaultValue(options, {});
        var useTransforms = defaultValue(options.useTransforms, false);
        var useDraco = defaultValue(options.useDraco, false);
        options.intervals = createIntervals(useTransforms, useDraco);
        options.clock = clock;
        if (!defined(options.style)) {
            options.style = new Cesium3DTileStyle({
                color : 'color("red")',
                pointSize : 10
            });
        }
        return scene.primitives.add(new TimeDynamicPointCloud(options));
    }

    function zoomTo(center) {
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
    }

    function loadFrame(pointCloud, index) {
        index = defaultValue(index, 0);
        goToFrame(index);
        return pollToPromise(function() {
            scene.renderForSpecs();
            var frame = pointCloud._frames[index];
            var ready = defined(frame) && frame.ready;
            if (ready) {
                scene.renderForSpecs();
            }
            return ready;
        });
    }

    function getLoadFrameFunction(pointCloud, index) {
        return function() {
            return loadFrame(pointCloud, index);
        };
    }

    function loadFrames(pointCloud, indexes) {
        var length = indexes.length;
        var promise = getLoadFrameFunction(pointCloud, indexes[0])();
        for (var i = 1; i < length; ++i) {
            promise = promise.then(getLoadFrameFunction(pointCloud, indexes[i]));
        }
        return promise.then(function() {
            goToFrame(indexes[0]);
        });
    }

    function loadAllFrames(pointCloud) {
        return loadFrames(pointCloud, [0, 1, 2, 3, 4]);
    }

    function goToFrame(index) {
        clock.currentTime = dates[index];
        clock.multiplier = 0.0;
    }

    function initializeScene() {
        scene.morphTo3D(0.0);
        zoomTo(center);
        goToFrame(0);
    }

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        initializeScene();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws if options.clock is undefined', function() {
        var intervals = createIntervals();
        expect(function(){
            return new TimeDynamicPointCloud({
                intervals : intervals
            });
        }).toThrowDeveloperError();
    });

    it('throws if options.intervals is undefined', function() {
        expect(function(){
            return new TimeDynamicPointCloud({
                clock : clock
            });
        }).toThrowDeveloperError();
    });

    it('renders in 3D', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            scene.morphTo3D(0.0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);
            scene.camera.moveRight(10.0);
            expect(scene).toRender([0, 0, 0, 255]);
        });
    });

    it('renders in 2D', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            scene.morphTo2D(0.0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);
            scene.camera.moveRight(10.0);
            expect(scene).toRender([0, 0, 0, 255]);
        });
    });

    it('renders in CV', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            scene.morphToColumbusView(0.0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);
            scene.camera.moveRight(10.0);
            expect(scene).toRender([0, 0, 0, 255]);
        });
    });

    it('gets bounding sphere of the rendered frame', function() {
        var pointCloud = createTimeDynamicPointCloud({
            useTransforms : true
        });
        expect(pointCloud.boundingSphere).toBeUndefined(); // Undefined until a frame is rendered
        return loadAllFrames(pointCloud).then(function() {
            var boundingSphereFrame0 = pointCloud.boundingSphere;
            expect(boundingSphereFrame0).toBeDefined();
            goToFrame(1);
            scene.renderForSpecs();
            var boundingSphereFrame1 = pointCloud.boundingSphere;
            expect(boundingSphereFrame1).toBeDefined();
            expect(BoundingSphere.equals(boundingSphereFrame0, boundingSphereFrame1)).toBe(false);
        });
    });

    it('resolves ready promise', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            return pointCloud.readyPromise.then(function(pointCloud) {
                expect(pointCloud.boundingSphere).toBeDefined();
            });
        });
    });

    it('sets show', function() {
        var pointCloud = createTimeDynamicPointCloud();

        return loadFrame(pointCloud).then(function() {
            expect(scene).toRender([255, 0, 0, 255]);
            pointCloud.show = false;
            expect(scene).toRender([0, 0, 0, 255]);
        });
    });

    it('sets model matrix', function() {
        var translation = new Cartesian3(10000, 2000, 100);
        var modelMatrix = Matrix4.fromTranslation(translation);
        var newCenter = Cartesian3.add(center, translation, new Cartesian3());
        var pointCloud = createTimeDynamicPointCloud({
            modelMatrix : modelMatrix
        });
        return loadFrame(pointCloud).then(function() {
            expect(scene).toRender([0, 0, 0, 255]); // Out of view
            zoomTo(newCenter);
            expect(scene).toRender([255, 0, 0, 255]);
            pointCloud.modelMatrix = Matrix4.IDENTITY;
            expect(scene).toRender([0, 0, 0, 255]); // Out of view
            zoomTo(center);
            expect(scene).toRender([255, 0, 0, 255]);
        });
    });

    it('sets shadows', function() {
        var pointCloud = createTimeDynamicPointCloud({
            shadows : ShadowMode.DISABLED
        });
        return loadFrame(pointCloud).then(function() {
            scene.renderForSpecs();
            expect(scene.frameState.commandList[0].castShadows).toBe(false);
            expect(scene.frameState.commandList[0].receiveShadows).toBe(false);
            pointCloud.shadows = ShadowMode.ENABLED;
            scene.renderForSpecs();
            expect(scene.frameState.commandList[0].castShadows).toBe(true);
            expect(scene.frameState.commandList[0].receiveShadows).toBe(true);
        });
    });

    it('honors maximumMemoryUsage by unloading all frames not currently being loaded or rendered', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadAllFrames(pointCloud).then(function() {
            var singleFrameMemoryUsage = 33000;
            var frames = pointCloud._frames;
            var framesLength = frames.length;
            expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage * framesLength);
            pointCloud.maximumMemoryUsage = 0;

            // Expect all frames except the current frame to be undefined
            scene.renderForSpecs();
            expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage);
            expect(frames[0].ready).toBe(true);
            for (var i = 1; i < length; ++i) {
                expect(frames[i]).toBeUndefined();
            }

            // The loading frame and last rendered frame are not unloaded
            goToFrame(1);
            scene.renderForSpecs();
            expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage);
            expect(frames[0].ready).toBe(true);
            expect(frames[1].ready).toBe(false);

            // The loaded frame is the only one loaded
            return loadFrame(pointCloud, 1).then(function() {
                expect(pointCloud.totalMemoryUsageInBytes).toBe(singleFrameMemoryUsage);
                expect(frames[0]).toBeUndefined();
                expect(frames[1].ready).toBe(true);
            });
        });
    });

    it('enables attenuation and eye dome lighting', function() {
        var oldScene = scene;
        scene = createScene({
            canvas : createCanvas(100, 100)
        });
        initializeScene();

        var pointCloud = createTimeDynamicPointCloud({
            shading : {
                attenuation : true,
                eyeDomeLighting : false
            },
            style : new Cesium3DTileStyle()
        });

        return loadFrame(pointCloud).then(function() {
            var attenuationPixelCount;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                attenuationPixelCount = pixelCount;
            });

            // Disable attenuation and expect less pixels to be drawn
            pointCloud.shading.attenuation = false;
            expect(scene).toRenderPixelCountAndCall(function(pixelCount) {
                expect(pixelCount).toBeLessThan(attenuationPixelCount);
            });

            scene.destroyForSpecs();
            scene = oldScene;
        });
    });

    it('enabled eye dome lighting', function() {
        if (!PointCloudEyeDomeLighting.isSupported(scene.frameState.context)) {
            return;
        }

        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            expect(scene.frameState.commandList.length).toBe(1);
            pointCloud.shading.attenuation = true;
            pointCloud.shading.eyeDomeLighting = true;
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(3); // Added 2 EDL commands
        });
    });

    it('sets style', function() {
        var pointCloud = createTimeDynamicPointCloud({
            style : new Cesium3DTileStyle({
                color : 'color("blue")',
                pointSize : 10
            })
        });
        return loadAllFrames(pointCloud).then(function() {
            expect(scene).toRender([0, 0, 255, 255]);
            pointCloud.style = new Cesium3DTileStyle({
                color : 'color("lime")',
                pointSize : 10
            });
            expect(scene).toRender([0, 255, 0, 255]);
            goToFrame(1); // Also check that the style is updated for the next frame
            expect(scene).toRender([0, 255, 0, 255]);
        });
    });

    it('make style dirty', function() {
        var pointCloud = createTimeDynamicPointCloud({
            style : new Cesium3DTileStyle({
                color : 'color("blue")',
                pointSize : 10
            })
        });
        return loadAllFrames(pointCloud).then(function() {
            expect(scene).toRender([0, 0, 255, 255]);
            pointCloud.style.color = 'color("lime")';
            pointCloud.makeStyleDirty();
            expect(scene).toRender([0, 255, 0, 255]);
            goToFrame(1); // Also check that the style is updated for the next frame
            expect(scene).toRender([0, 255, 0, 255]);
        });
    });

    it('sets clipping planes', function() {
        var modelMatrix = new Transforms.headingPitchRollToFixedFrame(center, new HeadingPitchRoll(0, 0, 0));
        var clippingPlanesX = new ClippingPlaneCollection({
            modelMatrix : modelMatrix,
            planes : [
                new ClippingPlane(Cartesian3.UNIT_X, 0.0)
            ]
        });
        var clippingPlanesY = new ClippingPlaneCollection({
            modelMatrix : modelMatrix,
            planes : [
                new ClippingPlane(Cartesian3.UNIT_Y, 0.0)
            ]
        });

        var pointCloud = createTimeDynamicPointCloud({
            clippingPlanes : clippingPlanesX
        });
        return loadAllFrames(pointCloud).then(function() {
            // Go to unclipped area (right half)
            scene.camera.moveRight(0.1);
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);

            // Go to clipped area (left half)
            scene.camera.moveLeft(0.2);
            goToFrame(0);
            expect(scene).toRender([0, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([0, 0, 0, 255]);

            // Same area no longer clipped. Responds to clipping planes updates.
            pointCloud.clippingPlanes.enabled = false;
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);

            // Sets a new clipping plane that uses a different axis
            // Go to unclipped area (bottom left)
            pointCloud.clippingPlanes = clippingPlanesY;
            scene.camera.moveRight(0.2);
            scene.camera.moveUp(0.1);
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([255, 0, 0, 255]);

            // Go to clipped area (bottom right)
            scene.camera.moveDown(0.2);
            goToFrame(0);
            expect(scene).toRender([0, 0, 0, 255]);
            goToFrame(1);
            expect(scene).toRender([0, 0, 0, 255]);
        });
    });

    it('works with frame transforms', function() {
        var pointCloud = createTimeDynamicPointCloud({
            useTransforms : true
        });
        return loadAllFrames(pointCloud).then(function() {
            goToFrame(0);
            expect(scene).toRender([255, 0, 0, 255]);
            // The transform shifted the point cloud to the right
            goToFrame(1);
            expect(scene).toRender([0, 0, 0, 255]);
            scene.camera.moveRight(10.0);
            expect(scene).toRender([255, 0, 0, 255]);
        });
    });

    it('does not render during morph', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBeGreaterThan(0);
            scene.morphToColumbusView(1.0);
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(0);
        });
    });

    it('renders frames using Draco compression', function() {
        var pointCloud = createTimeDynamicPointCloud({
            useDraco : true
        });
        return loadFrame(pointCloud).then(function() {
            expect(scene).toRender([255, 0, 0, 255]);
        });
    });

    it('picks', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            pointCloud.show = false;
            expect(scene).toPickPrimitive(undefined);
            pointCloud.show = true;
            expect(scene).toPickPrimitive(pointCloud);
        });
    });

    it('does not render if current time is out of range', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            // Before
            clock.currentTime = JulianDate.addSeconds(dates[0], -10.0, new JulianDate());
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(0);
            // During
            clock.currentTime = dates[0];
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(1);
            // After
            clock.currentTime = JulianDate.addSeconds(dates[5], 10.0, new JulianDate());
            scene.renderForSpecs();
            expect(scene.frameState.commandList.length).toBe(0);
        });
    });

    it('prefetches different frame when clock multiplier changes', function() {
        var pointCloud = createTimeDynamicPointCloud();
        spyOn(pointCloud, '_getAverageLoadTime').and.returnValue(0.5);
        return loadFrame(pointCloud).then(function() {
            expect(pointCloud._frames[1]).toBeUndefined();
            clock.multiplier = 1.0;
            scene.renderForSpecs();
            expect(pointCloud._frames[1]).toBeDefined();
            clock.multiplier = 4.0;
            scene.renderForSpecs();
            expect(pointCloud._frames[2]).toBeUndefined();
            expect(pointCloud._frames[3]).toBeUndefined();
            expect(pointCloud._frames[4]).toBeDefined();
        });
    });

    it('renders last rendered frame while new frame loads', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadFrame(pointCloud).then(function() {
            var commandList = scene.frameState.commandList;
            var firstFrameCommand = commandList[0];
            goToFrame(4);
            return pollToPromise(function() {
                scene.renderForSpecs();
                var frame = pointCloud._frames[4];
                var ready = defined(frame) && frame.ready;
                if (!ready) {
                    expect(commandList[0]).toBe(firstFrameCommand);
                }
                return ready;
            }).then(function() {
                scene.renderForSpecs();
                expect(commandList[0]).toBeDefined();
                expect(commandList[0]).not.toBe(firstFrameCommand);
            });
        });
    });

    it('skips frames based on average load time and clock multiplier', function() {
        var pointCloud = createTimeDynamicPointCloud();
        spyOn(pointCloud, '_getAverageLoadTime').and.returnValue(2.0);
        scene.renderForSpecs(); // at 0.0 seconds - loads frame 0
        clock.multiplier = 0.6;
        scene.renderForSpecs(); // at 0.0 seconds - preloads frame 2 at 1.2 seconds
        clock.tick();
        scene.renderForSpecs(); // at 0.6 seconds
        clock.tick();
        scene.renderForSpecs(); // at 1.2 seconds - preloads frame 4 at 2.4 seconds
        clock.tick();
        scene.renderForSpecs(); // at 1.8 seconds
        clock.tick();
        scene.renderForSpecs(); // at 2.4 seconds

        var frames = pointCloud._frames;
        expect(frames[0]).toBeDefined();
        expect(frames[1]).toBeUndefined();
        expect(frames[2]).toBeDefined();
        expect(frames[3]).toBeUndefined();
        expect(frames[4]).toBeDefined();
    });

    it('does not skip frames if clock multiplier is sufficiently slow', function() {
        var pointCloud = createTimeDynamicPointCloud();
        spyOn(pointCloud, '_getAverageLoadTime').and.returnValue(0.5);
        scene.renderForSpecs(); // at 0.0 seconds - loads frame 0
        clock.multiplier = 0.6;
        scene.renderForSpecs(); // at 0.0 seconds - preloads frame 1
        clock.tick();
        scene.renderForSpecs(); // at 0.6 seconds - preloads frame 2
        clock.tick();
        scene.renderForSpecs(); // at 1.2 seconds - preloads frame 3
        clock.tick();
        scene.renderForSpecs(); // at 1.8 seconds - preloads frame 4
        clock.tick();
        scene.renderForSpecs(); // at 2.4 seconds

        var frames = pointCloud._frames;
        expect(frames[0]).toBeDefined();
        expect(frames[1]).toBeDefined();
        expect(frames[2]).toBeDefined();
        expect(frames[3]).toBeDefined();
        expect(frames[4]).toBeDefined();
    });

    it('renders loaded frames between the previous frame and next frame', function() {
        var pointCloud = createTimeDynamicPointCloud();
        spyOn(pointCloud, '_getAverageLoadTime').and.returnValue(3.4);
        var frames = pointCloud._frames;
        return loadFrames(pointCloud, [0, 2]).then(function() {
            clock.multiplier = 0.6;
            scene.renderForSpecs(); // at 0.0 seconds - preloads frame 4 at 2.04 seconds - renders frame 0
            expect(pointCloud._lastRenderedFrame).toBe(frames[0]);
            clock.tick();
            scene.renderForSpecs(); // at 0.6 seconds - renders frame 0
            expect(pointCloud._lastRenderedFrame).toBe(frames[0]);
            clock.tick();
            scene.renderForSpecs(); // at 1.2 seconds - renders frame 2 which has already been loaded
            expect(pointCloud._lastRenderedFrame).toBe(frames[2]);
            clock.tick();
            scene.renderForSpecs(); // at 1.8 seconds - renders frame 2
            expect(pointCloud._lastRenderedFrame).toBe(frames[2]);
        });
    });

    it('works with negative clock multiplier', function() {
        var pointCloud = createTimeDynamicPointCloud();
        spyOn(pointCloud, '_getAverageLoadTime').and.returnValue(2.0);
        goToFrame(4);
        scene.renderForSpecs(); // at 2.0 seconds - loads frame 4
        clock.multiplier = -0.6;
        scene.renderForSpecs(); // at 2.0 seconds - preloads frame 1 at 0.8 seconds
        clock.tick();
        scene.renderForSpecs(); // at 1.4 seconds
        clock.tick();
        scene.renderForSpecs(); // at 0.8 seconds - nothing left to preload
        clock.tick();
        scene.renderForSpecs(); // at 0.2 seconds
        clock.tick();
        scene.renderForSpecs(); // at -0.4 seconds

        var frames = pointCloud._frames;
        expect(frames[0]).toBeUndefined();
        expect(frames[1]).toBeDefined();
        expect(frames[2]).toBeUndefined();
        expect(frames[3]).toBeUndefined();
        expect(frames[4]).toBeDefined();
    });

    it('frames not loaded in sequential updates do not impact average load time', function() {
        var pointCloud = createTimeDynamicPointCloud();
        expect(pointCloud._runningAverage).toBe(0.0);
        return loadFrame(pointCloud).then(function() {
            expect(pointCloud._frames[0].sequential).toBe(true);
            expect(pointCloud._runningLength).toBe(1);
            expect(pointCloud._runningAverage).toBeGreaterThan(0.0);
            goToFrame(2); // Start loading frame 2, but don't finish loading it now
            scene.renderForSpecs();
            return loadFrame(pointCloud, 1).then(function() {
                var twoFrameAverage = pointCloud._runningAverage;
                expect(pointCloud._frames[1].sequential).toBe(true);
                expect(pointCloud._runningLength).toBe(2);
                expect(pointCloud._runningAverage).toBeGreaterThan(0.0);
                return loadFrame(pointCloud, 2).then(function() {
                    expect(pointCloud._frames[2].sequential).toBe(false);
                    expect(pointCloud._runningLength).toBe(2); // No update
                    expect(pointCloud._runningAverage).toBe(twoFrameAverage); // No update
                });
            });
        });
    });

    it('frame failed event is raised from request failure', function() {
        var pointCloud = createTimeDynamicPointCloud();
        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            deferred.reject('404');
        });
        var spyUpdate = jasmine.createSpy('listener');
        pointCloud.frameFailed.addEventListener(spyUpdate);

        var i;
        for (i = 0; i < 5; ++i) {
            goToFrame(i);
            scene.renderForSpecs();
        }

        for (i = 0; i < 5; ++i) {
            var arg = spyUpdate.calls.argsFor(i)[0];
            expect(arg).toBeDefined();
            expect(arg.uri).toContain(i + '.pnts');
            expect(arg.message).toBe('404');
        }
    });

    it('failed frame event is raised from Draco failure', function() {
        var pointCloud = createTimeDynamicPointCloud({
            useDraco : true
        });
        return loadFrame(pointCloud).then(function() {
            var decoder = DracoLoader._getDecoderTaskProcessor();
            spyOn(decoder, 'scheduleTask').and.returnValue(when.reject({message : 'my error'}));
            var spyUpdate = jasmine.createSpy('listener');
            pointCloud.frameFailed.addEventListener(spyUpdate);
            goToFrame(1);
            scene.renderForSpecs();
            var failedPromise;
            var frameFailed = false;
            return pollToPromise(function() {
                var contents = pointCloud._frames[1].pointCloud;
                if (defined(contents) && !defined(failedPromise)) {
                    failedPromise = contents.readyPromise.otherwise(function() {
                        frameFailed = true;
                    });
                }
                scene.renderForSpecs();
                return frameFailed;
            }).then(function() {
                var arg = spyUpdate.calls.argsFor(0)[0];
                expect(arg).toBeDefined();
                expect(arg.uri).toContain('1.pnts');
                expect(arg.message).toBe('my error');
            });
        });
    });

    it('raises frame changed event', function() {
        var pointCloud = createTimeDynamicPointCloud();
        var spyFrameChanged = jasmine.createSpy('listener');
        pointCloud.frameChanged.addEventListener(spyFrameChanged);

        return loadAllFrames(pointCloud).then(function() {
            expect(spyFrameChanged.calls.count()).toBe(5);

            // Go to random frame
            goToFrame(2);
            scene.renderForSpecs();
            expect(spyFrameChanged.calls.count()).toBe(6);

            // Go out of range. No event raised.
            clock.currentTime = JulianDate.addSeconds(dates[0], -10.0, new JulianDate());
            scene.renderForSpecs();
            expect(spyFrameChanged.calls.count()).toBe(6);

            goToFrame(0);
            scene.renderForSpecs();
            expect(spyFrameChanged.calls.count()).toBe(7);

            expect(spyFrameChanged.calls.argsFor(0)[0]).toBe(pointCloud);
        });
    });

    it('destroys', function() {
        var pointCloud = createTimeDynamicPointCloud();
        return loadAllFrames(pointCloud).then(function() {
            expect(pointCloud.isDestroyed()).toEqual(false);
            scene.primitives.remove(pointCloud);
            expect(pointCloud.isDestroyed()).toEqual(true);
            expect(pointCloud.totalMemoryUsageInBytes).toBe(0);
        });
    });

}, 'WebGL');
