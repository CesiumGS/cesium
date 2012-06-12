/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext'
     ], 'Renderer/Clear', function(
         createContext,
         destroyContext) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var context;

    beforeEach(function() {
        context = createContext();
    });

    afterEach(function() {
        destroyContext(context);
    });

    it('clear0', function() {
        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it('clear1', function() {
        context.clear(context.createClearState({
            color : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 1.0
            }
        }));
        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
    });

    it('clear2', function() {
        context.clear(context.createClearState({
            color : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 1.0
            },
            colorMask : {
                red : true,
                green : false,
                blue : true,
                alpha : false
            }
        }));
        expect(context.readPixels()).toEqualArray([255, 0, 255, 0]);
    });

    it('clear3', function() {
        context.clear(context.createClearState({
            color : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 1.0
            }
        }));
        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        context.clear(context.createClearState({
            color : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.0
            },
            scissorTest : {
                enabled : true,
                rectangle : {
                    x : 0,
                    y : 0,
                    width : 0,
                    height : 0
                }
            }
        }));
        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        context.clear(context.createClearState({
            color : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.0
            },
            scissorTest : {
                enabled : true,
                rectangle : {
                    x : 0,
                    y : 0,
                    width : 1,
                    height : 1
                }
            }
        }));
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it('clears a framebuffer color attachment', function() {
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });
        var framebuffer = context.createFramebuffer({
            colorTexture : colorTexture
        });

        context.clear(context.createClearState({
            framebuffer : framebuffer,
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        }));

        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqualArray([0, 255, 0, 255]);

        framebuffer = framebuffer.destroy();
    });

    it('clears with dithering', function() {
        context.clear(context.createClearState({
            color : {
                red : 1.0,
                green : 1.0,
                blue : 1.0,
                alpha : 1.0
            },
            dither : false
        }));
        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        context.clear(context.createClearState({
            color : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.0
            },
            dither : true
        }));
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
    });

    it('fails to read pixels (width)', function() {
        expect(function() {
            expect(context.readPixels({
                width : -1
            })).toEqualArray([0, 0, 0, 0]);
        }).toThrow();
    });

    it('fails to read pixels (height)', function() {
        expect(function() {
            expect(context.readPixels({
                height : -1
            })).toEqualArray([0, 0, 0, 0]);
        }).toThrow();
    });
});