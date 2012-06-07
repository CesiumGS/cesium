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
        billboard : DynamicBillboard.processCzmlPacket,
        label : DynamicLabel.processCzmlPacket,
        orientation : DynamicObject.processCzmlPacketOrientation,
        point : DynamicPoint.processCzmlPacket,
        polyline : DynamicPolyline.processCzmlPacket,
        position : DynamicObject.processCzmlPacketPosition,
        vertexPositions : DynamicObject.processCzmlPacketVertexPositions
    };

    it("applyChanges works with Existing buffers", function() {

        var dynamicObjectCollection1 = new DynamicObjectCollection(updaters);
        var dynamicObjectCollection2 = new DynamicObjectCollection(updaters);

        var czml1 = {
            "id" : "testBillboard",
            "billboard" : {
                "show" : true,
                "rotation" : 0.0,
            }
        };
        dynamicObjectCollection1.processCzml(czml1);

        var czml2 = {
            "id" : "testBillboard",
            "billboard" : {
                "rotation" : 2.0,
                "scale" : 3.0,
            }
        };
        dynamicObjectCollection2.processCzml(czml2);

        var mergeFuncs = [DynamicBillboard.mergeProperties];
        var deleteFuncs = [DynamicBillboard.undefineProperties];
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection(mergeFuncs, deleteFuncs);
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
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(2.0);
    });

    it("Data updates as underlying buffers update", function() {
        var dynamicObjectCollection1 = new DynamicObjectCollection(updaters);
        var dynamicObjectCollection2 = new DynamicObjectCollection(updaters);

        var mergeFuncs = [DynamicBillboard.mergeProperties];
        var deleteFuncs = [DynamicBillboard.undefineProperties];
        var compositeDynamicObjectCollection = new CompositeDynamicObjectCollection(mergeFuncs, deleteFuncs);
        compositeDynamicObjectCollection.addCollection(dynamicObjectCollection1);
        compositeDynamicObjectCollection.addCollection(dynamicObjectCollection2);
        compositeDynamicObjectCollection.applyChanges();

        var czml1 = {
            "id" : "testBillboard",
            "billboard" : {
                "show" : true,
                "rotation" : 0.0,
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
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(0.0);

        var czml2 = {
            "id" : "testBillboard",
            "billboard" : {
                "rotation" : 2.0,
                "scale" : 3.0,
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
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(2.0);
    });
});
