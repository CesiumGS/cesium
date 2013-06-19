/*global defineSuite*/
defineSuite(['DynamicScene/GeoJsonDataSource',
             'DynamicScene/DynamicObjectCollection',
             'Core/Cartographic',
             'Core/Ellipsoid',
             'Core/Event'
            ], function(
                    GeoJsonDataSource,
                    DynamicObjectCollection,
                    Cartographic,
                    Ellipsoid,
                    Event) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var properties = {
        testProperty : 1
    };

    var pointCoordinates = [102.0, 0.5];
    var pointCoordinatesCartesian = Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(pointCoordinates[0], pointCoordinates[1]));

    var pointFeature = {
        type : "Feature",
        geometry : {
            type : "Point",
            coordinates : pointCoordinates
        },
        properties : properties
    };

    var featureUndefinedProperties = {
        type : "Feature",
        geometry : {
            type : "Point",
            coordinates : pointCoordinates
        }
    };

    var featureUndefinedGeometry = {
        type : "Feature",
        properties : properties
    };

    var featureNullGeometry = {
        type : "Feature",
        geometry : null,
        properties : properties
    };

    var featureUnknownGeometry = {
        type : "Feature",
        geometry : {
            type : "Singularity",
            coordinates : pointCoordinates
        },
        properties : properties
    };

    it('default constructor has expected values', function() {
        var dataSource = new GeoJsonDataSource();
        expect(dataSource.getChangedEvent()).toBeInstanceOf(Event);
        expect(dataSource.getErrorEvent()).toBeInstanceOf(Event);
        expect(dataSource.getClock()).toBeUndefined();
        expect(dataSource.getDynamicObjectCollection()).toBeInstanceOf(DynamicObjectCollection);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(0);
        expect(dataSource.getIsTimeVarying()).toEqual(false);
    });

    it('Works with null geomtry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureNullGeometry);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var pointObject = dynamicObjectCollection.getObjects()[0];
            expect(pointObject.geoJson).toBe(featureNullGeometry);
            expect(pointObject.position).toBeUndefined();
        });
    });

    it('Works with point geomtry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(pointFeature);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var pointObject = dynamicObjectCollection.getObjects()[0];
            expect(pointObject.geoJson).toBe(pointFeature);
            expect(pointObject.position).toBeDefined();
            expect(pointObject.position.getValueCartesian()).toEqual(pointCoordinatesCartesian);
            expect(pointObject.point).toBeDefined();
        });
    });

    it('Fails when encountering unknown geomtry', function() {
        var dataSource = new GeoJsonDataSource();

        var failed = false;
        dataSource.load(featureUnknownGeometry).then(undefined, function(e) {
            failed = true;
        });

        waitsFor(function() {
            return failed;
        });
    });

    it('Fails with undefined properties', function() {
        var dataSource = new GeoJsonDataSource();

        var failed = false;
        dataSource.load(featureUndefinedProperties).then(undefined, function(e) {
            failed = true;
        });

        waitsFor(function() {
            return failed;
        });
    });

    it('Fails with undefined geomeetry', function() {
        var dataSource = new GeoJsonDataSource();

        var failed = false;
        dataSource.load(featureUndefinedGeometry).then(undefined, function(e) {
            failed = true;
        });

        waitsFor(function() {
            return failed;
        });
    });

    it('load throws with undefined geojson', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrow();
    });

    it('loadUrl throws with undefined Url', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.loadUrl(undefined);
        }).toThrow();
    });
});
