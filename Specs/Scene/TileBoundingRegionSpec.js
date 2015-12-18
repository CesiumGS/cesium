/*global defineSuite*/
defineSuite([
        'Scene/TileBoundingRegion',
        'Core/Color',
        'Core/Rectangle',
        'Scene/Cesium3DTile',
        'Specs/createScene'
    ], function(
        TileBoundingRegion,
        Color,
        Rectangle,
        Cesium3DTile,
        createScene) {
    "use strict";

    var boundingVolumeRegion = [-1.0, -1.0, 0.0, 0.0, 0, 1];
    var regionBox = boundingVolumeRegion.slice(0, 4);
    var rectangle = new Rectangle(regionBox[0], regionBox[1], regionBox[2], regionBox[3]);

    it('can be instantiated with rectangle and heights', function() {
        var minimumHeight = boundingVolumeRegion[4];
        var maximumHeight = boundingVolumeRegion[5];
        var tileBoundingRegion = new TileBoundingRegion({maximumHeight: maximumHeight, minimumHeight: minimumHeight, rectangle: rectangle});
        expect(tileBoundingRegion).toBeDefined();
        expect(tileBoundingRegion.boundingVolume).toBeDefined();
        expect(tileBoundingRegion.rectangle).toEqual(rectangle);
        expect(tileBoundingRegion.minimumHeight).toEqual(minimumHeight);
        expect(tileBoundingRegion.maximumHeight).toEqual(maximumHeight);
    });

    it('can be instantiated with only a rectangle', function() {
        var tileBoundingRegion = new TileBoundingRegion({rectangle: rectangle});
        expect(tileBoundingRegion).toBeDefined();
        expect(tileBoundingRegion.boundingVolume).toBeDefined();
        expect(tileBoundingRegion.rectangle).toEqual(rectangle);
        expect(tileBoundingRegion.minimumHeight).toBeDefined();
        expect(tileBoundingRegion.maximumHeight).toBeDefined();
    });

    it('can create a debug volume', function() {
        var tileBoundingRegion = new TileBoundingRegion({rectangle: rectangle});
        var debugVolume = tileBoundingRegion.createDebugVolume(Color.BLUE);
        expect(debugVolume).toBeDefined();
    });

});
