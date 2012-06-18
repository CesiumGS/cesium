/*global defineSuite*/
defineSuite([
         'DynamicScene/CompositeDynamicObjectCollection',
         'DynamicScene/DynamicObjectCollection',
         'Core/JulianDate',
         'DynamicScene/DynamicObject',
         'DynamicScene/DynamicBillboard',
         'DynamicScene/DynamicPoint',
         'DynamicScene/DynamicPolyline',
         'DynamicScene/DynamicLabel',
         'Scene/HorizontalOrigin'
     ], function(
         CompositeDynamicObjectCollection,
         DynamicObjectCollection,
         JulianDate,
         DynamicObject,
         DynamicBillboard,
         DynamicPoint,
         DynamicPolyline,
         DynamicLabel,
         HorizontalOrigin) {
    "use strict";
    /*global it,expect*/

    //CZML_TODO Implement real tests

    it('applyChanges works with Existing buffers', function() {

        var dynamicObjectCollection1 = new DynamicObjectCollection();
        var dynamicObjectCollection2 = new DynamicObjectCollection();

        var czml1 = {
            'id' : 'testBillboard',
            'billboard' : {
                'show' : true,
                'horizontalOrigin' : 'CENTER',
            }
        };
        dynamicObjectCollection1.processCzml(czml1);

        var czml2 = {
            'id' : 'testBillboard',
            'billboard' : {
                'rotation' : 2.0,
                'scale' : 3.0,
            }
        };
        dynamicObjectCollection2.processCzml(czml2);

        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection();
        compositeDynamicObjectCollection.addCollection(dynamicObjectCollection1);
        compositeDynamicObjectCollection.addCollection(dynamicObjectCollection2);
        compositeDynamicObjectCollection.applyChanges();

        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.horizontalOrigin.getValue(new JulianDate())).toEqual(HorizontalOrigin.CENTER);
    });

    it('Data updates as underlying buffers update', function() {
        var dynamicObjectCollection1 = new DynamicObjectCollection();
        var dynamicObjectCollection2 = new DynamicObjectCollection();

        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection();
        compositeDynamicObjectCollection.addCollection(dynamicObjectCollection1);
        compositeDynamicObjectCollection.addCollection(dynamicObjectCollection2);
        compositeDynamicObjectCollection.applyChanges();

        var czml1 = {
            'id' : 'testBillboard',
            'billboard' : {
                'show' : true,
                'horizontalOrigin' : 'CENTER',
            }
        };
        dynamicObjectCollection1.processCzml(czml1);

        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale).toEqual(undefined);
        expect(object.billboard.horizontalOrigin.getValue(new JulianDate())).toEqual(HorizontalOrigin.CENTER);

        var czml2 = {
            'id' : 'testBillboard',
            'billboard' : {
                'horizontalOrigin' : 'TOP',
                'scale' : 3.0,
            }
        };
        dynamicObjectCollection2.processCzml(czml2);

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
