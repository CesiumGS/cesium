/*global defineSuite*/
defineSuite([
         'DynamicScene/CompositeDynamicObjectCollection',
         'DynamicScene/DynamicObjectCollection',
         'Core/JulianDate',
         'Core/Iso8601',
         'Core/TimeInterval',
         'DynamicScene/processCzml',
         'DynamicScene/CzmlDefaults',
         'Scene/HorizontalOrigin'
     ], function(
         CompositeDynamicObjectCollection,
         DynamicObjectCollection,
         JulianDate,
         Iso8601,
         TimeInterval,
         processCzml,
         CzmlDefaults,
         HorizontalOrigin) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var czml1 = {
        'id' : 'testBillboard',
        'billboard' : {
            'show' : true,
            'horizontalOrigin' : 'CENTER'
        }
    };

    var czml2 = {
        'id' : 'testBillboard',
        'billboard' : {
            'rotation' : 2.0,
            'scale' : 3.0
        }
    };

    it('default constructor sets expected properties.', function() {
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection();
        expect(compositeDynamicObjectCollection.mergeFunctions).toEqual(CzmlDefaults.mergers);
        expect(compositeDynamicObjectCollection.cleanFunctions).toEqual(CzmlDefaults.cleaners);
        expect(compositeDynamicObjectCollection.getCollections().length).toEqual(0);
        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(0);
    });

    it('constructor sets expected properties from parameters.', function() {
        var collections = [new DynamicObjectCollection()];
        collections[0].getOrCreateObject('bob');
        var mergers = [];
        var cleaners = [];
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection(collections, mergers, cleaners);
        expect(compositeDynamicObjectCollection.mergeFunctions).toEqual(mergers);
        expect(compositeDynamicObjectCollection.cleanFunctions).toEqual(cleaners);
        expect(compositeDynamicObjectCollection.getCollections().length).toEqual(1);
        expect(compositeDynamicObjectCollection.getCollections()[0]).toEqual(collections[0]);
        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);
    });

    it('clear removes objects and collections.', function() {
        var collections = [new DynamicObjectCollection()];
        collections[0].getOrCreateObject('bob');
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection(collections);
        compositeDynamicObjectCollection.clear();

        expect(compositeDynamicObjectCollection.getCollections().length).toEqual(0);
        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(0);
    });

    it('throws if calling getObject without an id.', function() {
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection();
        expect(function() {
            compositeDynamicObjectCollection.getObject();
        }).toThrow();
    });

    it('computeAvailability returns infinite with no data.', function() {
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection();
        var availability = compositeDynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersction of collections.', function() {
        var collection1 = new DynamicObjectCollection();
        var dynamicObject = collection1.getOrCreateObject('1');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('2012-08-01/2012-08-02'));
        dynamicObject = collection1.getOrCreateObject('2');

        var collection2 = new DynamicObjectCollection();
        dynamicObject = collection2.getOrCreateObject('3');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('2012-08-05/2012-08-06'));

        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection([collection1, collection2]);

        var availability = compositeDynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('computeAvailability works if only start or stop time is infinite.', function() {
        var collection1 = new DynamicObjectCollection();
        var dynamicObject = collection1.getOrCreateObject('1');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('2012-08-01/9999-12-31T24:00:00Z'));
        dynamicObject = collection1.getOrCreateObject('2');

        var collection2 = new DynamicObjectCollection();
        dynamicObject = collection2.getOrCreateObject('3');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('0000-01-01T00:00:00Z/2012-08-06'));

        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection([collection1, collection2]);

        var availability = compositeDynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('setCollections works with existing dynamicObjectCollections', function() {
        var dynamicObjectCollection1 = new DynamicObjectCollection();
        processCzml(czml1, dynamicObjectCollection1);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        processCzml(czml2, dynamicObjectCollection2);

        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection();
        compositeDynamicObjectCollection.setCollections([dynamicObjectCollection1, dynamicObjectCollection2]);

        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.horizontalOrigin.getValue(new JulianDate())).toEqual(HorizontalOrigin.CENTER);
    });

    it('Constructing with existing dynamicObjectCollections merges expected objects', function() {
        var dynamicObjectCollection1 = new DynamicObjectCollection();
        processCzml(czml1, dynamicObjectCollection1);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        processCzml(czml2, dynamicObjectCollection2);

        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection([dynamicObjectCollection1, dynamicObjectCollection2]);

        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.horizontalOrigin.getValue(new JulianDate())).toEqual(HorizontalOrigin.CENTER);
    });

    it('Data updates as underlying dynamicObjectCollections update', function() {
        var dynamicObjectCollection1 = new DynamicObjectCollection();
        var dynamicObjectCollection2 = new DynamicObjectCollection();

        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection();
        compositeDynamicObjectCollection.setCollections([dynamicObjectCollection1, dynamicObjectCollection2]);

        var czml3 = {
            'id' : 'testBillboard',
            'billboard' : {
                'show' : true,
                'horizontalOrigin' : 'CENTER'
            }
        };
        processCzml(czml3, dynamicObjectCollection1);

        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale).toEqual(undefined);
        expect(object.billboard.horizontalOrigin.getValue(new JulianDate())).toEqual(HorizontalOrigin.CENTER);

        var czml4 = {
            'id' : 'testBillboard',
            'billboard' : {
                'horizontalOrigin' : 'TOP',
                'scale' : 3.0
            }
        };
        processCzml(czml4, dynamicObjectCollection2);

        objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        object = objects[0];
        sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object === sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.horizontalOrigin.getValue(new JulianDate())).toEqual(HorizontalOrigin.TOP);
    });
});
