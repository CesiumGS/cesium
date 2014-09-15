/*global defineSuite*/
defineSuite([
        'Scene/BillboardCollection',
        'Core/BoundingRectangle',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Math',
        'Core/NearFarScalar',
        'Renderer/ClearCommand',
        'Scene/HorizontalOrigin',
        'Scene/OrthographicFrustum',
        'Scene/SceneMode',
        'Scene/TextureAtlas',
        'Scene/VerticalOrigin',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext',
        'Specs/pick',
        'Specs/render'
    ], function(
        BillboardCollection,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        CesiumMath,
        NearFarScalar,
        ClearCommand,
        HorizontalOrigin,
        OrthographicFrustum,
        SceneMode,
        TextureAtlas,
        VerticalOrigin,
        createCamera,
        createContext,
        createFrameState,
        destroyContext,
        pick,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;
    var mockScene;
    var billboards;

    var greenImage;
    var blueImage;
    var whiteImage;
    var largeBlueImage;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();

        context.uniformState.update(context, frameState);

        mockScene = {
            canvas : context._canvas,
            context : context,
            camera : frameState.camera,
            frameState : frameState
        };
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        billboards = new BillboardCollection();

        if (!greenImage) {
            greenImage = new Image();
            greenImage.src = './Data/Images/Green.png';

            blueImage = new Image();
            blueImage.src = './Data/Images/Blue.png';

            whiteImage = new Image();
            whiteImage.src = './Data/Images/White.png';

            largeBlueImage = new Image();
            largeBlueImage.src = './Data/Images/Blue10x10.png';

            waitsFor(function() {
                return greenImage.complete && blueImage.complete && whiteImage.complete && largeBlueImage.complete;
            }, 'Load .png file(s) for billboard collection test.', 3000);
        }
    });

    afterEach(function() {
        billboards = billboards && billboards.destroy();
    });

    it('default constructs a billboard', function() {
        var b = billboards.add();
        expect(b.show).toEqual(true);
        expect(b.position).toEqual(Cartesian3.ZERO);
        expect(b.pixelOffset).toEqual(Cartesian2.ZERO);
        expect(b.eyeOffset).toEqual(Cartesian3.ZERO);
        expect(b.horizontalOrigin).toEqual(HorizontalOrigin.CENTER);
        expect(b.verticalOrigin).toEqual(VerticalOrigin.CENTER);
        expect(b.scale).toEqual(1.0);
        expect(b.image).not.toBeDefined();
        expect(b.color.red).toEqual(1.0);
        expect(b.color.green).toEqual(1.0);
        expect(b.color.blue).toEqual(1.0);
        expect(b.color.alpha).toEqual(1.0);
        expect(b.rotation).toEqual(0.0);
        expect(b.alignedAxis).toEqual(Cartesian3.ZERO);
        expect(b.scaleByDistance).not.toBeDefined();
        expect(b.translucencyByDistance).not.toBeDefined();
        expect(b.pixelOffsetScaleByDistance).not.toBeDefined();
        expect(b.width).not.toBeDefined();
        expect(b.height).not.toBeDefined();
        expect(b.id).not.toBeDefined();
    });

    it('explicitly constructs a billboard', function() {
        var b = billboards.add({
            show : false,
            position : new Cartesian3(1.0, 2.0, 3.0),
            pixelOffset : new Cartesian2(1.0, 2.0),
            eyeOffset : new Cartesian3(1.0, 2.0, 3.0),
            horizontalOrigin : HorizontalOrigin.LEFT,
            verticalOrigin : VerticalOrigin.BOTTOM,
            scale : 2.0,
            image : greenImage,
            color : {
                red : 1.0,
                green : 2.0,
                blue : 3.0,
                alpha : 4.0
            },
            rotation : 1.0,
            alignedAxis : new Cartesian3(1.0, 2.0, 3.0),
            scaleByDistance : new NearFarScalar(1.0, 3.0, 1.0e6, 0.0),
            translucencyByDistance : new NearFarScalar(1.0, 1.0, 1.0e6, 0.0),
            pixelOffsetScaleByDistance : new NearFarScalar(1.0, 1.0, 1.0e6, 0.0),
            width : 300.0,
            height : 200.0,
            id : 'id'
        });

        expect(b.show).toEqual(false);
        expect(b.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.pixelOffset).toEqual(new Cartesian2(1.0, 2.0));
        expect(b.eyeOffset).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.horizontalOrigin).toEqual(HorizontalOrigin.LEFT);
        expect(b.verticalOrigin).toEqual(VerticalOrigin.BOTTOM);
        expect(b.scale).toEqual(2.0);
        expect(b.image).toEqual(greenImage.src);
        expect(b.color.red).toEqual(1.0);
        expect(b.color.green).toEqual(2.0);
        expect(b.color.blue).toEqual(3.0);
        expect(b.color.alpha).toEqual(4.0);
        expect(b.rotation).toEqual(1.0);
        expect(b.alignedAxis).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.scaleByDistance).toEqual(new NearFarScalar(1.0, 3.0, 1.0e6, 0.0));
        expect(b.translucencyByDistance).toEqual(new NearFarScalar(1.0, 1.0, 1.0e6, 0.0));
        expect(b.pixelOffsetScaleByDistance).toEqual(new NearFarScalar(1.0, 1.0, 1.0e6, 0.0));
        expect(b.width).toEqual(300.0);
        expect(b.height).toEqual(200.0);
        expect(b.id).toEqual('id');
    });

    it('set billboard properties', function() {
        var b = billboards.add();
        b.show = false;
        b.position = new Cartesian3(1.0, 2.0, 3.0);
        b.pixelOffset = new Cartesian2(1.0, 2.0);
        b.eyeOffset = new Cartesian3(1.0, 2.0, 3.0);
        b.horizontalOrigin = HorizontalOrigin.LEFT;
        b.verticalOrigin = VerticalOrigin.BOTTOM;
        b.scale = 2.0;
        b.image = greenImage;
        b.color = new Color(1.0, 2.0, 3.0, 4.0);
        b.rotation = 1.0;
        b.alignedAxis = new Cartesian3(1.0, 2.0, 3.0);
        b.width = 300.0;
        b.height = 200.0;
        b.scaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
        b.translucencyByDistance = new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0);
        b.pixelOffsetScaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);

        expect(b.show).toEqual(false);
        expect(b.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.pixelOffset).toEqual(new Cartesian2(1.0, 2.0));
        expect(b.eyeOffset).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.horizontalOrigin).toEqual(HorizontalOrigin.LEFT);
        expect(b.verticalOrigin).toEqual(VerticalOrigin.BOTTOM);
        expect(b.scale).toEqual(2.0);
        expect(b.image).toEqual(greenImage.src);
        expect(b.color.red).toEqual(1.0);
        expect(b.color.green).toEqual(2.0);
        expect(b.color.blue).toEqual(3.0);
        expect(b.color.alpha).toEqual(4.0);
        expect(b.rotation).toEqual(1.0);
        expect(b.alignedAxis).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(b.scaleByDistance).toEqual(new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0));
        expect(b.translucencyByDistance).toEqual(new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0));
        expect(b.pixelOffsetScaleByDistance).toEqual(new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0));
        expect(b.width).toEqual(300.0);
        expect(b.height).toEqual(200.0);
    });

    it('disable billboard scaleByDistance', function() {
        var b = billboards.add({
            scaleByDistance : new NearFarScalar(1.0, 3.0, 1.0e6, 0.0)
        });
        b.scaleByDistance = undefined;
        expect(b.scaleByDistance).not.toBeDefined();
    });

    it('disable billboard translucencyByDistance', function() {
        var b = billboards.add({
            translucencyByDistance : new NearFarScalar(1.0, 1.0, 1.0e6, 0.0)
        });
        b.translucencyByDistance = undefined;
        expect(b.translucencyByDistance).not.toBeDefined();
    });

    it('disable billboard pixelOffsetScaleByDistance', function() {
        var b = billboards.add({
            pixelOffsetScaleByDistance : new NearFarScalar(1.0, 1.0, 1.0e6, 0.0)
        });
        b.pixelOffsetScaleByDistance = undefined;
        expect(b.pixelOffsetScaleByDistance).not.toBeDefined();
    });

    it('render billboard with scaleByDistance', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            scaleByDistance: new NearFarScalar(1.0, 1.0, 3.0, 0.0),
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var us = context.uniformState;
        var eye = new Cartesian3(0.0, 0.0, 1.0);
        var target = Cartesian3.ZERO;
        var up = Cartesian3.UNIT_Y;
        us.update(context, createFrameState(createCamera({
            eye : eye,
            target : target,
            up : up
        })));
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        eye = new Cartesian3(0.0, 0.0, 6.0);
        us.update(context, createFrameState(createCamera({
            eye : eye,
            target : target,
            up : up
        })));
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        us.update(context, createFrameState(createCamera()));
    });

    it('render billboard with translucencyByDistance', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            translucencyByDistance: new NearFarScalar(1.0, 1.0, 3.0, 0.0),
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var us = context.uniformState;
        var eye = new Cartesian3(0.0, 0.0, 1.0);
        var target = Cartesian3.ZERO;
        var up = Cartesian3.UNIT_Y;
        us.update(context, createFrameState(createCamera({
            eye : eye,
            target : target,
            up : up
        })));
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        eye = new Cartesian3(0.0, 0.0, 6.0);
        us.update(context, createFrameState(createCamera({
            eye : eye,
            target : target,
            up : up
        })));
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        us.update(context, createFrameState(createCamera(context)));
    });

    it('render billboard with pixelOffsetScaleByDistance', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            pixelOffset : new Cartesian2(1.0, 0.0),
            pixelOffsetScaleByDistance: new NearFarScalar(1.0, 0.0, 3.0, 10.0),
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        var us = context.uniformState;
        var eye = new Cartesian3(0.0, 0.0, 1.0);
        var target = Cartesian3.ZERO;
        var up = Cartesian3.UNIT_Y;
        us.update(context, createFrameState(createCamera({
            eye : eye,
            target : target,
            up : up
        })));
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        eye = new Cartesian3(0.0, 0.0, 6.0);
        us.update(context, createFrameState(createCamera({
            eye : eye,
            target : target,
            up : up
        })));
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
        us.update(context, createFrameState(createCamera()));
    });

    it('throws scaleByDistance with nearDistance === farDistance', function() {
        var b = billboards.add();
        var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            b.scaleByDistance = scale;
        }).toThrowDeveloperError();
    });

    it('throws new billboard with invalid scaleByDistance (nearDistance === farDistance)', function() {
        var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            billboards.add({
                scaleByDistance : scale
            });
        }).toThrowDeveloperError();
    });

    it('throws scaleByDistance with nearDistance > farDistance', function() {
        var b = billboards.add();
        var scale = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
        expect(function() {
            b.scaleByDistance = scale;
        }).toThrowDeveloperError();
    });

    it('throws pixelOffsetScaleByDistance with nearDistance === farDistance', function() {
        var b = billboards.add();
        var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            b.pixelOffsetScaleByDistance = scale;
        }).toThrowDeveloperError();
    });

    it('throws new billboard with invalid pixelOffsetScaleByDistance (nearDistance === farDistance)', function() {
        var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            billboards.add({
                pixelOffsetScaleByDistance : scale
            });
        }).toThrowDeveloperError();
    });

    it('throws pixelOffsetScaleByDistance with nearDistance > farDistance', function() {
        var b = billboards.add();
        var scale = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
        expect(function() {
            b.pixelOffsetScaleByDistance = scale;
        }).toThrowDeveloperError();
    });

    it('throws translucencyByDistance with nearDistance === farDistance', function() {
        var b = billboards.add();
        var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            b.translucencyByDistance = translucency;
        }).toThrowDeveloperError();
    });

    it('throws new billboard with invalid translucencyByDistance (nearDistance === farDistance)', function() {
        var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
        expect(function() {
            billboards.add({
                translucencyByDistance : translucency
            });
        }).toThrowDeveloperError();
    });

    it('throws translucencyByDistance with nearDistance > farDistance', function() {
        var b = billboards.add();
        var translucency = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
        expect(function() {
            b.translucencyByDistance = translucency;
        }).toThrowDeveloperError();
    });


    it('set a removed billboard property', function() {
        var b = billboards.add();
        billboards.remove(b);
        b.show = false;
        expect(b.show).toEqual(false);
    });

    it('has zero billboards when constructed', function() {
        expect(billboards.length).toEqual(0);
    });

    it('adds a billboard', function() {
        var b = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });

        expect(billboards.length).toEqual(1);
        expect(billboards.get(0)).toEqual(b);
    });

    it('removes the first billboard', function() {
        var one = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var two = billboards.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });

        expect(billboards.length).toEqual(2);

        expect(billboards.remove(one)).toEqual(true);

        expect(billboards.length).toEqual(1);
        expect(billboards.get(0)).toEqual(two);
    });

    it('removes the last billboard', function() {
        var one = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var two = billboards.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });

        expect(billboards.length).toEqual(2);

        expect(billboards.remove(two)).toEqual(true);

        expect(billboards.length).toEqual(1);
        expect(billboards.get(0)).toEqual(one);
    });

    it('removes the same billboard twice', function() {
        var b = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        expect(billboards.length).toEqual(1);

        expect(billboards.remove(b)).toEqual(true);
        expect(billboards.length).toEqual(0);

        expect(billboards.remove(b)).toEqual(false);
        expect(billboards.length).toEqual(0);
    });

    it('returns false when removing undefined', function() {
        billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        expect(billboards.length).toEqual(1);

        expect(billboards.remove(undefined)).toEqual(false);
        expect(billboards.length).toEqual(1);
    });

    it('adds and removes billboards', function() {
        var one = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var two = billboards.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });
        expect(billboards.length).toEqual(2);
        expect(billboards.get(0)).toEqual(one);
        expect(billboards.get(1)).toEqual(two);

        expect(billboards.remove(two)).toEqual(true);
        var three = billboards.add({
            position : new Cartesian3(7.0, 8.0, 9.0)
        });
        expect(billboards.length).toEqual(2);
        expect(billboards.get(0)).toEqual(one);
        expect(billboards.get(1)).toEqual(three);
    });

    it('removes all billboards', function() {
        billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        billboards.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });
        expect(billboards.length).toEqual(2);

        billboards.removeAll();
        expect(billboards.length).toEqual(0);
    });

    it('can check if it contains a billboard', function() {
        var billboard = billboards.add();

        expect(billboards.contains(billboard)).toEqual(true);
    });

    it('returns false when checking if it contains a billboard it does not contain', function() {
        var billboard = billboards.add();
        billboards.remove(billboard);

        expect(billboards.contains(billboard)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(billboards.contains(undefined)).toEqual(false);
    });

    it('does not contain random other objects', function() {
        expect(billboards.contains({})).toEqual(false);
        expect(billboards.contains(new Cartesian2())).toEqual(false);
    });

    it('sets and gets a texture atlas', function() {
        expect(billboards.textureAtlas).not.toBeDefined();

        var atlas = new TextureAtlas({ context : context });
        billboards.textureAtlas = atlas;
        expect(billboards.textureAtlas).toEqual(atlas);
    });

    it('destroys a texture atlas', function() {
        var b = new BillboardCollection();
        expect(b.destroyTextureAtlas).toEqual(true);

        var atlas = new TextureAtlas({ context : context });
        b.textureAtlas = atlas;
        b = b.destroy();

        expect(atlas.isDestroyed()).toEqual(true);
    });

    it('does not destroy a texture atlas', function() {
        var b = new BillboardCollection();
        b.destroyTextureAtlas = false;

        var atlas = new TextureAtlas({ context : context });
        b.rextureAtlas = atlas;
        b = b.destroy();

        expect(atlas.isDestroyed()).toEqual(false);
    });

    it('does not render when constructed', function() {
        expect(render(context, frameState, billboards)).toEqual(0);
    });

    it('modifies and removes a billboard, then renders', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });
        billboards.add({
            position : new Cartesian3(1.0, 0.0, 0.0),
            image : blueImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        b.scale = 2.0;
        billboards.remove(b);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders a green billboard', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('adds and renders a billboard', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        billboards.add({
            position : new Cartesian3(-0.5, 0.0, 0.0), // Closer to viewer
            image : blueImage
        });

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('removes and renders a billboard', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });
        var blueBillboard = billboards.add({
            position : new Cartesian3(-0.5, 0.0, 0.0), // Closer to viewer
            image : blueImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        billboards.remove(blueBillboard);
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('removes all billboards and renders', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        billboards.removeAll();
        expect(render(context, frameState, billboards)).toEqual(0);
    });

    it('removes all billboards, adds a billboard, and renders', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        billboards.removeAll();
        billboards.add({
            position : Cartesian3.ZERO,
            image : blueImage
        });

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders with a different texture atlas', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        billboards.textureAtlas = new TextureAtlas({ context : context });
        b.image = blueImage;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using billboard show property', function() {
        var greenBillboard = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });
        var blueBillboard = billboards.add({
            show : false,
            position : Cartesian3.ZERO,
            image : blueImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        greenBillboard.show = false;
        blueBillboard.show = true;

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using billboard position property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.position = new Cartesian3(-2.0, 0.0, 0.0); // Behind viewer
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.position = Cartesian3.ZERO; // Back in front of viewer
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using billboard scale property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.scale = 0.0;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.scale = 2.0;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using billboard image property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.image = blueImage;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using billboard setImage function', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.setImage(blueImage.src, blueImage);
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using billboard setImageSubRegion function', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        billboards.textureAtlas.addImage(largeBlueImage.src, largeBlueImage);
        b.setImageSubRegion(largeBlueImage.src, new BoundingRectangle(5.0, 5.0, 1.0, 1.0));
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using billboard color property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : whiteImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.color = new Color(1.0, 0.0, 1.0, 1.0);
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([255, 0, 255, 255]);

        // Update a second time since it goes through a different vertex array update path
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.color = new Color(0.0, 1.0, 0.0, 1.0);
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using billboard rotation property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.rotation = CesiumMath.PI_OVER_TWO;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using billboard aligned axis property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.alignedAxis = Cartesian3.UNIT_X;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using billboard custum width property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.width = 300.0;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using billboard custum height property', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        b.height = 300.0;
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        billboards.add({
            position : Cartesian3.ZERO,
            image : greenImage,
            scale : 0.5 // bring bounding volume in view
        });
        billboards.debugShowBoundingVolume = true;

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('updates 10% of billboards', function() {
        for ( var i = 0; i < 10; ++i) {
            billboards.add({
                position : Cartesian3.ZERO,
                image : whiteImage,
                show : (i === 3)
            });
        }

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // First render - default billboard color is white.
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        billboards.get(3).color = new Color(0.0, 1.0, 0.0, 1.0);

        // Second render - billboard is green
        ClearCommand.ALL.execute(context);
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        billboards.get(3).color = new Color(1.0, 0.0, 0.0, 1.0);

        // Third render - update goes through a different vertex array update path
        ClearCommand.ALL.execute(context);
        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('renders more than 16K billboards', function() {
        for ( var i = 0; i < 16 * 1024; ++i) {
            billboards.add({
                position : Cartesian3.ZERO,
                image : whiteImage,
                color : {
                    alpha : 0.0
                }
            });
        }

        billboards.add({
            position : Cartesian3.ZERO,
            image : whiteImage
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('is picked', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : whiteImage,
            id : 'id'
        });

        var pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        expect(pickedObject.id).toEqual('id');
    });

    it('can change pick id', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : whiteImage,
            id : 'id'
        });

        var pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        expect(pickedObject.id).toEqual('id');

        b.id = 'id2';

        pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        expect(pickedObject.id).toEqual('id2');
    });

    it('is not picked', function() {
        billboards.add({
            show : false,
            position : Cartesian3.ZERO,
            image : whiteImage
        });

        var pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('pick a billboard using translucencyByDistance', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            image : whiteImage
        });

        var translucency = new NearFarScalar(1.0, 1.0, 3.0e9, 0.9);
        b.translucencyByDistance = translucency;
        var pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        translucency.nearValue = 0.0;
        translucency.farValue = 0.0;
        b.translucencyByDistance = translucency;
        pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('pick a billboard using pixelOffsetScaleByDistance', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            pixelOffset : new Cartesian2(0.0, 1.0),
            image : whiteImage
        });

        var pixelOffsetScale = new NearFarScalar(1.0, 0.0, 3.0e9, 0.0);
        b.pixelOffsetScaleByDistance = pixelOffsetScale;
        var pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject.primitive).toEqual(b);
        pixelOffsetScale.nearValue = 10.0;
        pixelOffsetScale.farValue = 10.0;
        b.pixelOffsetScaleByDistance = pixelOffsetScale;
        pickedObject = pick(context, frameState, billboards, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('computes screen space position (1)', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO
        });
        billboards.update(context, frameState, []);
        expect(b.computeScreenSpacePosition(mockScene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
    });

    it('computes screen space position (2)', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            pixelOffset : new Cartesian2(1.0, 2.0)
        });
        billboards.update(context, frameState, []);
        expect(b.computeScreenSpacePosition(mockScene)).toEqualEpsilon(new Cartesian2(1.5, 2.5), CesiumMath.EPSILON1);
    });

    it('computes screen space position (3)', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO,
            eyeOffset : new Cartesian3(5.0, -5.0, 0.0)
        });
        billboards.update(context, frameState, []);
        expect(b.computeScreenSpacePosition(mockScene)).toEqualEpsilon(new Cartesian2(0.5, 0.5), CesiumMath.EPSILON1);
    });

    it('throws when computing screen space position when not in a collection', function() {
        var b = billboards.add({
            position : Cartesian3.ZERO
        });
        billboards.remove(b);
        expect(function() {
            b.computeScreenSpacePosition(mockScene);
        }).toThrowDeveloperError();
    });

    it('throws when computing screen space position without scene', function() {
        var b = billboards.add();

        expect(function() {
            b.computeScreenSpacePosition();
        }).toThrowDeveloperError();
    });

    it('equals another billboard', function() {
        var b = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0),
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });
        var b2 = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0),
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        expect(b).toEqual(b2);
    });

    it('does not equal another billboard', function() {
        var b = billboards.add({
            position : new Cartesian3(1.0, 2.0, 3.0)
        });
        var b2 = billboards.add({
            position : new Cartesian3(4.0, 5.0, 6.0)
        });

        expect(b.equals(b2)).toEqual(false);
    });

    it('does not equal undefined', function() {
        var billboard = billboards.add();
        expect(billboard.equals(undefined)).toEqual(false);
    });

    it('throws when accessing without an index', function() {
        expect(function() {
            billboards.get();
        }).toThrowDeveloperError();
    });

    it('setImage throws without an id', function() {
        var b = billboards.add();
        expect(function() {
            b.setImage(undefined, {});
        }).toThrowDeveloperError();
    });

    it('setImage throws without an inmage', function() {
        var b = billboards.add();
        expect(function() {
            b.setImage('', undefined);
        }).toThrowDeveloperError();
    });

    it('setImageSubRegion throws without an id', function() {
        var b = billboards.add();
        expect(function() {
            b.setImage(undefined, {});
        }).toThrowDeveloperError();
    });

    it('setImageSubRegion throws without a sub-region', function() {
        var b = billboards.add();
        expect(function() {
            b.setImage('', undefined);
        }).toThrowDeveloperError();
    });

    it('computes bounding sphere in 3D', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, 50.0)
        });

        var commandList = [];
        billboards.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;

        var positions = [one.position, two.position];
        var bs = BoundingSphere.fromPoints(positions);
        expect(actual.center).toEqual(bs.center);
        expect(actual.radius).toBeGreaterThan(bs.radius);
    });

    it('computes bounding sphere in Columbus view', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, 50.0)
        });

        var mode = frameState.mode;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        var commandList = [];
        billboards.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;
        frameState.mode = mode;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.position)),
            projection.project(ellipsoid.cartesianToCartographic(two.position))
        ];
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(0.0, bs.center.x, bs.center.y);
        expect(bs.center).toEqualEpsilon(actual.center, CesiumMath.EPSILON8);
        expect(bs.radius).toBeLessThan(actual.radius);
    });

    it('computes bounding sphere in 2D', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, -50.0)
        });
        var two = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, 50.0)
        });

        var maxRadii = ellipsoid.maximumRadius;
        var orthoFrustum = new OrthographicFrustum();
        orthoFrustum.right = maxRadii * Math.PI;
        orthoFrustum.left = -orthoFrustum.right;
        orthoFrustum.top = orthoFrustum.right;
        orthoFrustum.bottom = -orthoFrustum.top;
        orthoFrustum.near = 0.01 * maxRadii;
        orthoFrustum.far = 60.0 * maxRadii;

        var mode = frameState.mode;
        var camera = frameState.camera;
        var frustum = camera.frustum;
        frameState.mode = SceneMode.SCENE2D;
        camera.frustum = orthoFrustum;

        var commandList = [];
        billboards.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;

        camera.frustum = frustum;
        frameState.mode = mode;

        var projectedPositions = [
            projection.project(ellipsoid.cartesianToCartographic(one.position)),
            projection.project(ellipsoid.cartesianToCartographic(two.position))
        ];
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(0.0, bs.center.x, bs.center.y);
        expect(bs.center).toEqualEpsilon(actual.center, CesiumMath.EPSILON8);
        expect(bs.radius).toBeLessThan(actual.radius);
    });

    it('computes bounding sphere with pixel offset', function() {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, -50.0),
            pixelOffset : new Cartesian2(0.0, 200.0)
        });
        var two = billboards.add({
            image : greenImage,
            position : Cartesian3.fromDegrees(-50.0, 50.0),
            pixelOffset : new Cartesian2(0.0, 200.0)
        });

        var commandList = [];
        billboards.update(context, frameState, commandList);
        var actual = commandList[0].boundingVolume;

        var positions = [one.position, two.position];
        var bs = BoundingSphere.fromPoints(positions);

        var dimensions = new Cartesian2(1.0, 1.0);
        var diff = Cartesian3.subtract(actual.center, frameState.camera.position, new Cartesian3());
        var vectorProjection = Cartesian3.multiplyByScalar(frameState.camera.direction, Cartesian3.dot(diff, frameState.camera.direction), new Cartesian3());
        var distance = Math.max(0.0, Cartesian3.magnitude(vectorProjection) - bs.radius);

        var pixelSize = frameState.camera.frustum.getPixelSize(dimensions, distance);
        bs.radius += pixelSize.y * 0.25 * Math.max(greenImage.width, greenImage.height) + pixelSize.y * one.pixelOffset.y;

        expect(actual.center).toEqual(bs.center);
        expect(actual.radius).toBeGreaterThan(bs.radius);
    });

    it('can create a billboard using a URL', function() {
        render(context, frameState, billboards);

        var one = billboards.add({
            image : './Data/Images/Green.png'
        });

        expect(one.ready).toEqual(false);
        expect(one.image).toEqual('./Data/Images/Green.png');

        waitsFor(function() {
            return one.ready;
        });

        runs(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, billboards);
            expect(context.readPixels()).toEqual([0, 255, 0, 255]);
        });
    });

    it('does not cancel image load when a billboard is set to the same URL repeatedly', function() {
        render(context, frameState, billboards);

        var one = billboards.add({
            image : './Data/Images/Green.png'
        });

        expect(one.ready).toEqual(false);
        expect(one.image).toEqual('./Data/Images/Green.png');

        one.image = './Data/Images/Green.png';
        one.image = './Data/Images/Green.png';
        one.image = './Data/Images/Green.png';

        waitsFor(function() {
            return one.ready;
        });
    });

    it('ignores calls to set image equal to the current value after load', function() {
        render(context, frameState, billboards);

        var one = billboards.add({
            image : './Data/Images/Green.png'
        });

        expect(one.ready).toEqual(false);
        expect(one.image).toEqual('./Data/Images/Green.png');

        waitsFor(function() {
            return one.ready;
        });

        runs(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, billboards);
            expect(context.readPixels()).toEqual([0, 255, 0, 255]);

            one.image = './Data/Images/Green.png';

            expect(one.ready).toEqual(true);

            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, billboards);
            expect(context.readPixels()).toEqual([0, 255, 0, 255]);
        });
    });

    it('can create a billboard using a function', function() {
        var one = billboards.add({
            image : function() {
                return greenImage;
            }
        });

        // the image property will be an autogenerated id if not provided
        expect(one.image).toBeDefined();

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('can create a billboard using a function and id', function() {
        var one = billboards.add({
            imageId : 'Foo',
            image : function() {
                return greenImage;
            }
        });

        // the image property will be an autogenerated id if not provided
        expect(one.image).toEqual('Foo');

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('can create a billboard using another billboard image', function() {
        var createImage = jasmine.createSpy('createImage').andReturn(greenImage);

        var one = billboards.add({
            image : createImage
        });

        render(context, frameState, billboards);

        expect(createImage.callCount).toEqual(1);

        var two = billboards.add({
            image : one.image
        });

        render(context, frameState, billboards);

        expect(two.image).toEqual(one.image);
        expect(createImage.callCount).toEqual(1);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, billboards);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('can create a billboard using a subregion of an image', function() {
        render(context, frameState, billboards);

        var one = billboards.add({
            image : './Data/Images/Red16x16.png',
            imageSubRegion : new BoundingRectangle(0.0, 0.0, 1.0, 2.0)
        });

        expect(one.ready).toEqual(false);

        waitsFor(function() {
            return one.ready;
        });

        runs(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, billboards);
            expect(context.readPixels()).toEqual([255, 0, 0, 255]);
        });
    });

    it('can change image while an image is loading', function() {
        render(context, frameState, billboards);

        var one = billboards.add({
            image : './Data/Images/Green.png'
        });

        expect(one.ready).toEqual(false);
        expect(one.image).toEqual('./Data/Images/Green.png');

        // switch to blue while green is in-flight

        one.image = './Data/Images/Blue.png';

        expect(one.ready).toEqual(false);
        expect(one.image).toEqual('./Data/Images/Blue.png');

        waitsFor(function() {
            return one.ready;
        });

        for (var i = 0; i < 10; ++i) {
            /*jshint loopfunc: true */
            // render and yield control several times to make sure the
            // green image doesn't clobber the blue

            runs(function() {
                ClearCommand.ALL.execute(context);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);

                render(context, frameState, billboards);
                expect(context.readPixels()).toEqual([0, 0, 255, 255]);
            });
        }
    });

    it('can set image to undefined while an image is loading', function() {
        render(context, frameState, billboards);

        var one = billboards.add({
            image : './Data/Images/Green.png'
        });

        expect(one.ready).toEqual(false);
        expect(one.image).toEqual('./Data/Images/Green.png');

        // switch to undefined while green is in-flight

        one.image = undefined;

        expect(one.ready).toEqual(false);
        expect(one.image).toBeUndefined();

        for (var i = 0; i < 10; ++i) {
            /*jshint loopfunc: true */
            // render and yield control several times to make sure the
            // green image never loads

            runs(function() {
                ClearCommand.ALL.execute(context);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);

                render(context, frameState, billboards);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);
            });
        }
    });

    it('does not crash when removing a billboard that is loading', function() {
        render(context, frameState, billboards);

        var one = billboards.add({
            image : './Data/Images/Green.png'
        });

        billboards.remove(one);

        for (var i = 0; i < 10; ++i) {
            /*jshint loopfunc: true */
            // render and yield control several times to make sure the
            // green image doesn't crash when it loads
            runs(function() {
                ClearCommand.ALL.execute(context);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);

                render(context, frameState, billboards);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);
            });
        }
    });

}, 'WebGL');
