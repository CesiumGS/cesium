defineSuite([
        'Core/CylinderOutlineGeometry',
        'Core/arrayFill',
        'Core/GeometryOffsetAttribute',
        'Specs/createPackableSpecs'
    ], function(
        CylinderOutlineGeometry,
        arrayFill,
        GeometryOffsetAttribute,
        createPackableSpecs) {
    'use strict';

    it('constructor throws with no length', function() {
        expect(function() {
            return new CylinderOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('constructor throws with no topRadius', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with no bottomRadius', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: 1
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if slices is less than 3', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: 1,
                bottomRadius: 1,
                slices: 2
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if width is less than 1', function() {
        expect(function() {
            return new CylinderOutlineGeometry({
                length: 1,
                topRadius: 1,
                bottomRadius: 1,
                slices: 3,
                width : -1.0
            });
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var m = CylinderOutlineGeometry.createGeometry(new CylinderOutlineGeometry({
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('computes offset attribute', function() {
        var m = CylinderOutlineGeometry.createGeometry(new CylinderOutlineGeometry({
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3,
            offsetAttribute: GeometryOffsetAttribute.ALL
        }));

        var numVertices = m.attributes.position.values.length / 3;
        expect(numVertices).toBeGreaterThan(0);

        var offset = m.attributes.applyOffset.values;
        expect(offset.length).toEqual(numVertices);
        var expected = new Array(offset.length);
        expected = arrayFill(expected, 1);
        expect(offset).toEqual(expected);
    });

    it('computes positions with no lines along the length', function() {
        var m = CylinderOutlineGeometry.createGeometry(new CylinderOutlineGeometry({
            length: 1,
            topRadius: 1,
            bottomRadius: 1,
            slices: 3,
            numberOfVerticalLines: 0
        }));

        expect(m.attributes.position.values.length).toBeGreaterThan(0);
        expect(m.indices.length).toBeGreaterThan(0);
    });

    it('undefined is returned if the length is less than or equal to zero or if both radii are equal to zero or is either radii and less than zero', function() {
        var cylinderOutline0 = new CylinderOutlineGeometry({
            length: 0,
            topRadius: 80000,
            bottomRadius: 200000
        });
        var cylinderOutline1 = new CylinderOutlineGeometry({
            length: 200000,
            topRadius: 0,
            bottomRadius: 0
        });
        var cylinderOutline2 = new CylinderOutlineGeometry({
            length: 200000,
            topRadius: -10,
            bottomRadius: 4
        });
        var cylinderOutline3 = new CylinderOutlineGeometry({
            length: -200000,
            topRadius: 100,
            bottomRadius: 100
        });
        var cylinderOutline4 = new CylinderOutlineGeometry({
            length: 200000,
            topRadius: 32,
            bottomRadius: -100
        });

        var geometry0 = CylinderOutlineGeometry.createGeometry(cylinderOutline0);
        var geometry1 = CylinderOutlineGeometry.createGeometry(cylinderOutline1);
        var geometry2 = CylinderOutlineGeometry.createGeometry(cylinderOutline2);
        var geometry3 = CylinderOutlineGeometry.createGeometry(cylinderOutline3);
        var geometry4 = CylinderOutlineGeometry.createGeometry(cylinderOutline4);

        expect(geometry0).toBeUndefined();
        expect(geometry1).toBeUndefined();
        expect(geometry2).toBeUndefined();
        expect(geometry3).toBeUndefined();
        expect(geometry4).toBeUndefined();
    });

    var cylinder = new CylinderOutlineGeometry({
        length : 1,
        topRadius : 1,
        bottomRadius : 0,
        slices : 3,
        numberOfVerticalLines : 0,
        width : 5.0
    });
    var packedInstance = [1.0, 1.0, 0.0, 3.0, 0.0, -1.0, 5.0];
    createPackableSpecs(CylinderOutlineGeometry, cylinder, packedInstance);
});
