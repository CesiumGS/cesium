/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicObjectCollection',
         'Core/JulianDate',
         'DynamicScene/DynamicObject',
         'DynamicScene/DynamicBillboard',
         'DynamicScene/DynamicPoint',
         'DynamicScene/DynamicPolyline',
         'DynamicScene/DynamicLabel'
     ], function(
         DynamicObjectCollection,
         JulianDate,
         DynamicObject,
         DynamicBillboard,
         DynamicPoint,
         DynamicPolyline,
         DynamicLabel) {
    "use strict";
    /*global it,expect*/

    it("TODO", function() {
        var czmlObjectCollection = new DynamicObjectCollection({
            billboard : DynamicBillboard.createOrUpdate,
            label : DynamicLabel.createOrUpdate,
            orientation : DynamicObject.createOrUpdateOrientation,
            point : DynamicPoint.createOrUpdate,
            polyline : DynamicPolyline.createOrUpdate,
            position : DynamicObject.createOrUpdatePosition,
            vertexPositions : DynamicObject.createOrUpdateVertexPositions
        });

        expect(typeof czmlObjectCollection.getObject("TestFacility") === 'undefined').toBeTruthy();

        var czml = {
            "billboard" : {
                "color" : {
                    "rgba" : [0, 255, 255, 255]
                },
                "horizontalOrigin" : "CENTER",
                "image" : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBhXY2DABv5DAVwOQwBZFwAeQg/xcPKgjwAAAABJRU5ErkJgggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
                "rotation" : 0.0,
                "scale" : 1.0,
                "show" : [{
                    "interval" : "2012-04-28T16:00:00Z/2012-04-28T16:02:00Z",
                    "boolean" : true
                }],
                "pixelOffset" : {
                    "cartesian" : [5.0, -4.0]
                },
                "verticalOrigin" : "CENTER"
            }
        };

        czmlObjectCollection.processCzml(czml);

        var testFacility = czmlObjectCollection.getObject(czml.id);
        expect(typeof testFacility !== undefined).toBeTruthy();
        expect(typeof testFacility.billboard !== undefined).toBeTruthy();
        expect(typeof testFacility.billboard.pixelOffset !== undefined).toBeTruthy();

        var pixelOffset = testFacility.billboard.pixelOffset.getValue(new JulianDate());
        expect(pixelOffset.x).toEqual(5.0);
        expect(pixelOffset.y).toEqual(-4.0);

        var scale = testFacility.billboard.scale.getValue(new JulianDate());
        expect(scale).toEqual(1.0);

        var rotation = testFacility.billboard.rotation.getValue(new JulianDate());
        expect(rotation).toEqual(0.0);
    });
});
