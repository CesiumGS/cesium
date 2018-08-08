defineSuite([
        'Core/CustomProjection',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math'
    ], function(
        CustomProjection,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        CesiumMath) {
    'use strict';

    it('construct0', function() {
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory');
        expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('construct1', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory', ellipsoid);
        expect(projection.ellipsoid).toEqual(ellipsoid);
    });

    it('project0', function() {
        var height = 10.0;
        var cartographic = new Cartographic(0.0, 0.0, height);
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory');
        return projection.readyPromise.then(function() {
            expect(projection.project(cartographic)).toEqual(new Cartesian3(0.0, 0.0, height));
        });
    });

    it('project1', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
        var expected = new Cartesian3(Math.PI * ellipsoid.radii.x, CesiumMath.PI_OVER_TWO * ellipsoid.radii.x, 0.0);
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory', ellipsoid);
        return projection.readyPromise.then(function() {
            expect(projection.project(cartographic)).toEqual(expected);
        });
    });

    it('project2', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
        var expected = new Cartesian3(-Math.PI * ellipsoid.radii.x, CesiumMath.PI_OVER_TWO * ellipsoid.radii.x, 0.0);
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory', ellipsoid);
        return projection.readyPromise.then(function() {
            expect(projection.project(cartographic)).toEqual(expected);
        });
    });

    it('project with result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
        var expected = new Cartesian3(Math.PI * ellipsoid.radii.x, CesiumMath.PI_OVER_TWO * ellipsoid.radii.x, 0.0);
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory', ellipsoid);
        return projection.readyPromise.then(function() {
            var result = new Cartesian3(0.0, 0.0, 0.0);
            var returnValue = projection.project(cartographic, result);
            expect(result).toBe(returnValue);
            expect(result).toEqual(expected);
        });
    });

    it('unproject', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory');
        return projection.readyPromise.then(function() {
            var projected = projection.project(cartographic);
            expect(Cartographic.equalsEpsilon(projection.unproject(projected), cartographic, CesiumMath.EPSILON10)).toBe(true);
        });
    });

    it('unproject with result parameter', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory');
        return projection.readyPromise.then(function() {
            var projected = projection.project(cartographic);
            var result = new Cartographic(0.0, 0.0, 0.0);
            var returnValue = projection.unproject(projected, result);
            expect(result).toBe(returnValue);
            expect(Cartographic.equalsEpsilon(result, cartographic, CesiumMath.EPSILON10)).toBe(true);
        });
    });

    it('project throws without cartesian', function() {
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory');
        return projection.readyPromise.then(function() {
            expect(function() {
                return projection.unproject();
            }).toThrowDeveloperError();
        });
    });

    it('throws when custom projection is not yet loaded', function() {
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory');
        expect(function() {
            var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
            projection.project(cartographic);
        }).toThrowDeveloperError();
    });
});
