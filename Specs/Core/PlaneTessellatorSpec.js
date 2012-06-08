/*global defineSuite*/
defineSuite(['Core/PlaneTessellator'], function(PlaneTessellator) {
    "use strict";
    /*global it,expect*/

    it('compute with default arguments', function() {
        var m = PlaneTessellator.compute();

        expect(m.indexLists[0].values.length).toEqual(2 * 3); // 2 triangles
    });

    it('compute with arguments', function() {
        var m = PlaneTessellator.compute({
            resolution : {
                x : 4,
                y : 3
            },
            onInterpolation : function(time) {
            }
        });

        expect(m.indexLists[0].values.length).toEqual(12 * 3); // 8 triangles
    });

    it('compute with onInterpolation callback', function() {
        var callbacks = [];

        PlaneTessellator.compute({
            resolution : {
                x : 2,
                y : 2
            },
            onInterpolation : function(time) {
                callbacks.push(time);
            }
        });

        expect(callbacks).toEqualArray([{
            x : 0.0,
            y : 0.0
        }, {
            x : 1.0,
            y : 0.0
        }, {
            x : 0.0,
            y : 1.0
        }, {
            x : 1.0,
            y : 1.0
        }]);
    });

    it('throws if resolution is less than 1', function() {
       expect(function() {
           PlaneTessellator.compute({
               resolution: {
                   x : 0.0,
                   y : 0.0
               }
           });
       }).toThrow();
    });
});