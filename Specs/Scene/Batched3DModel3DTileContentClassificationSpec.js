import { Cartesian3 } from '../../Source/Cesium.js';
import { Cartographic } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { ColorGeometryInstanceAttribute } from '../../Source/Cesium.js';
import { destroyObject } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { GeometryInstance } from '../../Source/Cesium.js';
import { HeadingPitchRange } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { Matrix4 } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { RectangleGeometry } from '../../Source/Cesium.js';
import { Pass } from '../../Source/Cesium.js';
import { RenderState } from '../../Source/Cesium.js';
import { ClassificationType } from '../../Source/Cesium.js';
import { PerInstanceColorAppearance } from '../../Source/Cesium.js';
import { Primitive } from '../../Source/Cesium.js';
import { StencilConstants } from '../../Source/Cesium.js';
import Cesium3DTilesTester from '../Cesium3DTilesTester.js';
import createScene from '../createScene.js';

describe('Scene/Batched3DModel3DTileContentClassification', function() {

    var scene;
    var modelMatrix;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json';
    var withBatchTableBinaryUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/tileset.json';

    var globePrimitive;
    var tilesetPrimitive;
    var reusableGlobePrimitive;
    var reusableTilesetPrimitive;

    function setCamera(longitude, latitude) {
        // One feature is located at the center, point the camera there
        var center = Cartesian3.fromRadians(longitude, latitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    }

    function createPrimitive(rectangle, pass) {
        var renderState;
        if (pass === Pass.CESIUM_3D_TILE) {
            renderState = RenderState.fromCache({
                stencilTest : StencilConstants.setCesium3DTileBit(),
                stencilMask : StencilConstants.CESIUM_3D_TILE_MASK,
                depthTest : {
                    enabled : true
                }
            });
        }
        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 0.0, 1.0));
        return new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    ellipsoid : Ellipsoid.WGS84,
                    rectangle : rectangle
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true,
                renderState : renderState
            }),
            asynchronous : false
        });
    }

    function MockPrimitive(primitive, pass) {
        this._primitive = primitive;
        this._pass = pass;
        this.show = true;
    }

    MockPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = this._pass;
        }
    };

    MockPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockPrimitive.prototype.destroy = function() {
        return destroyObject(this);
    };

    beforeAll(function() {
        scene = createScene();

        var translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(new Cartographic(centerLongitude, centerLatitude));
        Cartesian3.multiplyByScalar(translation, -5.0, translation);
        modelMatrix = Matrix4.fromTranslation(translation);

        var offset = CesiumMath.toRadians(0.01);
        var rectangle = new Rectangle(centerLongitude - offset, centerLatitude - offset, centerLongitude + offset, centerLatitude + offset);
        reusableGlobePrimitive = createPrimitive(rectangle, Pass.GLOBE);
        reusableTilesetPrimitive = createPrimitive(rectangle, Pass.CESIUM_3D_TILE);
    });

    afterAll(function() {
        reusableGlobePrimitive.destroy();
        reusableTilesetPrimitive.destroy();
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        setCamera(centerLongitude, centerLatitude);

        // wrap rectangle primitive so it gets executed during the globe pass and 3D Tiles pass to lay down depth
        globePrimitive = new MockPrimitive(reusableGlobePrimitive, Pass.GLOBE);
        tilesetPrimitive = new MockPrimitive(reusableTilesetPrimitive, Pass.CESIUM_3D_TILE);

        scene.primitives.add(globePrimitive);
        scene.primitives.add(tilesetPrimitive);
    });

    afterEach(function() {
        scene.primitives.removeAll();
        globePrimitive = globePrimitive && !globePrimitive.isDestroyed() && globePrimitive.destroy();
        tilesetPrimitive = tilesetPrimitive && !tilesetPrimitive.isDestroyed() && tilesetPrimitive.destroy();
    });

    it('classifies 3D Tiles', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.CESIUM_3D_TILE,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            globePrimitive.show = false;
            tilesetPrimitive.show = true;
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            globePrimitive.show = true;
            tilesetPrimitive.show = false;
            Cesium3DTilesTester.expectRenderBlank(scene, tileset);
            globePrimitive.show = true;
            tilesetPrimitive.show = true;
        });
    });

    it('classifies globe', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.TERRAIN,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            globePrimitive.show = false;
            tilesetPrimitive.show = true;
            Cesium3DTilesTester.expectRenderBlank(scene, tileset);
            globePrimitive.show = true;
            tilesetPrimitive.show = false;
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            globePrimitive.show = true;
            tilesetPrimitive.show = true;
        });
    });

    it('classifies both 3D Tiles and globe', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.BOTH,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            globePrimitive.show = false;
            tilesetPrimitive.show = true;
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            globePrimitive.show = true;
            tilesetPrimitive.show = false;
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            globePrimitive.show = true;
            tilesetPrimitive.show = true;
        });
    });

    it('renders with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl, {
            classificationType : ClassificationType.BOTH,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with binary batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableBinaryUrl, {
            classificationType : ClassificationType.BOTH,
            modelMatrix : modelMatrix
        }).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

}, 'WebGL');
