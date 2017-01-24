/*global defineSuite*/
defineSuite([
    'Widgets/CesiumInspector/Cesium3DTilesInspector',
    'Scene/Cesium3DTileset',
    'Core/Ellipsoid',
    'Scene/Globe',
    'Specs/createScene',
    'ThirdParty/when'
], function(
    Cesium3DTilesInspector,
    Cesium3DTileset,
    Ellipsoid,
    Globe,
    createScene,
    when) {
    'use strict';

    // Parent tile with content and four child tiles with content
    var tilesetUrl = './Data/Cesium3DTiles/Tilesets/Tileset/';

    var scene;
    beforeAll(function() {
        scene = createScene();
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var globe = new Globe(ellipsoid);
        scene.globe = globe;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('can create and destroy', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new Cesium3DTilesInspector('testContainer', scene);
        expect(widget.container).toBe(container);
        expect(widget.viewModel._scene).toBe(scene);
        expect(widget.isDestroyed()).toEqual(false);
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new Cesium3DTilesInspector();
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new Cesium3DTilesInspector('does not exist', scene);
        }).toThrowDeveloperError();
    });

    it('constructor throws with no scene', function() {
        expect(function() {
            return new Cesium3DTilesInspector(document.body);
        }).toThrowDeveloperError();
    });

    describe('logging', function() {
        var widget;
        beforeAll(function() {
            var container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);
            widget = new Cesium3DTilesInspector('testContainer', scene);

            var viewModel = widget.viewModel;
            viewModel.tileset = new Cesium3DTileset({
                url: tilesetUrl
            });
            var done = when.defer();
            viewModel._tilesetLoaded.then(function() {
                done.resolve();
            });
            return done;
        });

        afterAll(function() {
            widget.destroy();
        });

        it ('shows performance', function() {
            var viewModel = widget.viewModel;
            viewModel.performance = true;
            expect(viewModel._performanceDisplay._container.className.indexOf('cesium-cesiumInspector-show') !== -1).toBe(true);
            expect(viewModel._performanceDisplay._container.className.indexOf('cesium-cesiumInspector-hide') === -1).toBe(true);
            viewModel.performance = false;
            expect(viewModel._performanceDisplay._container.className.indexOf('cesium-cesiumInspector-show') === -1).toBe(true);
            expect(viewModel._performanceDisplay._container.className.indexOf('cesium-cesiumInspector-hide') !== -1).toBe(true);
        });

        it ('shows stats', function() {
            var viewModel = widget.viewModel;
            viewModel.showStats = true;
            expect(viewModel.statsText).not.toBe('');
            viewModel.showStats = false;
            expect(viewModel.statsText).toBe('');

        });

        it ('shows pick stats', function() {
            var viewModel = widget.viewModel;
            viewModel.picking = true;
            viewModel.showPickStats = true;
            expect(viewModel.pickStatsText).not.toBe('');
            viewModel.showPickStats = false;
            expect(viewModel.pickStatsText).toBe('');
        });
    });
}, 'WebGL');
