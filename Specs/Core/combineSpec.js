/*global defineSuite */
defineSuite([
         'Core/combine'
     ], function(
         combine) {
    "use strict";
    /*global it,expect*/

    it('combine throws with duplicate member', function() {
        expect(function() {
            combine({
                x : 1,
                y : 2
            },
            {
                x : 1
            });
        }).toThrow();
    });

    it('combine', function() {
        var obj1 = {
            x : 1,
            y : 2
        };
        var obj2 = {
            z : 3
        };
        var composite = combine(obj1, obj2);
        expect(composite).toEqual({x : 1, y : 2, z : 3});
    });
});