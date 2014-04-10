/*global defineSuite*/
defineSuite([
         'Core/FanOutlineGeometry',
         'Core/Spherical',
         'Core/VertexFormat',
         'Core/Cartesian3'
     ], function(
         FanOutlineGeometry,
         Spherical,
         VertexFormat,
         Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var directionData = [0, 1, 100, 0, 2, 200, 0, 3, 300];
    var directions = [];
    for (var i = 0; i < directionData.length; i += 2) {
        directions.push(new Spherical(directionData[i], directionData[i + 1], directionData[i + 2]));
    }

    it('constructor throws without directions', function() {
        expect(function() {
            return new FanOutlineGeometry({
                vertexFormat : VertexFormat.DEFAULT,
                directions : undefined,
                radius : 10000
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws without radius', function() {
        expect(function() {
            return new FanOutlineGeometry({
                vertexFormat : VertexFormat.DEFAULT,
                directions : directions,
                radius : undefined
            });
        }).toThrowDeveloperError();
    });

    it('constructor computes all vertex attributes with constant radius', function() {
        var numberOfRings = 1;
        var m = FanOutlineGeometry.createGeometry(new FanOutlineGeometry({
            vertexFormat : VertexFormat.ALL,
            directions : directions,
            radius : 10000,
            numberOfRings: numberOfRings
        }));

        var directionsLength = directions.length;
        expect(m.attributes.position.values.length).toEqual(directionsLength * 3 * numberOfRings);
        expect(m.indices.length).toEqual(directionsLength * 2 * numberOfRings);

        expect(m.boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(m.boundingSphere.radius).toEqual(10000);
    });


    it('constructor computes all vertex attributes with perDirectionRadius', function() {
        var numberOfRings = 1;
        var m = FanOutlineGeometry.createGeometry(new FanOutlineGeometry({
            vertexFormat : VertexFormat.ALL,
            directions : directions,
            perDirectionRadius  : true,
            numberOfRings: numberOfRings
        }));

        var directionsLength = directions.length;
        expect(m.attributes.position.values.length).toEqual(directionsLength * 3 * numberOfRings);
        expect(m.indices.length).toEqual(directionsLength * 2 * numberOfRings);

        expect(m.boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(m.boundingSphere.radius).toEqual(300);
    });
});
