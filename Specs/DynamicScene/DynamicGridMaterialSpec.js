/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicGridMaterial',
             'Core/Color',
             'Core/JulianDate',
             'Scene/Material',
             'Specs/createContext',
             'Specs/destroyContext'
         ], function(
             DynamicGridMaterial,
             Color,
             JulianDate,
             Material,
             createContext,
             destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    var color = new Color(0.25, 0.5, 0.75, 1);

    var gridCzml = {
        grid : {
            color : {
                rgbaf : [color.red, color.green, color.blue, color.alpha]
            },
            cellAlpha : 0.5,
            rowCount : 20,
            columnCount : 10,
            rowThickness : 2,
            columnThickness : 5
        }
    };

    it('isMaterial works.', function() {
        var grid = new DynamicGridMaterial();
        expect(grid.isMaterial(gridCzml)).toBe(true);
        expect(grid.isMaterial({})).toBe(false);
    });

    it('assigns properties from CZML.', function() {
        var grid = new DynamicGridMaterial();
        grid.processCzmlIntervals(gridCzml);

        var material = grid.getValue(new JulianDate(), context);
        expect(material.uniforms.color).toEqual(color);
        expect(material.uniforms.cellAlpha).toEqual(gridCzml.grid.cellAlpha);
        expect(material.uniforms.lineCount.x).toEqual(gridCzml.grid.rowCount);
        expect(material.uniforms.lineCount.y).toEqual(gridCzml.grid.columnCount);
        expect(material.uniforms.lineThickness.x).toEqual(gridCzml.grid.rowThickness);
        expect(material.uniforms.lineThickness.y).toEqual(gridCzml.grid.columnThickness);
    });

    it('assigns properties from CZML with result parameter.', function() {
        var grid = new DynamicGridMaterial();
        grid.processCzmlIntervals(gridCzml);

        var existingMaterial = Material.fromType(context, Material.GridType);

        var material = grid.getValue(new JulianDate(), context, existingMaterial);
        expect(material).toBe(existingMaterial);
        expect(material.uniforms.color).toEqual(color);
        expect(material.uniforms.cellAlpha).toEqual(gridCzml.grid.cellAlpha);
        expect(material.uniforms.lineCount.x).toEqual(gridCzml.grid.rowCount);
        expect(material.uniforms.lineCount.y).toEqual(gridCzml.grid.columnCount);
        expect(material.uniforms.lineThickness.x).toEqual(gridCzml.grid.rowThickness);
        expect(material.uniforms.lineThickness.y).toEqual(gridCzml.grid.columnThickness);
    });

}, 'WebGL');
