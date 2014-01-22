/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Renderer/RenderbufferFormat'
     ], 'Renderer/Renderbuffer', function(
         createContext,
         destroyContext,
         RenderbufferFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var renderbuffer;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        renderbuffer = renderbuffer && renderbuffer.destroy();
    });

    it('creates', function() {
        renderbuffer = context.createRenderbuffer({
            format : RenderbufferFormat.DEPTH_COMPONENT16,
            width : 64,
            height : 32
        });

        expect(renderbuffer.getFormat()).toEqual(RenderbufferFormat.DEPTH_COMPONENT16);
        expect(renderbuffer.getWidth()).toEqual(64);
        expect(renderbuffer.getHeight()).toEqual(32);
    });

    it('creates with defaults', function() {
        renderbuffer = context.createRenderbuffer();

        expect(renderbuffer.getFormat()).toEqual(RenderbufferFormat.RGBA4);
        expect(renderbuffer.getWidth()).toEqual(context.getCanvas().clientWidth);
        expect(renderbuffer.getHeight()).toEqual(context.getCanvas().clientHeight);
    });

    it('destroys', function() {
        var r = context.createRenderbuffer();
        expect(r.isDestroyed()).toEqual(false);
        r.destroy();
        expect(r.isDestroyed()).toEqual(true);
    });

    it('fails to create (format)', function() {
        expect(function() {
            renderbuffer = context.createRenderbuffer({
                format : 'invalid format'
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (small width)', function() {
        expect(function() {
            renderbuffer = context.createRenderbuffer({
                width : 0
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (large width)', function() {
        expect(function() {
            renderbuffer = context.createRenderbuffer({
                width : context.getMaximumRenderbufferSize() + 1
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (small height)', function() {
        expect(function() {
            renderbuffer = context.createRenderbuffer({
                height : 0
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (large height)', function() {
        expect(function() {
            renderbuffer = context.createRenderbuffer({
                height : context.getMaximumRenderbufferSize() + 1
            });
        }).toThrowDeveloperError();
    });

    it('fails to destroy', function() {
        var r = context.createRenderbuffer();
        r.destroy();

        expect(function() {
            r.destroy();
        }).toThrow();
    });
}, 'WebGL');