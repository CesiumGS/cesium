defineSuite([
        'Core/SerializedMapProjection',
        'Core/CustomProjection',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/Proj4Projection',
        'Core/WebMercatorProjection'
    ], function(
        SerializedMapProjection,
        CustomProjection,
        Ellipsoid,
        GeographicProjection,
        Proj4Projection,
        WebMercatorProjection) {
    'use strict';

    it('serializes and de-serializes WebMercatorProjection', function() {
        var projection = new WebMercatorProjection(Ellipsoid.UNIT_SPHERE);
        var serialized = new SerializedMapProjection(projection);

        return SerializedMapProjection.deserialize(serialized)
            .then(function(deserializedProjection) {
                expect(deserializedProjection instanceof WebMercatorProjection).toBe(true);
                expect(projection.ellipsoid.equals(deserializedProjection.ellipsoid)).toBe(true);
            });
    });

    it('serializes and de-serializes GeographicProjection', function() {
        var projection = new GeographicProjection(Ellipsoid.UNIT_SPHERE);
        var serialized = new SerializedMapProjection(projection);

        return SerializedMapProjection.deserialize(serialized)
            .then(function(deserializedProjection) {
                expect(deserializedProjection instanceof GeographicProjection).toBe(true);
                expect(projection.ellipsoid.equals(deserializedProjection.ellipsoid)).toBe(true);
            });
    });

    it('serializes and de-serializes CustomProjection', function() {
        var projection = new CustomProjection('Data/UserGeographic.txt', 'projectionFactory', Ellipsoid.UNIT_SPHERE);
        var serialized = new SerializedMapProjection(projection);

        return SerializedMapProjection.deserialize(serialized)
            .then(function(deserializedProjection) {
                expect(deserializedProjection instanceof CustomProjection).toBe(true);
                expect(projection.ellipsoid.equals(deserializedProjection.ellipsoid)).toBe(true);
                expect(deserializedProjection.functionName).toEqual('projectionFactory');
                expect(deserializedProjection.url).toEqual(serialized.url);
            });
    });

    it('serializes and de-serializes Proj4Projection', function() {
        var projection = new Proj4Projection('+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs');
        var serialized = new SerializedMapProjection(projection);

        return SerializedMapProjection.deserialize(serialized)
            .then(function(deserializedProjection) {
                expect(deserializedProjection instanceof Proj4Projection).toBe(true);
                expect(projection.ellipsoid.equals(deserializedProjection.ellipsoid)).toBe(true);
                expect(deserializedProjection.wellKnownText).toEqual(serialized.wellKnownText);
            });
    });

    it('throws an error for unrecognized serializations', function() {
        expect(function() {
            return SerializedMapProjection.deserialize({});
        }).toThrowError();
    });
});
