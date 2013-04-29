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
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('clears to white', function() {
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new ClearCommand();
        command.color = Color.WHITE;

        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('clears to white by executing a clear command', function() {
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new ClearCommand();
        command.color = Color.WHITE;

        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('clears with a color mask', function() {
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new ClearCommand();
        command.color = Color.WHITE;
        command.renderState = context.createRenderState({
            colorMask : {
                red : true,
                green : false,
                blue : true,
                alpha : false
            }
        });

        command.execute(context);
        expect(context.readPixels()).toEqual([255, 0, 255, 0]);
    });

    it('clears with scissor test', function() {
        var command = new ClearCommand();
        command.color = Color.WHITE;

        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        command.color = Color.BLACK;
        command.renderState = context.createRenderState({
            scissorTest : {
                enabled : true,
                rectangle : new BoundingRectangle()
            }
        });

        command.execute(context);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        command.renderState = context.createRenderState({
            scissorTest : {
                enabled : true,
                rectangle : new BoundingRectangle(0, 0, 1, 1)
            }
        });

        command.execute(context);
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

        var command = new ClearCommand();
        command.color = new Color(0.0, 1.0, 0.0, 1.0);
        command.framebuffer = framebuffer;

        command.execute(context);

        expect(context.readPixels({
            framebuffer : framebuffer
        })).toEqual([0, 255, 0, 255]);

        framebuffer = framebuffer.destroy();
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