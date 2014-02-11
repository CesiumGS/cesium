/*global defineSuite */
defineSuite([
         'Core/combine'
     ], function(
         combine) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can combine shallow references', function() {
        var obj1 = {
            x : 1,
            y : 2,
            other : {
                value1 : 0
            }
        };
        var obj2 = {
            x : -1,
            z : 3,
            other : {
                value2 : 1
            }
        };
        var composite = combine(obj1, obj2);
        expect(composite).toEqual({
            x : 1,
            y : 2,
            z : 3,
            other : {
                value1 : 0
            }
        });
    });

    it('can combine deep references', function() {
        var object1 = {
            one : 1,
            deep : {
                value1 : 10
            }
        };
        var object2 = {
            two : 2,
            deep : {
                value1 : 5,
                value2 : 11,
                sub : {
                    val : 'a'
                }
            }
        };

        var composite = combine(object1, object2, true);
        expect(composite).toEqual({
            one : 1,
            two : 2,
            deep : {
                value1 : 10,
                value2 : 11,
                sub : {
                    val : 'a'
                }
            }
        });
    });
});