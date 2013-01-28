/*global defineSuite*/
defineSuite([
         'Scene/ViewportQuad',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createCamera',
         'Specs/createFrameState',
         'Specs/frameState',
         'Specs/pick',
         'Specs/render',
         'Core/BoundingRectangle',
         'Core/Cartesian3'
     ], function(
         ViewportQuad,
         createContext,
         destroyContext,
         createCamera,
         createFrameState,
         frameState,
         pick,
         render,
         BoundingRectangle,
         Cartesian3) {
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
        expect(viewportQuad.material.uniforms.color).toEqual({
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 1.0
        });
    });

    it('gets default texture', function() {
        expect(viewportQuad.getTexture()).not.toBeDefined();
    });

    it('set texture', function() {
        var texture = context.createTexture2D({
            width : 2,
            height : 2
        });
        viewportQuad.setTexture(texture);

        expect(viewportQuad.getTexture()).toEqual(texture);
    });

    it('renders material', function() {
        viewportQuad.material.uniforms.color = {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 1.0
        };

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, viewportQuad);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
    });

    it('renders texture', function() {

        waitsFor( function() {
            return testImage.complete;
        }, 'Load test image for texture test.', 3000);

        runs( function() {
            var texture = context.createTexture2D({
                source : testImage
            });

            viewportQuad.setTexture(texture);

            context.clear();
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, viewportQuad);
            expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
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
