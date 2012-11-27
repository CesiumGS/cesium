/*global defineSuite*/
defineSuite([
         'Scene/SkyBox',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Core/loadImage',
         'Core/Cartesian3',
         'Scene/SceneMode',
         'ThirdParty/when'
     ], function(
         SkyBox,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         loadImage,
         Cartesian3,
         SceneMode,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('draws a sky box from Images', function() {
        var loadedImage;
        when(loadImage('./Data/Images/Blue.png'), function(image) {
            loadedImage = image;
        });

        waitsFor(function() {
            return typeof loadedImage !== 'undefined';
        }, 'The image should load.', 5000);

        runs(function() {
            var s = new SkyBox({
                positiveX : loadedImage,
                negativeX : loadedImage,
                positiveY : loadedImage,
                negativeY : loadedImage,
                positiveZ : loadedImage,
                negativeZ : loadedImage
            });

            context.clear();
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            var us = context.getUniformState();
            var frameState = createFrameState(createCamera(
                context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 20000000.0));
            us.update(frameState);

            var command = s.update(context, frameState);
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 255, 255]);

            s.destroy();
        });
    });

    it('does not render when show is false', function() {
        var s = new SkyBox({
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        });
        s.show = false;

        var us = context.getUniformState();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 10000000.0));
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render in 2D', function() {
        var s = new SkyBox({
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        });

        var us = context.getUniformState();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 10000000.0));
        frameState.mode = SceneMode.SCENE2D;
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render without a color pass', function() {
        var s = new SkyBox({
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        });

        var us = context.getUniformState();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 10000000.0));
        frameState.passes.color = false;
        us.update(frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('gets sources', function() {
        var s = new SkyBox({
            positiveX : 'positiveX.png',
            negativeX : 'negativeX.png',
            positiveY : 'positiveY.png',
            negativeY : 'negativeY.png',
            positiveZ : 'positiveZ.png',
            negativeZ : 'negativeZ.png'
        });
        expect(s.getSources().positiveX).toEqual('positiveX.png');
        expect(s.getSources().negativeX).toEqual('negativeX.png');
        expect(s.getSources().positiveY).toEqual('positiveY.png');
        expect(s.getSources().negativeY).toEqual('negativeY.png');
        expect(s.getSources().positiveZ).toEqual('positiveZ.png');
        expect(s.getSources().negativeZ).toEqual('negativeZ.png');
    });

    it('isDestroyed', function() {
        var s = new SkyBox({
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        });
        expect(s.isDestroyed()).toEqual(false);
        s.destroy();
        expect(s.isDestroyed()).toEqual(true);
    });

    it('throws when constructed without sources', function() {
        expect(function() {
            return new SkyBox();
        }).toThrow();
    });

    it('throws when constructed without all source urls', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed with sources of different types', function() {
        var loadedImage;
        when(loadImage('./Data/Images/Blue.png'), function(image) {
            loadedImage = image;
        });

        waitsFor(function() {
            return typeof loadedImage !== 'undefined';
        }, 'The image should load.', 5000);

        runs(function() {
            expect(function() {
                return new SkyBox({
                    positiveX : './Data/Images/Blue.png',
                    negativeX : './Data/Images/Blue.png',
                    positiveY : './Data/Images/Blue.png',
                    negativeY : './Data/Images/Blue.png',
                    positiveZ : './Data/Images/Blue.png',
                    negativeZ : loadedImage
                });
            }).toThrow();
        });
    });
});
