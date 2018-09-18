defineSuite([
        'Core/SerializedMapProjection',
        'Core/CustomProjection',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/Proj4Projection',
        'Core/WebMercatorProjection',
        'ThirdParty/when',
        '../../../ThirdParty/proj4js-2.5.0/proj4'
    ], function(
        SerializedMapProjection,
        CustomProjection,
        Ellipsoid,
        GeographicProjection,
        Proj4Projection,
        WebMercatorProjection,
        when,
        proj4) {
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
        var projection = new CustomProjection('Data/UserGeographic.txt', 'testProjection', Ellipsoid.UNIT_SPHERE);
        var serialized = new SerializedMapProjection(projection);

        return SerializedMapProjection.deserialize(serialized)
            .then(function(deserializedProjection) {
                expect(deserializedProjection instanceof CustomProjection).toBe(true);
                expect(projection.ellipsoid.equals(deserializedProjection.ellipsoid)).toBe(true);
                expect(deserializedProjection.projectionName).toEqual('testProjection');
                expect(deserializedProjection.url).toEqual(serialized.url);
            });
    });

    it('serializes and de-serializes Proj4Projection', function() {
        var proj4Uri = '../../../ThirdParty/proj4js-2.5.0/proj4.js';
        var projection = new Proj4Projection(proj4Uri, proj4, '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs', 0.5);
        var serialized = new SerializedMapProjection(projection);

        spyOn(SerializedMapProjection, '_getProj4').and.returnValue(when.resolve(proj4));

        return SerializedMapProjection.deserialize(serialized)
            .then(function(deserializedProjection) {
                expect(deserializedProjection instanceof Proj4Projection).toBe(true);
                expect(projection.ellipsoid.equals(deserializedProjection.ellipsoid)).toBe(true);
                expect(deserializedProjection.wellKnownText).toEqual(serialized.wellKnownText);
                expect(deserializedProjection.heightScale).toEqual(serialized.heightScale);
            });
    });

    it('throws an error for unrecognized serializations', function() {
        expect(function() {
            return SerializedMapProjection.deserialize({});
        }).toThrowError();
    });
});
