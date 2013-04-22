/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext'
     ], 'Renderer/ClearState', function(
         createContext,
         destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('creates with defaults', function() {
        var defaultCS = {
            scissorTest : {
                enabled : false,
                rectangle : {
                    x : 0,
                    y : 0,
                    width : 0,
                    height : 0
                }
            },
            colorMask : {
                red : true,
                green : true,
                blue : true,
                alpha : true
            },
            depthMask : true,
            stencilMask : ~0,
            dither : true,

            color : {
                red : 0.0,
                green : 0.0,
                blue : 0.0,
                alpha : 0.0
            },
            depth : 1,
            stencil : 0
        };

        var cs = context.createClearState();

        expect(cs.scissorTest.enabled).toEqual(defaultCS.scissorTest.enabled);
        expect(cs.scissorTest.rectangle.x).toEqual(defaultCS.scissorTest.rectangle.x);
        expect(cs.scissorTest.rectangle.y).toEqual(defaultCS.scissorTest.rectangle.y);
        expect(cs.scissorTest.rectangle.width).toEqual(defaultCS.scissorTest.rectangle.width);
        expect(cs.scissorTest.rectangle.height).toEqual(defaultCS.scissorTest.rectangle.height);
        expect(cs.colorMask.red).toEqual(defaultCS.colorMask.red);
        expect(cs.colorMask.green).toEqual(defaultCS.colorMask.green);
        expect(cs.colorMask.blue).toEqual(defaultCS.colorMask.blue);
        expect(cs.colorMask.alpha).toEqual(defaultCS.colorMask.alpha);
        expect(cs.depthMask).toEqual(defaultCS.depthMask);
        expect(cs.stencilMask).toEqual(defaultCS.stencilMask);
        expect(cs.dither).toEqual(defaultCS.dither);
        expect(cs.color.red).toEqual(defaultCS.color.red);
        expect(cs.color.green).toEqual(defaultCS.color.green);
        expect(cs.color.blue).toEqual(defaultCS.color.blue);
        expect(cs.color.alpha).toEqual(defaultCS.color.alpha);
        expect(cs.depth).toEqual(defaultCS.depth);
        expect(cs.stencil).toEqual(defaultCS.stencil);
    });

    it('creates with all clear states', function() {
        var c = {
            scissorTest : {
                enabled : true,
                rectangle : {
                    x : 1,
                    y : 1,
                    width : 2,
                    height : 2
                }
            },
            colorMask : {
                red : false,
                green : false,
                blue : false,
                alpha : false
            },
            depthMask : false,
            stencilMask : 0,
            dither : false,

            color : {
                red : 0.1,
                green : 0.2,
                blue : 0.3,
                alpha : 0.4
            },
            depth : 0,
            stencil : 1
        };

        var cs = context.createClearState(c);

        expect(cs.scissorTest.enabled).toEqual(c.scissorTest.enabled);
        expect(cs.scissorTest.rectangle.x).toEqual(c.scissorTest.rectangle.x);
        expect(cs.scissorTest.rectangle.y).toEqual(c.scissorTest.rectangle.y);
        expect(cs.scissorTest.rectangle.width).toEqual(c.scissorTest.rectangle.width);
        expect(cs.scissorTest.rectangle.height).toEqual(c.scissorTest.rectangle.height);
        expect(cs.colorMask.red).toEqual(c.colorMask.red);
        expect(cs.colorMask.green).toEqual(c.colorMask.green);
        expect(cs.colorMask.blue).toEqual(c.colorMask.blue);
        expect(cs.colorMask.alpha).toEqual(c.colorMask.alpha);
        expect(cs.depthMask).toEqual(c.depthMask);
        expect(cs.stencilMask).toEqual(c.stencilMask);
        expect(cs.dither).toEqual(c.dither);
        expect(cs.color.red).toEqual(c.color.red);
        expect(cs.color.green).toEqual(c.color.green);
        expect(cs.color.blue).toEqual(c.color.blue);
        expect(cs.color.alpha).toEqual(c.color.alpha);
        expect(cs.depth).toEqual(c.depth);
        expect(cs.stencil).toEqual(c.stencil);
    });

    it('creates with some clear states', function() {
        var c = {
            scissorTest : {
                enabled : true
            },
            dither : false
        };

        var cs = context.createClearState(c);
        expect(cs.scissorTest.enabled).toEqual(c.scissorTest.enabled);
        expect(cs.dither).toEqual(c.dither);

        var defaultCS = context.createClearState();
        expect(cs.scissorTest.rectangle.x).toEqual(defaultCS.scissorTest.rectangle.x);
        expect(cs.scissorTest.rectangle.y).toEqual(defaultCS.scissorTest.rectangle.y);
        expect(cs.scissorTest.rectangle.width).toEqual(defaultCS.scissorTest.rectangle.width);
        expect(cs.scissorTest.rectangle.height).toEqual(defaultCS.scissorTest.rectangle.height);
        expect(cs.colorMask.red).toEqual(defaultCS.colorMask.red);
        expect(cs.colorMask.green).toEqual(defaultCS.colorMask.green);
        expect(cs.colorMask.blue).toEqual(defaultCS.colorMask.blue);
        expect(cs.colorMask.alpha).toEqual(defaultCS.colorMask.alpha);
        expect(cs.depthMask).toEqual(defaultCS.depthMask);
        expect(cs.stencilMask).toEqual(defaultCS.stencilMask);
        expect(cs.color.red).toEqual(defaultCS.color.red);
        expect(cs.color.green).toEqual(defaultCS.color.green);
        expect(cs.color.blue).toEqual(defaultCS.color.blue);
        expect(cs.color.alpha).toEqual(defaultCS.color.alpha);
        expect(cs.depth).toEqual(defaultCS.depth);
        expect(cs.stencil).toEqual(defaultCS.stencil);
    });

    it('fails to create (negative scissorTest.rectangle.width)', function() {
        expect(function() {
            context.createClearState({
                scissorTest : {
                    rectangle : {
                        x : 0,
                        y : 0,
                        width : -1,
                        height : 0
                    }
                }
            });
        }).toThrow();
    });

    it('fails to create (negative scissorTest.rectangle.height)', function() {
        expect(function() {
            context.createClearState({
                scissorTest : {
                    rectangle : {
                        x : 0,
                        y : 0,
                        width : 0,
                        height : -1
                    }
                }
            });
        }).toThrow();
    });
}, 'WebGL');