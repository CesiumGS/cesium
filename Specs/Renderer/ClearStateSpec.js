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

        expect(cs.color.red).toEqual(defaultCS.color.red);
        expect(cs.color.green).toEqual(defaultCS.color.green);
        expect(cs.color.blue).toEqual(defaultCS.color.blue);
        expect(cs.color.alpha).toEqual(defaultCS.color.alpha);
        expect(cs.depth).toEqual(defaultCS.depth);
        expect(cs.stencil).toEqual(defaultCS.stencil);
    });

    it('creates with all clear states', function() {
        var c = {
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

        expect(cs.color.red).toEqual(c.color.red);
        expect(cs.color.green).toEqual(c.color.green);
        expect(cs.color.blue).toEqual(c.color.blue);
        expect(cs.color.alpha).toEqual(c.color.alpha);
        expect(cs.depth).toEqual(c.depth);
        expect(cs.stencil).toEqual(c.stencil);
    });
}, 'WebGL');