/*global defineSuite*/
defineSuite([
         'Core/BoxTessellator',
         'Core/Cartesian3'
     ], function(
         BoxTessellator,
         Cartesian3) {
    "use strict";
    /*global it,expect*/

    it('compute0', function() {
        expect(function() {
            return BoxTessellator.compute({
                dimensions : new Cartesian3(1, 2, -1)
            });
        }).toThrow();
    });

    it('compute1', function() {
        var m = BoxTessellator.compute({
            dimensions : new Cartesian3(1, 2, 3)
        });

        expect(m.attributes.position.values.length).toEqual(8 * 3);
        expect(m.indexLists[0].values.length).toEqual(12 * 3);
    });

    it('compute2', function() {
        expect(function() {
            return BoxTessellator.compute({
                minimumCorner : new Cartesian3(0, 0, 0),
                maximumCorner : new Cartesian3(1, 1, 1)
            });
        }).not.toThrow();
    });
});