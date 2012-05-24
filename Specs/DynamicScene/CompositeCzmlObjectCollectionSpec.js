/*global defineSuite*/
defineSuite([
         'DynamicScene/CompositeCzmlObjectCollection',
         'DynamicScene/CzmlObjectCollection',
         'Core/JulianDate',
         'DynamicScene/DynamicObject',
         'DynamicScene/DynamicBillboard',
         'DynamicScene/DynamicPoint',
         'DynamicScene/DynamicPolyline',
         'DynamicScene/DynamicLabel'
     ], function(
         CompositeCzmlObjectCollection,
         CzmlObjectCollection,
         JulianDate,
         DynamicObject,
         DynamicBillboard,
         DynamicPoint,
         DynamicPolyline,
         DynamicLabel) {
    "use strict";
    /*global it,expect*/

    it("applyChanges works with Existing buffers", function() {
        var czmlObjectCollection1 = new CzmlObjectCollection("1", "1", {
            billboard : DynamicBillboard.createOrUpdate,
            label : DynamicLabel.createOrUpdate,
            orientation : DynamicObject.createOrUpdateOrientation,
            point : DynamicPoint.createOrUpdate,
            polyline : DynamicPolyline.createOrUpdate,
            position : DynamicObject.createOrUpdatePosition,
            vertexPositions : DynamicObject.createOrUpdateVertexPositions
        });

        var czmlObjectCollection2 = new CzmlObjectCollection("1", "1", {
            billboard : DynamicBillboard.createOrUpdate,
            label : DynamicLabel.createOrUpdate,
            orientation : DynamicObject.createOrUpdateOrientation,
            point : DynamicPoint.createOrUpdate,
            polyline : DynamicPolyline.createOrUpdate,
            position : DynamicObject.createOrUpdatePosition,
            vertexPositions : DynamicObject.createOrUpdateVertexPositions
        });

        var czml1 = {
            "id":"testBillboard",
            "billboard" : {
                "show" : true,
                "rotation" : 0.0,
            }
        };
        czmlObjectCollection1.processCzml(czml1);

        var czml2 = {
                "id":"testBillboard",
                "billboard" : {
                    "rotation" : 2.0,
                    "scale" : 3.0,
                }
            };
        czmlObjectCollection2.processCzml(czml2);

        var mergeFuncs = [DynamicBillboard.mergeProperties];
        var deleteFuncs = [DynamicBillboard.deleteProperties];
        var compositeCzmlObjectCollection = new CompositeCzmlObjectCollection(mergeFuncs, deleteFuncs);
        compositeCzmlObjectCollection.addCollection(czmlObjectCollection1);
        compositeCzmlObjectCollection.addCollection(czmlObjectCollection2);
        compositeCzmlObjectCollection.applyChanges();

        var objects = compositeCzmlObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeCzmlObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(2.0);
    });

    it("Data updates as underlying buffers update", function() {
        var czmlObjectCollection1 = new CzmlObjectCollection("1", "1", {
            billboard : DynamicBillboard.createOrUpdate,
            label : DynamicLabel.createOrUpdate,
            orientation : DynamicObject.createOrUpdateOrientation,
            point : DynamicPoint.createOrUpdate,
            polyline : DynamicPolyline.createOrUpdate,
            position : DynamicObject.createOrUpdatePosition,
            vertexPositions : DynamicObject.createOrUpdateVertexPositions
        });

        var czmlObjectCollection2 = new CzmlObjectCollection("1", "1", {
            billboard : DynamicBillboard.createOrUpdate,
            label : DynamicLabel.createOrUpdate,
            orientation : DynamicObject.createOrUpdateOrientation,
            point : DynamicPoint.createOrUpdate,
            polyline : DynamicPolyline.createOrUpdate,
            position : DynamicObject.createOrUpdatePosition,
            vertexPositions : DynamicObject.createOrUpdateVertexPositions
        });

        var mergeFuncs = [DynamicBillboard.mergeProperties];
        var deleteFuncs = [DynamicBillboard.deleteProperties];
        var compositeCzmlObjectCollection = new CompositeCzmlObjectCollection(mergeFuncs, deleteFuncs);
        compositeCzmlObjectCollection.addCollection(czmlObjectCollection1);
        compositeCzmlObjectCollection.addCollection(czmlObjectCollection2);
        compositeCzmlObjectCollection.applyChanges();

        var czml1 = {
            "id":"testBillboard",
            "billboard" : {
                "show" : true,
                "rotation" : 0.0,
            }
        };
        czmlObjectCollection1.processCzml(czml1);

        var objects = compositeCzmlObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        var object = objects[0];
        var sameObject = compositeCzmlObjectCollection.getObject(object.id);
        expect(object).toEqual(sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale).toEqual(undefined);
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(0.0);

        var czml2 = {
                "id":"testBillboard",
                "billboard" : {
                    "rotation" : 2.0,
                    "scale" : 3.0,
                }
            };
        czmlObjectCollection2.processCzml(czml2);

        objects = compositeCzmlObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        object = objects[0];
        sameObject = compositeCzmlObjectCollection.getObject(object.id);
        expect(object === sameObject);

        expect(object.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(object.billboard.scale.getValue(new JulianDate())).toEqual(3.0);
        expect(object.billboard.rotation.getValue(new JulianDate())).toEqual(2.0);
    });
});
