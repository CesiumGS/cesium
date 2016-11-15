/*global defineSuite*/
defineSuite([
    'Scene/Vector3DTileContent',
    'Core/Cartesian3',
    'Core/Color',
    'Core/ColorGeometryInstanceAttribute',
    'Core/destroyObject',
    'Core/GeometryInstance',
    'Core/HeadingPitchRange',
    'Core/Rectangle',
    'Core/RectangleGeometry',
    'Scene/Cesium3DTileStyle',
    'Scene/Pass',
    'Scene/PerInstanceColorAppearance',
    'Scene/Primitive',
    'Specs/Cesium3DTilesTester',
    'Specs/createScene'
], function(
    Vector3DTileContent,
    Cartesian3,
    Color,
    ColorGeometryInstanceAttribute,
    destroyObject,
    GeometryInstance,
    HeadingPitchRange,
    Rectangle,
    RectangleGeometry,
    Cesium3DTileStyle,
    Pass,
    PerInstanceColorAppearance,
    Primitive,
    Cesium3DTilesTester,
    createScene) {
    'use strict';

    var vectorPolygonUrl = './Data/Cesium3DTiles/Vector/VectorPolygon';
    var vectorPolygonQuantizedUrl = './Data/Cesium3DTiles/Vector/VectorPolygonQuantized';
    var vectorPolylineUrl = './Data/Cesium3DTiles/Vector/VectorPolyline';
    var vectorPolylineQuantizedUrl = './Data/Cesium3DTiles/Vector/VectorPolylineQuantized';
    var vectorPolygonWithPropertiesUrl = './Data/Cesium3DTiles/Vector/VectorPolygonWithProperties';

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
    }

    MockGlobePrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = Pass.GLOBE;
        }
    };

    MockGlobePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockGlobePrimitive.prototype.destroy = function() {
        this._primitive.destroy();
        return destroyObject(this);
    };

    var scene;
    var depthColor;
    var depthPrimitive;

    beforeAll(function() {
        // vector tiles use RTC, which for now requires scene3DOnly to be true
        scene = createScene({
            scene3DOnly : true
        });

        scene.frameState.passes.render = true;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 1.0, 1.0));
        depthColor = depthColorAttribute.value;
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    rectangle : Rectangle.fromDegrees(-77.0, 39.0, -76.0, 40.0)
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        depthPrimitive = scene.groundPrimitives.add(new MockGlobePrimitive(primitive));

        var center = Cartesian3.fromDegrees(-76.5, 39.5);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 3500.0));
    });

    afterEach(function() {
        scene.groundPrimitives.removeAll();
        scene.primitives.removeAll();
        depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
    });

    function expectRenderVectorContent(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual(depthColor);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual(depthColor);
        return pixelColor;
    }

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            version: 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if featureTableJsonByteLength is 0', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJsonByteLength : 0
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the feature table does not contain POLYGONS_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYLINES_LENGTH : 0
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the feature table does not contain POLYLINES_LENGTH', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYGONS_LENGTH : 0
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_SCALE', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYGONS_LENGTH : 1,
                POLYLINES_LENGTH : 0,
                QUANTIZED_VOLUME_OFFSET : [0.0, 0.0, 0.0]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws if the positions are quantized and the feature table does not contain QUANTIZED_VOLUME_OFFSET', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            featureTableJson : {
                POLYGONS_LENGTH : 1,
                POLYLINES_LENGTH : 0,
                QUANTIZED_VOLUME_SCALE : [1.0, 1.0, 1.0]
            }
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, vectorPolygonQuantizedUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('vctr');
    });

    it('renders polygons', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonUrl).then(expectRenderVectorContent);
    });

    it('renders quantized polygons', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonQuantizedUrl).then(expectRenderVectorContent);
    });

    it('renders polygons with properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonWithPropertiesUrl).then(expectRenderVectorContent);
    });

    it('renders polylines', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolylineUrl).then(expectRenderVectorContent);
    });

    it('renders quantized polylines', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolylineQuantizedUrl).then(expectRenderVectorContent);
    });

    it('renders with debug color', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonQuantizedUrl).then(function(tileset) {
            var color = expectRenderVectorContent(tileset);
            tileset.debugColorizeTiles = true;
            var debugColor = expectRenderVectorContent(tileset);
            expect(debugColor).not.toEqual(color);
            tileset.debugColorizeTiles = false;
            debugColor = expectRenderVectorContent(tileset);
            expect(debugColor).toEqual(color);
        });
    });

    it('picks', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonQuantizedUrl).then(function(tileset) {
            var content = tileset._root.content;
            tileset.show = false;
            var picked = scene.pickForSpecs();
            expect(picked).toBeUndefined();
            tileset.show = true;
            picked = scene.pickForSpecs();
            expect(picked).toBeDefined();
            expect(picked.primitive).toBe(content);
        });
    });

    it('picks based on batchId', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonQuantizedUrl).then(function(tileset) {
            var pixelColor = scene.renderForSpecs();

            // Change the color of the picked feature to yellow
            var picked = scene.pickForSpecs();
            expect(picked).toBeDefined();
            picked.color = Color.clone(Color.YELLOW, picked.color);

            // Expect the pixel color to be some shade of yellow
            var newPixelColor = scene.renderForSpecs();
            expect(newPixelColor).not.toEqual(pixelColor);

            // Turn show off. Expect a different feature to get picked.
            picked.show = false;
            var newPicked = scene.pickForSpecs();
            expect(newPicked).not.toBe(picked);
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonQuantizedUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getFeature(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature(1000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature();
            }).toThrowDeveloperError();
        });
    });

    it('applies shader style', function() {
        return Cesium3DTilesTester.loadTileset(scene, vectorPolygonWithPropertiesUrl).then(function(tileset) {
            // Solid red color
            tileset.style = new Cesium3DTileStyle({
                color : 'color("red")'
            });
            expect(scene.renderForSpecs()).toEqual([255, 0, 0, 255]);

            // Applies translucency
            tileset.style = new Cesium3DTileStyle({
                color : 'rgba(255, 0, 0, 0.005)'
            });
            var pixelColor = scene.renderForSpecs();
            expect(pixelColor[0]).toBeLessThan(255);
            expect(pixelColor[1]).toBe(0);
            expect(pixelColor[2]).toBeLessThan(255);
            expect(pixelColor[3]).toBe(255);

            // Style with property
            tileset.style = new Cesium3DTileStyle({
                color : 'color() * ${favoriteNumber} * 0.01'
            });
            pixelColor = scene.renderForSpecs();
            expect(pixelColor[0]).toBeGreaterThan(0);
            expect(pixelColor[1]).toBeGreaterThan(0);
            expect(pixelColor[2]).toBeGreaterThan(0);
            expect(pixelColor[3]).toEqual(255);

            // When no conditions are met the default color is white with an alpha of 0.5
            tileset.style = new Cesium3DTileStyle({
                color : {
                    conditions : [
                        ['${name} == "Harambe"', 'color("red")'] // This condition will not be met
                    ]
                }
            });
            // blends with the depth color
            expect(pixelColor[0]).toBeGreaterThan(0);
            expect(pixelColor[1]).toBeGreaterThan(0);
            expect(pixelColor[2]).toBeGreaterThan(0);
            expect(pixelColor[3]).toEqual(255);

            // Apply style with conditions
            tileset.style = new Cesium3DTileStyle({
                color : {
                    conditions : [
                        ['${favoriteNumber} == 15', 'color("red")'],
                        ['true', 'color("#FFFFFF", 1.0)']
                    ]
                }
            });
            expect(scene.renderForSpecs()).toEqual([255, 0, 0, 255]);

            // Apply show style
            tileset.style = new Cesium3DTileStyle({
                show : true
            });
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            // Apply show style that hides all points
            tileset.style = new Cesium3DTileStyle({
                show : false
            });
            expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);

            // Apply show style with property
            tileset.style = new Cesium3DTileStyle({
                show : '${favoriteNumber} > 0'
            });
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 255, 255]);
            tileset.style = new Cesium3DTileStyle({
                show : '${favoriteNumber} > 100'
            });
            expect(scene.renderForSpecs()).toEqual([0, 0, 255, 255]);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, vectorPolygonQuantizedUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, vectorPolygonQuantizedUrl);
    });

}, 'WebGL');