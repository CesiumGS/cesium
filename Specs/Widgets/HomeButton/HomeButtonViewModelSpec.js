/*global defineSuite*/
defineSuite([
         'Widgets/HomeButton/HomeButtonViewModel',
         'Core/Ellipsoid',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         HomeButtonViewModel,
         Ellipsoid,
         SceneTransitioner,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var transitioner;
    beforeAll(function() {
        scene = createScene();
        transitioner = new SceneTransitioner(scene);
    });

    afterAll(function() {
        transitioner.destroy();
        destroyScene(scene);
    });

    it('constructor sets default values', function() {
        var viewModel = new HomeButtonViewModel(scene);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.sceneTransitioner).toBeUndefined();
        expect(viewModel.ellipsoid).toBe(Ellipsoid.WGS84);
    });

    it('constructor sets expected values', function() {
        var ellipsoid = new Ellipsoid();
        var viewModel = new HomeButtonViewModel(scene, transitioner, ellipsoid);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.sceneTransitioner).toBe(transitioner);
        expect(viewModel.ellipsoid).toBe(ellipsoid);
    });

    it('throws if scene is undefined', function() {
        expect(function() {
            return new HomeButtonViewModel(undefined);
        }).toThrowDeveloperError();
    });

    //These remaining tests are sanity checks to make sure the code executes
    //The actual position of the camera at the end of the command is
    //tied to the implementation of various camera features.
    it('works in 3D', function() {
        scene.render();
        var viewModel = new HomeButtonViewModel(scene, transitioner);
        viewModel.command();
    });

    it('works in 2D', function() {
        scene.render();
        var viewModel = new HomeButtonViewModel(scene, transitioner);
        transitioner.to2D();
        viewModel.command();
    });

    it('works in Columbus View', function() {
        scene.render();
        var viewModel = new HomeButtonViewModel(scene, transitioner);
        transitioner.toColumbusView();
        viewModel.command();
    });

    it('works while morphing', function() {
        scene.render();
        var viewModel = new HomeButtonViewModel(scene, transitioner);
        transitioner.morphToColumbusView();
        viewModel.command();
    });
}, 'WebGL');