/*global defineSuite*/
defineSuite([
         'Scene/SkyBox',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Core/Cartesian3',
         'Renderer/ClearCommand',
         'Scene/SceneMode',
         'ThirdParty/when'
     ], function(
         SkyBox,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         Cartesian3,
         ClearCommand,
         SceneMode,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var loadedImage;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('create images', function() {
        loadedImage = new Image();
        loadedImage.src = './Data/Images/Blue.png';

        waitsFor(function() {
            return loadedImage.complete;
        }, 'The image should load.', 5000);
    });

    it('draws a sky box from Images', function() {
        var s = new SkyBox({
            positiveX : loadedImage,
            negativeX : loadedImage,
            positiveY : loadedImage,
            negativeY : loadedImage,
            positiveZ : loadedImage,
            negativeZ : loadedImage
        });

        ClearCommand.ALL.execute(context);
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

    it('throws when constructed without positiveX', function() {
        expect(function() {
            return new SkyBox({
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed without negativeX', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed without positiveY', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed without negativeY', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed without positiveZ', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed without negativeZ', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed when positiveX is a different type', function() {
        expect(function() {
            return new SkyBox({
                positiveX : loadedImage,
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed when negativeX is a different type', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : loadedImage,
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed when positiveY is a different type', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : loadedImage,
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed when negativeY is a different type', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : loadedImage,
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed when positiveZ is a different type', function() {
        expect(function() {
            return new SkyBox({
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : loadedImage,
                negativeZ : './Data/Images/Blue.png'
            });
        }).toThrow();
    });

    it('throws when constructed when negativeZ is a different type', function() {
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
}, 'WebGL');
