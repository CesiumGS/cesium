defineSuite([
        'Widgets/Cesium3DTilesInspector/Cesium3DTilesInspector',
        'Core/Ellipsoid',
        'Scene/Cesium3DTileset',
        'Scene/Globe',
        'Specs/createScene'
    ], function(
        Cesium3DTilesInspector,
        Ellipsoid,
        Cesium3DTileset,
        Globe,
        createScene) {
    'use strict';

    // Parent tile with content and four child tiles with content
    var tilesetUrl = './Data/Cesium3DTiles/Tilesets/Tileset/tileset.json';

    var scene;
    beforeAll(function() {
        scene = createScene();
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        scene.globe = new Globe(ellipsoid);
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
        var container;

        beforeAll(function() {
            container = document.createElement('div');
            container.id = 'testContainer';
            document.body.appendChild(container);
            widget = new Cesium3DTilesInspector('testContainer', scene);

            var viewModel = widget.viewModel;
            viewModel.tileset = new Cesium3DTileset({
                url : tilesetUrl
            });
            return viewModel.tileset.readyPromise;
        });

        afterAll(function() {
            widget.destroy();
            document.body.removeChild(container);
        });
    });
}, 'WebGL');
