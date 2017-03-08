/*global defineSuite*/
defineSuite([
        'Widgets/CesiumInspector/Cesium3DTilesInspectorViewModel',
        'Scene/Cesium3DTileset',
        'Scene/Cesium3DTileStyle',
        'Core/defined',
        'Scene/Globe',
        'Specs/createScene',
        'ThirdParty/when'
    ], function(
        Cesium3DTilesInspectorViewModel,
        Cesium3DTileset,
        Cesium3DTileStyle,
        defined,
        Globe,
        createScene,
        when) {
    'use strict';

    // Parent tile with content and four child tiles with content
    var tilesetUrl = './Data/Cesium3DTiles/Tilesets/Tileset/';

    var scene;
    var viewModel;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.globe = new Globe();
        scene.initializeFrame();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('can create and destroy', function() {
        var viewModel = new Cesium3DTilesInspectorViewModel(scene);
        expect(viewModel._scene).toBe(scene);
        expect(viewModel.isDestroyed()).toEqual(false);
        viewModel.destroy();
        expect(viewModel.isDestroyed()).toEqual(true);
    });

    it('throws if scene is undefined', function() {
        expect(function() {
            return new Cesium3DTilesInspectorViewModel();
        }).toThrowDeveloperError();
    });

    describe('tileset options', function() {

        it('show properties', function() {
            viewModel = new Cesium3DTilesInspectorViewModel(scene);
            viewModel.tileset = new Cesium3DTileset({
                url: tilesetUrl
            });
            var done = when.defer();
            viewModel._tilesetLoaded.then(function() {
                expect(viewModel.propertiesText().indexOf('id') !== -1).toBe(true);
                expect(viewModel.propertiesText().indexOf('Longitude') !== -1).toBe(true);
                expect(viewModel.propertiesText().indexOf('Latitude') !== -1).toBe(true);
                expect(viewModel.propertiesText().indexOf('Height') !== -1).toBe(true);
                viewModel.destroy();
                done.resolve();
            });
            return done;
        });
    });

    describe('display options', function() {
        beforeAll(function() {
            viewModel = new Cesium3DTilesInspectorViewModel(scene);
            viewModel.tileset = new Cesium3DTileset({
                url: tilesetUrl
            });
            return viewModel._tilesetLoaded;
        });

        afterAll(function() {
            viewModel.destroy();
        });

        it('colorize', function() {
            viewModel.colorize = true;
            expect(viewModel.tileset.debugColorizeTiles).toBe(true);
            viewModel.colorize = false;
            expect(viewModel.tileset.debugColorizeTiles).toBe(false);
        });

        it('wireframe', function() {
            viewModel.wireframe = true;
            expect(viewModel.tileset.debugWireframe).toBe(true);
            viewModel.wireframe = false;
            expect(viewModel.tileset.debugWireframe).toBe(false);
        });

        it('showBoundingVolumes', function() {
            viewModel.showBoundingVolumes = true;
            expect(viewModel.tileset.debugShowBoundingVolume).toBe(true);
            viewModel.showBoundingVolumes = false;
            expect(viewModel.tileset.debugShowBoundingVolume).toBe(false);
        });

        it('showContentVolumes', function() {
            viewModel.showContentBoundingVolumes = true;
            expect(viewModel.tileset.debugShowContentBoundingVolume).toBe(true);
            viewModel.showContentBoundingVolumes = false;
            expect(viewModel.tileset.debugShowContentBoundingVolume).toBe(false);
        });

        it('showRequestVolumes', function() {
            viewModel.showRequestVolumes = true;
            expect(viewModel.tileset.debugShowViewerRequestVolume).toBe(true);
            viewModel.showRequestVolumes = false;
            expect(viewModel.tileset.debugShowViewerRequestVolume).toBe(false);
        });

        it('showGeometricError', function() {
            viewModel.showGeometricError = true;
            expect(viewModel.tileset.debugShowGeometricError).toBe(true);
            viewModel.showGeometricError = false;
            expect(viewModel.tileset.debugShowGeometricError).toBe(false);
        });
    });

    describe('update options', function() {
        beforeAll(function() {
            viewModel = new Cesium3DTilesInspectorViewModel(scene);
            viewModel.tileset = new Cesium3DTileset({
                url: tilesetUrl
            });
            return viewModel._tilesetLoaded;
        });
        
        afterAll(function() {
            viewModel.destroy();
        });

        it ('freeze frame', function() {
            viewModel.freezeFrame = false;
            expect(viewModel.tileset.debugFreezeFrame).toBe(false);
            viewModel.freezeFrame = true;
            expect(viewModel.tileset.debugFreezeFrame).toBe(true);
        });

        it('maximum screen space error', function() {
            viewModel.dynamicSSE = false;
            viewModel.maximumSSE = 10;
            expect(viewModel.tileset.dynamicScreenSpaceError).toBe(false);
            expect(viewModel.tileset.maximumScreenSpaceError).toBe(10);
        });

        it('dynamic screen space error', function() {
            viewModel.dynamicSSE = true;
            viewModel.dynamicSSEFactor = 2;
            viewModel.dynamicSSEDensity = 0.1;
            expect(viewModel.tileset.dynamicScreenSpaceError).toBe(true);
            expect(viewModel.tileset.dynamicScreenSpaceErrorFactor).toBe(2);
            expect(viewModel.tileset.dynamicScreenSpaceErrorDensity).toBe(0.1);
        });
    });

    describe('style options', function() {
        var style;

        beforeAll(function() {
            style = new Cesium3DTileStyle({
                color: {
                    conditions: [
                        ["${Height} >= 83", "color('purple', 0.5)"],
                        ["${Height} >= 80", "color('red')"],
                        ["${Height} >= 70", "color('orange')"],
                        ["${Height} >= 12", "color('yellow')"],
                        ["${Height} >= 7", "color('lime')"],
                        ["${Height} >= 1", "color('cyan')"],
                        ["true", "color('blue')"]
                    ]
                },
                meta: {
                    description: "'Building id ${id} has height ${Height}.'"
                }
            });

            viewModel = new Cesium3DTilesInspectorViewModel(scene);
            viewModel.tileset = new Cesium3DTileset({
                url: tilesetUrl
            });

            return viewModel._tilesetLoaded;
        });

        afterAll(function() {
            viewModel.destroy();
        });

        it ('loads tileset style', function() {
            viewModel.tileset.style = style;
            viewModel.update();
            expect(JSON.stringify(style.style)).toBe(JSON.stringify(JSON.parse(viewModel.styleString)));
        });

        it ('does not throw on invalid syntax', function() {
            expect(function() {
                viewModel.styleString = 'invalid';
            }).not.toThrowError();
        });

        it('recompiles style', function() {
            viewModel.tileset.style = style;
            viewModel.update();
            var s = JSON.parse(viewModel.styleString);
            s.color = "color('red')";
            viewModel._styleString = JSON.stringify(s);
            viewModel._compileStyle();
            expect(viewModel.tileset.style.style.color).toBe("color('red')");
            expect(viewModel.tileset.style.style.meta.description).toBe("'Building id ${id} has height ${Height}.'");
        });

        it ('does not throw on invalid value', function() {
            expect(function() {
                viewModel.styleString = '{ "color": "color(1)" }';
            }).not.toThrowError();
        });
    });
}, 'WebGL');
