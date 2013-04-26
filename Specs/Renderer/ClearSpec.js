/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/Color',
         'Core/BoundingRectangle',
         'Renderer/ClearCommand'
     ], 'Renderer/Clear', function(
         createContext,
         destroyContext,
         Color,
         BoundingRectangle,
         ClearCommand) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('default clear', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('clears to white', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.clear(new ClearCommand(context.createClearState({
            color : Color.WHITE
        })));
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('clears to white by executing a clear command', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new ClearCommand(context.createClearState({
            color : Color.WHITE
        }));

        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('clears with a color mask', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.clear(new ClearCommand(context.createClearState({
            color : Color.WHITE,
            colorMask : {
                red : true,
                green : false,
                blue : true,
                alpha : false
            }
        })));
        expect(context.readPixels()).toEqual([255, 0, 255, 0]);
    });

    it('clears with scissor test', function() {
        context.clear(new ClearCommand(context.createClearState({
            color : Color.WHITE
        })));
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        context.clear(new ClearCommand(context.createClearState({
            color : Color.BLACK,
            scissorTest : {
                enabled : true,
                rectangle : new BoundingRectangle()
            }
        })));
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        context.clear(new ClearCommand(context.createClearState({
            color : Color.BLACK,
            scissorTest : {
                enabled : true,
                rectangle : new BoundingRectangle(0, 0, 1, 1)
            }
        })));
        expect(context.readPixels()).toEqual([0, 0, 0, 255]);
    });

    it('clears a framebuffer color attachment', function() {
        var colorTexture = context.createTexture2D({
            width : 1,
            height : 1
        });
        var framebuffer = context.createFramebuffer({
            colorTexture : colorTexture
        });

        context.clear(new ClearCommand(context.createClearState({
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        }), framebuffer));

        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqual([0, 255, 0, 255]);

        framebuffer = framebuffer.destroy();
    });

    it('clears with dithering', function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.clear(new ClearCommand(context.createClearState({
            color : Color.WHITE,
            dither : false
        })));
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        context.clear(new ClearCommand(context.createClearState({
            color : Color.BLACK,
            dither : true
        })));
        expect(context.readPixels()).toEqual([0, 0, 0, 255]);
    });

    it('fails to read pixels (width)', function() {
        expect(function() {
            expect(context.readPixels({
                width : -1
            })).toEqual([0, 0, 0, 0]);
        }).toThrow();
    });

    it('fails to read pixels (height)', function() {
        expect(function() {
            expect(context.readPixels({
                height : -1
            })).toEqual([0, 0, 0, 0]);
        }).toThrow();
    });
}, 'WebGL');