/*global defineSuite*/
defineSuite([
        'Widgets/CesiumInspector/CesiumInspectorViewModel',
        'Core/defined',
        'Core/GeometryInstance',
        'Core/Math',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/WebMercatorTilingScheme',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/Globe',
        'Scene/GlobeSurfaceTile',
        'Scene/Material',
        'Scene/Primitive',
        'Scene/QuadtreeTile',
        'Specs/createScene'
    ], function(
        CesiumInspectorViewModel,
        defined,
        GeometryInstance,
        CesiumMath,
        Rectangle,
        RectangleGeometry,
        WebMercatorTilingScheme,
        EllipsoidSurfaceAppearance,
        Globe,
        GlobeSurfaceTile,
        Material,
        Primitive,
        QuadtreeTile,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    var performanceContainer;

    function createRectangle(rectangle, rotation) {
        return new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: rectangle,
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    rotation: rotation
                })
            }),
            appearance: new EllipsoidSurfaceAppearance({
                aboveGround: false
            })
        });
    }

    beforeAll(function() {
        scene = createScene();
        performanceContainer = document.createElement('div');
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
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.performanceContainer).toBe(performanceContainer);
        expect(viewModel.isDestroyed()).toEqual(false);
        viewModel.destroy();
        expect(viewModel.isDestroyed()).toEqual(true);
    });

    it('throws if scene is undefined', function() {
        expect(function() {
            return new CesiumInspectorViewModel();
        }).toThrowDeveloperError();
    });

    it('throws if performanceContainer is undefined', function() {
        expect(function() {
            return new CesiumInspectorViewModel(scene);
        }).toThrowDeveloperError();
    });

    it('show frustums', function() {
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        viewModel.frustums = true;
        viewModel.showFrustums();
        expect(viewModel.scene.debugShowFrustums).toBe(true);
        setTimeout(function(){
            viewModel.frustums = false;
            viewModel.showFrustums();
            expect(viewModel.scene.debugShowFrustums).toBe(false);
        }, 250);
    });

    it('show performance', function() {
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        viewModel.performance = true;
        viewModel.showPerformance();
        scene.render();
        expect(performanceContainer.innerHTML).not.toEqual('');

        viewModel.performance = false;
        viewModel.showPerformance();
        scene.render();
        expect(performanceContainer.innerHTML).toEqual('');
    });

    it ('primitive bounding sphere', function() {
        var p = scene.primitives.add(createRectangle(new Rectangle(
                    CesiumMath.toRadians(-110.0),
                    CesiumMath.toRadians(0.0),
                    CesiumMath.toRadians(-90.0),
                    CesiumMath.toRadians(20.0)),
                    CesiumMath.toRadians(45)));
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        scene.render();
        viewModel.primitive = p;
        viewModel.primitiveBoundingSphere = true;
        viewModel.showPrimitiveBoundingSphere();
        expect(p.debugShowBoundingVolume).toEqual(true);

        viewModel.primitiveBoundingSphere = false;
        viewModel.showPrimitiveBoundingSphere();
        scene.render();
        expect(p.debugShowBoundingVolume).toEqual(false);
    });

    it ('primitive filter', function() {
        var p = scene.primitives.add(createRectangle(new Rectangle(
                CesiumMath.toRadians(-110.0),
                CesiumMath.toRadians(0.0),
                CesiumMath.toRadians(-90.0),
                CesiumMath.toRadians(20.0)),
                CesiumMath.toRadians(45)));

        var q = scene.primitives.add(createRectangle(new Rectangle(
                CesiumMath.toRadians(-10.0),
                CesiumMath.toRadians(0.0),
                CesiumMath.toRadians(-9.0),
                CesiumMath.toRadians(20.0))));

        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        scene.render();
        viewModel.primitive = p;
        viewModel.filterPrimitive = true;
        viewModel.doFilterPrimitive();
        expect(defined(scene.debugCommandFilter)).toEqual(true);
        expect(scene.debugCommandFilter({owner: p})).toEqual(true);
        expect(scene.debugCommandFilter({owner: q})).toEqual(false);

        viewModel.filterPrimitive = false;
        viewModel.doFilterPrimitive();
        expect(defined(scene.debugCommandFilter)).toEqual(false);
    });

    it ('primitive reference frame', function() {
        var p = scene.primitives.add(createRectangle(new Rectangle(
                CesiumMath.toRadians(-110.0),
                CesiumMath.toRadians(0.0),
                CesiumMath.toRadians(-90.0),
                CesiumMath.toRadians(20.0)),
                CesiumMath.toRadians(45)));

        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        scene.render();
        viewModel.primitive = p;
        viewModel.primitiveReferenceFrame = true;
        viewModel.showPrimitiveReferenceFrame();
        expect(scene.primitives.length).toEqual(2);

        viewModel.primitiveReferenceFrame = false;
        viewModel.showPrimitiveReferenceFrame();
        scene.render();
        expect(scene.primitives.length).toEqual(1);
    });

    it('show wireframe', function() {
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        viewModel.wireframe = true;
        viewModel.showWireframe();
        expect(viewModel.scene.globe._surface.tileProvider._debug.wireframe).toBe(true);

        viewModel.wireframe = false;
        viewModel.showWireframe();
        expect(viewModel.scene.globe._surface.tileProvider._debug.wireframe).toBe(false);
    });

    it('suspend updates', function() {
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        viewModel.suspendUpdates = true;
        viewModel.doSuspendUpdates();
        expect(viewModel.scene.globe._surface._debug.suspendLodUpdate).toBe(true);

        viewModel.suspendUpdates = false;
        viewModel.doSuspendUpdates();
        expect(viewModel.scene.globe._surface._debug.suspendLodUpdate).toBe(false);
    });

    it('show tile coords', function() {
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        expect(viewModel.scene.imageryLayers.length).toBe(0);

        viewModel.tileCoordinates  = true;
        viewModel.showTileCoordinates();
        expect(viewModel.scene.imageryLayers.length).toBe(1);

        viewModel.tileCoordinates = false;
        viewModel.showTileCoordinates();
        expect(viewModel.scene.imageryLayers.length).toBe(0);
    });

    it('show tile bounding sphere', function() {
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        var tile = new QuadtreeTile({tilingScheme : new WebMercatorTilingScheme(), x : 0, y : 0, level : 0});
        tile.data = new GlobeSurfaceTile();
        viewModel.tile = tile;

        viewModel.tileBoundingSphere  = true;
        viewModel.showTileBoundingSphere();
        expect(viewModel.scene.globe._surface.tileProvider._debug.boundingSphereTile).toBe(tile);

        viewModel.tileBoundingSphere = false;
        viewModel.showTileBoundingSphere();
        expect(viewModel.scene.globe._surface.tileProvider._debug.boundingSphereTile).toBe(undefined);
    });

    it('filter tile', function() {
        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
        var tile = new QuadtreeTile({tilingScheme : new WebMercatorTilingScheme(), x : 0, y : 0, level : 0});
        tile.data = new GlobeSurfaceTile();
        viewModel.tile = tile;

        viewModel.filterTile  = true;
        viewModel.doFilterTile();
        expect(viewModel.scene.globe._surface._tilesToRender[0]).toBe(tile);
        expect(viewModel.suspendUpdates).toBe(true);

        viewModel.filterTile = false;
        viewModel.doFilterTile();
        expect(viewModel.suspendUpdates).toBe(false);
    });

}, 'WebGL');