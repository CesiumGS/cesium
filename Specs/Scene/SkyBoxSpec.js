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
            sources : {
                positiveX : loadedImage,
                negativeX : loadedImage,
                positiveY : loadedImage,
                negativeY : loadedImage,
                positiveZ : loadedImage,
                negativeZ : loadedImage
            }
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var us = context.getUniformState();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 20000000.0));
        us.update(context, frameState);

        var command = s.update(context, frameState);
        command.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        s.destroy();
    });

    it('does not render when show is false', function() {
        var s = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            },
            show : false
        });

        var us = context.getUniformState();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 10000000.0));
        us.update(context, frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render in 2D', function() {
        var s = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });

        var us = context.getUniformState();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 10000000.0));
        frameState.mode = SceneMode.SCENE2D;
        us.update(context, frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('does not render without a render pass', function() {
        var s = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });

        var us = context.getUniformState();
        var frameState = createFrameState(createCamera(
            context, new Cartesian3(7000000.0, 0.0, 0.0), Cartesian3.ZERO, Cartesian3.UNIT_Z, 1.0, 10000000.0));
        frameState.passes.render = false;
        us.update(context, frameState);

        var command = s.update(context, frameState);
        expect(command).not.toBeDefined();
    });

    it('gets constructor options', function() {
        var s = new SkyBox({
            sources : {
                positiveX : 'positiveX.png',
                negativeX : 'negativeX.png',
                positiveY : 'positiveY.png',
                negativeY : 'negativeY.png',
                positiveZ : 'positiveZ.png',
                negativeZ : 'negativeZ.png'
            },
            show : false
        });
        expect(s.sources.positiveX).toEqual('positiveX.png');
        expect(s.sources.negativeX).toEqual('negativeX.png');
        expect(s.sources.positiveY).toEqual('positiveY.png');
        expect(s.sources.negativeY).toEqual('negativeY.png');
        expect(s.sources.positiveZ).toEqual('positiveZ.png');
        expect(s.sources.negativeZ).toEqual('negativeZ.png');
        expect(s.show).toEqual(false);
    });

    it('isDestroyed', function() {
        var s = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        expect(s.isDestroyed()).toEqual(false);
        s.destroy();
        expect(s.isDestroyed()).toEqual(true);
    });

    it('throws when constructed without positiveX', function() {
        var skyBox = new SkyBox({
            sources : {
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed without negativeX', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed without positiveY', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed without negativeY', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed without positiveZ', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed without negativeZ', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed when positiveX is a different type', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : loadedImage,
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed when negativeX is a different type', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : loadedImage,
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed when positiveY is a different type', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : loadedImage,
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed when negativeY is a different type', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : loadedImage,
                positiveZ : './Data/Images/Blue.png',
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed when positiveZ is a different type', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : loadedImage,
                negativeZ : './Data/Images/Blue.png'
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });

    it('throws when constructed when negativeZ is a different type', function() {
        var skyBox = new SkyBox({
            sources : {
                positiveX : './Data/Images/Blue.png',
                negativeX : './Data/Images/Blue.png',
                positiveY : './Data/Images/Blue.png',
                negativeY : './Data/Images/Blue.png',
                positiveZ : './Data/Images/Blue.png',
                negativeZ : loadedImage
            }
        });
        var frameState = createFrameState();

        expect(function() {
            return skyBox.update(context, frameState);
        }).toThrowDeveloperError();
    });
}, 'WebGL');