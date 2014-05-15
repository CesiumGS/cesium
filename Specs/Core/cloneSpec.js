/*global defineSuite*/
defineSuite([
        'Core/clone'
    ], function(
        clone) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can make shallow clones', function() {
        var obj = {
            a : 1,
            b : 's',
            c : {
                d : 0
            }
        };

        var clonedObj = clone(obj);
        expect(clonedObj).not.toBe(obj);
        expect(clonedObj.a).toEqual(obj.a);
        expect(clonedObj.b).toEqual(obj.b);
        expect(clonedObj.c).toBe(obj.c);
        expect(clonedObj.c.d).toEqual(obj.c.d);
    });

    it('can make deep clones', function() {
        var obj = {
            a : 1,
            b : 's',
            c : {
                d : 0,
                e : {
                    f : {
                        g : 1
                    }
                }
            }
        };

        var clonedObj = clone(obj, true);
        expect(clonedObj).not.toBe(obj);
        expect(clonedObj.a).toEqual(obj.a);
        expect(clonedObj.b).toEqual(obj.b);
        expect(clonedObj.c).not.toBe(obj.c);
        expect(clonedObj.c.d).toEqual(obj.c.d);
        expect(clonedObj.c.e).not.toBe(obj.c.e);
        expect(clonedObj.c.e.f).not.toBe(obj.c.e.f);
        expect(clonedObj.c.e.f.g).toEqual(obj.c.e.f.g);
    });
});