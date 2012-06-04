/*global defineSuite*/
defineSuite([
         'DynamicScene/CompositeDynamicObjectCollection',
         'DynamicScene/DynamicObjectCollection',
         'Core/JulianDate',
         'DynamicScene/DynamicObject',
         'DynamicScene/DynamicBillboard',
         'DynamicScene/DynamicPoint',
         'DynamicScene/DynamicPolyline',
         'DynamicScene/DynamicLabel'
     ], function(
         CompositeDynamicObjectCollection,
         DynamicObjectCollection,
         JulianDate,
         DynamicObject,
         DynamicBillboard,
         DynamicPoint,
         DynamicPolyline,
         DynamicLabel) {
    "use strict";
    /*global it,expect*/

    var updaters = {
        billboard : DynamicBillboard.createOrUpdate,
        label : DynamicLabel.createOrUpdate,
        orientation : DynamicObject.createOrUpdateOrientation,
        point : DynamicPoint.createOrUpdate,
        polyline : DynamicPolyline.createOrUpdate,
        position : DynamicObject.createOrUpdatePosition,
        vertexPositions : DynamicObject.createOrUpdateVertexPositions
    };

    it("applyChanges works with Existing buffers", function() {

        var czmlObjectCollection1 = new DynamicObjectCollection(updaters);
        var czmlObjectCollection2 = new DynamicObjectCollection(updaters);

        var czml1 = {
            "id" : "testBillboard",
            "billboard" : {
                "show" : true,
                "rotation" : 0.0,
            }
        };
        czmlObjectCollection1.processCzml(czml1);

        var czml2 = {
            "id" : "testBillboard",
            "billboard" : {
                "rotation" : 2.0,
                "scale" : 3.0,
            }
        };
        czmlObjectCollection2.processCzml(czml2);

        var mergeFuncs = [DynamicBillboard.mergeProperties];
        var deleteFuncs = [DynamicBillboard.deleteProperties];
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection(mergeFuncs, deleteFuncs);
        compositeDynamicObjectCollection.addCollection(czmlObjectCollection1);
        compositeDynamicObjectCollection.addCollection(czmlObjectCollection2);
        compositeDynamicObjectCollection.applyChanges();

        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(2.0);
    });

    it("Data updates as underlying buffers update", function() {
        var czmlObjectCollection1 = new DynamicObjectCollection(updaters);
        var czmlObjectCollection2 = new DynamicObjectCollection(updaters);

        var mergeFuncs = [DynamicBillboard.mergeProperties];
        var deleteFuncs = [DynamicBillboard.deleteProperties];
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection(mergeFuncs, deleteFuncs);
        compositeDynamicObjectCollection.addCollection(czmlObjectCollection1);
        compositeDynamicObjectCollection.addCollection(czmlObjectCollection2);
        compositeDynamicObjectCollection.applyChanges();

        var czml1 = {
            "id" : "testBillboard",
            "billboard" : {
                "show" : true,
                "rotation" : 0.0,
            }
        };
        czmlObjectCollection1.processCzml(czml1);

        var objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale).toEqual(undefined);
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(0.0);

        var czml2 = {
            "id" : "testBillboard",
            "billboard" : {
                "rotation" : 2.0,
                "scale" : 3.0,
            }
        };
        czmlObjectCollection2.processCzml(czml2);

        objects = compositeDynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        object = objects[0];
        sameObject = compositeDynamicObjectCollection.getObject(object.id);
        expect(object === sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(2.0);
    });
});
