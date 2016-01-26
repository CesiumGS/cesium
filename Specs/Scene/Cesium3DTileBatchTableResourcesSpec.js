/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileBatchTableResources',
        'Core/Cartesian3',
        'Core/Color',
        'Core/HeadingPitchRange',
        'Renderer/ContextLimits',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Cesium3DTileBatchTableResources,
        Cartesian3,
        Color,
        HeadingPitchRange,
        ContextLimits,
        Cesium3DTilesTester,
        createScene) {
    "use strict";

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/';
    var batchLengthZeroUrl = './Data/Cesium3DTiles/Batched/BatchedNoBuildings/';

    var result = new Color();

    var mockContentProvider = {
        getFeature : function(batchId) {
            return {};
        }
    };

    beforeAll(function() {
        scene = createScene();

        // One building in each data set is always located in the center, so point the camera there
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 10.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function expectRender(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    it('setShow throws with invalid batchId', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.setShow();
        }).toThrowDeveloperError();
        expect(function() {
            resources.setShow(-1);
        }).toThrowDeveloperError();
        expect(function() {
            resources.setShow(2);
        }).toThrowDeveloperError();
    });

    it('setShow throws with undefined value', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.setShow(0);
        }).toThrowDeveloperError();
    });

    it('setShow', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);

        // Batch resources are undefined by default
        expect(resources._batchValues).toBeUndefined();
        expect(resources._batchTexture).toBeUndefined();

        // Check that batch resources are still undefined because value is true by default
        resources.setShow(0, true);
        resources.update(mockContentProvider, scene.frameState);
        expect(resources._batchValues).toBeUndefined();
        expect(resources._batchTexture).toBeUndefined();
        expect(resources.getShow(0)).toEqual(true);

        // Check that batch values are dirty and resources are created when value changes
        resources.setShow(0, false);
        expect(resources._batchValuesDirty).toEqual(true);
        resources.update(mockContentProvider, scene.frameState);
        expect(resources._batchValues).toBeDefined();
        expect(resources._batchTexture).toBeDefined();
        expect(resources._batchValuesDirty).toEqual(false);
        expect(resources.getShow(0)).toEqual(false);

        // Check that dirty stays false when value is the same
        resources.setShow(0, false);
        expect(resources._batchValuesDirty).toEqual(false);
        expect(resources.getShow(0)).toEqual(false);
    });

    it('getShow throws with invalid batchId', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.getShow();
        }).toThrowDeveloperError();
        expect(function() {
            resources.getShow(-1);
        }).toThrowDeveloperError();
        expect(function() {
            resources.getShow(2);
        }).toThrowDeveloperError();
    });

    it('getShow', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        // Show is true by default
        expect(resources.getShow(0)).toEqual(true);
        resources.setShow(0, false);
        expect(resources.getShow(0)).toEqual(false);
    });
    
    it('setColor throws with invalid batchId', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.setColor();
        }).toThrowDeveloperError();
        expect(function() {
            resources.setColor(-1);
        }).toThrowDeveloperError();
        expect(function() {
            resources.setColor(2);
        }).toThrowDeveloperError();
    });

    it('setColor throws with undefined value', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.setColor(0);
        }).toThrowDeveloperError();
    });

    it('setColor', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);

        // Batch resources are undefined by default
        expect(resources._batchValues).toBeUndefined();
        expect(resources._batchTexture).toBeUndefined();

        // Check that batch resources are still undefined because value is true by default
        resources.setColor(0, Color.WHITE);
        resources.update(mockContentProvider, scene.frameState);
        expect(resources._batchValues).toBeUndefined();
        expect(resources._batchTexture).toBeUndefined();
        expect(resources.getColor(0, result)).toEqual(Color.WHITE);

        // Check that batch values are dirty and resources are created when value changes
        resources.setColor(0, Color.YELLOW);
        expect(resources._batchValuesDirty).toEqual(true);
        resources.update(mockContentProvider, scene.frameState);
        expect(resources._batchValues).toBeDefined();
        expect(resources._batchTexture).toBeDefined();
        expect(resources._batchValuesDirty).toEqual(false);
        expect(resources.getColor(0, result)).toEqual(Color.YELLOW);

        // Check that dirty stays false when value is the same
        resources.setColor(0, Color.YELLOW);
        expect(resources._batchValuesDirty).toEqual(false);
        expect(resources.getColor(0, result)).toEqual(Color.YELLOW);
    });

    it('setAllColor throws with undefined value', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.setAllColor();
        }).toThrowDeveloperError();
    });

    it('setAllColor', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 2);
        resources.setAllColor(Color.YELLOW);
        expect(resources.getColor(0, result)).toEqual(Color.YELLOW);
        expect(resources.getColor(1, result)).toEqual(Color.YELLOW);
    });

    it('getColor throws with invalid batchId', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.getColor();
        }).toThrowDeveloperError();
        expect(function() {
            resources.getColor(-1);
        }).toThrowDeveloperError();
        expect(function() {
            resources.getColor(2);
        }).toThrowDeveloperError();
    });

    it('getColor throws with undefined result', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.getColor(0);
        }).toThrowDeveloperError();
    });

    it('getColor', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        // Color is true by default
        expect(resources.getColor(0, result)).toEqual(Color.WHITE);
        resources.setColor(0, Color.YELLOW);
        expect(resources.getColor(0, result)).toEqual(Color.YELLOW);
    });

    it('hasProperty throws with undefined name', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.hasProperty();
        }).toThrowDeveloperError();
    });

    it('hasProperty', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(resources.hasProperty('height')).toEqual(false);
        resources.batchTable = {
            height: [0.0]
        };
        expect(resources.hasProperty('height')).toEqual(true);
        expect(resources.hasProperty('id')).toEqual(false);
    });

    it('getPropertyNames', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(resources.getPropertyNames()).toEqual([]);
        resources.batchTable = {
            height: [0.0],
            id : [0]
        };
        expect(resources.getPropertyNames()).toEqual(['height', 'id']);
    });

    it('getProperty throws with invalid batchId', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.getProperty();
        }).toThrowDeveloperError();
        expect(function() {
            resources.getProperty(-1);
        }).toThrowDeveloperError();
        expect(function() {
            resources.getProperty(2);
        }).toThrowDeveloperError();
    });

    it('getProperty throws with undefined name', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.getProperty(0);
        }).toThrowDeveloperError();
    });

    it('getProperty', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(resources.getProperty(0, 'height')).toBeUndefined();
        resources.batchTable = {
            height: [1.0]
        };
        expect(resources.getProperty(0, 'height')).toEqual(1.0);
        expect(resources.getProperty(0, 'id')).toBeUndefined();
    });

    it('setProperty throws with invalid batchId', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.setProperty();
        }).toThrowDeveloperError();
        expect(function() {
            resources.setProperty(-1);
        }).toThrowDeveloperError();
        expect(function() {
            resources.setProperty(2);
        }).toThrowDeveloperError();
    });

    it('setProperty throws with undefined name', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 1);
        expect(function() {
            resources.setProperty(0);
        }).toThrowDeveloperError();
    });

    it('setProperty without existing batch table', function() {
        // Check that a batch table is created with a height of 1.0 for the first resource and undefined for the others
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 3);
        resources.setProperty(0, 'height', 1.0);

        expect(resources.batchTable.height.length).toEqual(3);
        expect(resources.getProperty(0, 'height')).toEqual(1.0);
        expect(resources.getProperty(1, 'height')).toBeUndefined();
        expect(resources.getProperty(2, 'height')).toBeUndefined();
    });

    it('setProperty with existing batch table', function() {
        var resources = new Cesium3DTileBatchTableResources(mockContentProvider, 2);
        resources.batchTable = {
            height : [1.0, 2.0]
        };
        resources.setProperty(0, 'height', 3.0);

        expect(resources.getProperty(0, 'height')).toEqual(3.0);
        expect(resources.getProperty(1, 'height')).toEqual(2.0);
    });

    it('renders tileset with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            var resources = content.batchTableResources;

            // Each resource in the b3dm file has an id property from 0 to 99,
            // check that the 2nd resource has an id of 2
            expect(resources.getProperty(2, 'id')).toEqual(2);

            expect(resources.featuresLength).toEqual(content.featuresLength);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders tileset without batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            var resources = content.batchTableResources;

            expect(resources.getProperty(2, 'id')).toBeUndefined();

            expect(resources.featuresLength).toEqual(content.featuresLength);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders when vertex texture fetch is not supported', function() {
        // Disable VTF
        var maximumVertexTextureImageUnits = ContextLimits.maximumVertexTextureImageUnits;
        ContextLimits._maximumVertexTextureImageUnits = 0;

        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);

            // Re-enable VTF
            ContextLimits._maximumVertexTextureImageUnits = maximumVertexTextureImageUnits;
        });
    });

    it('renders with featuresLength greater than maximumTextureSize', function() {
        // Set maximum texture size to 64 temporarily. Batch length of b3dm file is 100.
        var maximumTextureSize = ContextLimits.maximumTextureSize;
        ContextLimits._maximumTextureSize = 64;

        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var resources = tileset._root.content.batchTableResources;
            expect(resources.featuresLength).toBeGreaterThan(ContextLimits._maximumTextureSize);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);

            // Reset maximum texture size
            ContextLimits._maximumVertexTextureImageUnits = maximumTextureSize;
        });
    });

    it('renders with featuresLength of zero', function() {
        return Cesium3DTilesTester.loadTileset(scene, batchLengthZeroUrl).then(function(tileset) {
            expectRender(tileset);

            // Expect the picked primitive to be the entire model rather than a single building
            var picked = scene.pickForSpecs().primitive;
            expect(picked).toBe(tileset._root.content._model);
        });
    });

    it('renders with debug color', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var color = expectRender(tileset);
            tileset.debugColorizeTiles = true;
            var debugColor = expectRender(tileset);
            expect(debugColor).not.toEqual(color);
            tileset.debugColorizeTiles = false;
            debugColor = expectRender(tileset);
            expect(debugColor).toEqual(color);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            var resources = content.batchTableResources;
            expect(resources.isDestroyed()).toEqual(false);
            scene.primitives.remove(tileset);
            expect(resources.isDestroyed()).toEqual(true);
        });
    });

}, 'WebGL');
