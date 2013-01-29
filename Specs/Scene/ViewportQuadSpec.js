/*global defineSuite*/
defineSuite([
         'Scene/Material',
         'Scene/ViewportQuad',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/BoundingRectangle',
         'Core/Cartesian3',
         'Core/Color'
     ], function(
         Material,
         ViewportQuad,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         frameState,
         pick,
         render,
         BoundingRectangle,
         Cartesian3,
         Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var viewportQuad;
    var us;
    var testImage;

    beforeAll(function() {
        context = createContext();
        testImage = new Image();
        testImage.src = './Data/Images/Red16x16.png';

    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        var boundRectangle = new BoundingRectangle(0, 0, 2, 2);
        viewportQuad = new ViewportQuad(boundRectangle);

        us = context.getUniformState();
        us.update(createFrameState(createCamera(context)));
    });

    afterEach(function() {
        viewportQuad = viewportQuad && viewportQuad.destroy();
        us = undefined;
    });

    it('gets constructor set rectangle', function() {
        var boundRectangle = new BoundingRectangle(0, 0, 2, 2);
        expect(viewportQuad.getRectangle()).toEqual(boundRectangle);
    });

    it('sets rectangle', function() {
        var boundRectangle = new BoundingRectangle(22, 22, 22, 22);

        viewportQuad.setRectangle(boundRectangle);
        expect(viewportQuad.getRectangle()).toEqual(boundRectangle);
    });

    it('gets the default color', function() {
        expect(viewportQuad.material.uniforms.color).toEqual(
            new Color(1.0, 1.0, 1.0, 1.0));
    });

    it('renders material', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, viewportQuad);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders user created texture', function() {

        waitsFor( function() {
            return testImage.complete;
        }, 'Load test image for texture test.', 3000);

        runs( function() {
            var texture = context.createTexture2D({
                source : testImage
            });

            viewportQuad.material = Material.fromType(context, Material.ImageType);
            viewportQuad.material.uniforms.image = texture;

            context.clear();
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, viewportQuad);
            expect(context.readPixels()).toEqual([255, 0, 0, 255]);
        });
    });

    it('isDestroyed', function() {
        var boundRectangle = new BoundingRectangle(0, 0, 10, 10);
        var vq = new ViewportQuad(boundRectangle);

        expect(vq.isDestroyed()).toEqual(false);
        vq.destroy();
        expect(vq.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
