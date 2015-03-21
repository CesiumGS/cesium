/*global defineSuite*/
defineSuite([
        'Renderer/RenderbufferFormat',
        'Specs/createContext'
    ], 'Renderer/Renderbuffer', function(
        RenderbufferFormat,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;
    var renderbuffer;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
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

        expect(renderbuffer.format).toEqual(RenderbufferFormat.DEPTH_COMPONENT16);
        expect(renderbuffer.width).toEqual(64);
        expect(renderbuffer.height).toEqual(32);
    });

    it('creates with defaults', function() {
        renderbuffer = context.createRenderbuffer();

        expect(renderbuffer.format).toEqual(RenderbufferFormat.RGBA4);
        expect(renderbuffer.width).toEqual(context.canvas.clientWidth);
        expect(renderbuffer.height).toEqual(context.canvas.clientHeight);
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
                width : context.maximumRenderbufferSize + 1
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
                height : context.maximumRenderbufferSize + 1
            });
        }).toThrowDeveloperError();
    });

    it('fails to destroy', function() {
        var r = context.createRenderbuffer();
        r.destroy();

        expect(function() {
            r.destroy();
        }).toThrowDeveloperError();
    });
}, 'WebGL');