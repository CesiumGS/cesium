import { ProjectedImageryTilingScheme } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { Proj4Projection } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { TilingScheme } from '../../Source/Cesium.js';

describe('Core/ProjectedImageryTilingScheme', function() {

    var mollweideWellKnownText = '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs';
    var mollweideProjection = new Proj4Projection({
        wellKnownText : mollweideWellKnownText
    });
    var mollweideProjectedRectangle = Rectangle.approximateProjectedExtents({
        cartographicRectangle : Rectangle.MAX_VALUE,
        mapProjection : mollweideProjection
    });
    var mollweideProjectedCenter = Rectangle.center(mollweideProjectedRectangle);

    it('conforms to TilingScheme interface.', function() {
        expect(ProjectedImageryTilingScheme).toConformToInterface(TilingScheme);
    });

    describe('Conversions from tile indices to cartographic rectangles.', function() {
        it('tileXYToRectangle returns full rectangle for single root tile.', function() {
            var tilingScheme = new ProjectedImageryTilingScheme({
                mapProjection: mollweideProjection,
                projectedRectangle: mollweideProjectedRectangle
            });
            var tilingSchemeRectangle = tilingScheme.rectangle;
            var rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);
            expect(rectangle.west).toEqualEpsilon(tilingSchemeRectangle.west, CesiumMath.EPSILON10);
            expect(rectangle.south).toEqualEpsilon(tilingSchemeRectangle.south, CesiumMath.EPSILON10);
            expect(rectangle.east).toEqualEpsilon(tilingSchemeRectangle.east, CesiumMath.EPSILON10);
            expect(rectangle.north).toEqualEpsilon(tilingSchemeRectangle.north, CesiumMath.EPSILON10);
        });
    });

    describe('utilities for getting information about projected tiles.', function() {
        it('gets the projected rectangle for a projected tile', function() {
            var tilingScheme = new ProjectedImageryTilingScheme({
                mapProjection: mollweideProjection,
                projectedRectangle: mollweideProjectedRectangle
            });

            var rectangle = tilingScheme.getProjectedTileProjectedRectangle(0, 0, 0);
            expect(rectangle.equalsEpsilon(mollweideProjectedRectangle, CesiumMath.EPSILON10)).toBe(true);

            rectangle = tilingScheme.getProjectedTileProjectedRectangle(0, 0, 1);
            expect(rectangle.west).toEqualEpsilon(mollweideProjectedRectangle.west, CesiumMath.EPSILON10);
            expect(rectangle.south).toEqualEpsilon(mollweideProjectedCenter.latitude, CesiumMath.EPSILON10);
            expect(rectangle.east).toEqualEpsilon(mollweideProjectedCenter.longitude, CesiumMath.EPSILON10);
            expect(rectangle.north).toEqualEpsilon(mollweideProjectedRectangle.north, CesiumMath.EPSILON10);

            rectangle = tilingScheme.getProjectedTileProjectedRectangle(1, 1, 1);
            expect(rectangle.west).toEqualEpsilon(mollweideProjectedCenter.longitude, CesiumMath.EPSILON10);
            expect(rectangle.south).toEqualEpsilon(mollweideProjectedRectangle.south, CesiumMath.EPSILON10);
            expect(rectangle.east).toEqualEpsilon(mollweideProjectedRectangle.east, CesiumMath.EPSILON10);
            expect(rectangle.north).toEqualEpsilon(mollweideProjectedCenter.latitude, CesiumMath.EPSILON10);
        });

        it('gets a list of indices for projected tiles that overlap a cartographic tile', function() {
            var tilingScheme = new ProjectedImageryTilingScheme({
                mapProjection: mollweideProjection,
                projectedRectangle: mollweideProjectedRectangle
            });

            var indices = tilingScheme.getProjectedTilesForNativeTile(0, 0, 0);
            expect(indices).toEqual([0, 0]);

            indices = tilingScheme.getProjectedTilesForNativeTile(0, 0, 1);
            expect(indices).toEqual([0, 0]);
        });
    });
});
