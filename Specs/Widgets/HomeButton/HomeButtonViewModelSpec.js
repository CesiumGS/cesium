defineSuite([
        'Widgets/HomeButton/HomeButtonViewModel',
        'Core/Ellipsoid',
        'Scene/Globe',
        'Specs/createScene'
    ], function(
        HomeButtonViewModel,
        Ellipsoid,
        Globe,
        createScene) {
    'use strict';

    var scene;
    var ellipsoid = Ellipsoid.WGS84;
    var globe = new Globe(ellipsoid);
    beforeAll(function() {
        scene = createScene();
        scene.globe = globe;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('constructor sets default values', function() {
        var viewModel = new HomeButtonViewModel(scene);
        expect(viewModel.scene).toBe(scene);
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
        var viewModel = new HomeButtonViewModel(scene);
        viewModel.command();
    });

    it('works in 2D', function() {
        scene.render();
        var viewModel = new HomeButtonViewModel(scene);
        scene.morphTo2D();
        viewModel.command();
    });

    it('works in Columbus View', function() {
        scene.render();
        var viewModel = new HomeButtonViewModel(scene);
        scene.morphToColumbusView();
        viewModel.command();
    });

    it('works while morphing', function() {
        scene.render();
        var viewModel = new HomeButtonViewModel(scene);
        scene.morphToColumbusView(2000);
        viewModel.command();
    });
}, 'WebGL');
