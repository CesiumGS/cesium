/*global defineSuite*/
defineSuite([
         'Core/EllipsoidGeometry',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
         EllipsoidGeometry,
         Cartesian3,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('compute0', function() {
        expect(function() {
            return new EllipsoidGeometry({
                numberOfPartitions : -1
            });
        }).toThrow();
    });

    it('compute1', function() {
        var m = new EllipsoidGeometry({
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            numberOfPartitions : 1
        });

        expect(m.attributes.position.values.length).toEqual(3 * 8);
        expect(m.indexLists[0].values.length).toEqual(12 * 3);
        expect(m.boundingSphere.radius).toEqual(1);
    });

    it('compute2', function() {
        var m = new EllipsoidGeometry({
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            numberOfPartitions : 2
        });

        expect(m.attributes.position.values.length).toEqual(3 * (8 + 6 + 12));
        expect(m.indexLists[0].values.length).toEqual(2 * 3 * 4 * 6);
    });

    it('compute3', function() {
        var m = new EllipsoidGeometry({
            ellipsoid : Ellipsoid.UNIT_SPHERE,
            numberOfPartitions : 3
        });

        var position = m.attributes.position.values;
        for ( var i = 0; i < position.length; i += 3) {
            expect(1.0).toEqualEpsilon(new Cartesian3(position[i], position[i + 1], position[i + 2]).magnitude(), CesiumMath.EPSILON10);
        }
    });
});