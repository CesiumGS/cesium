/*global defineSuite*/
defineSuite([
        'Widgets/ProjectionPicker/ProjectionPickerViewModel',
        'Scene/OrthographicFrustum',
        'Scene/PerspectiveFrustum',
        'Scene/SceneMode',
        'Specs/createScene'
    ], function(
        ProjectionPickerViewModel,
        OrthographicFrustum,
        PerspectiveFrustum,
        SceneMode,
        createScene) {
    'use strict';

    var scene;

    beforeEach(function() {
        scene = createScene();
    });

    afterEach(function() {
        scene.destroyForSpecs();
    });

    it('Can construct and destroy', function() {
        var viewModel = new ProjectionPickerViewModel(scene);
        expect(viewModel.scene).toBe(scene);
        expect(scene.morphComplete.numberOfListeners).toEqual(1);
        expect(scene.preRender.numberOfListeners).toEqual(1);
        expect(viewModel.isDestroyed()).toEqual(false);
        viewModel.destroy();
        expect(viewModel.isDestroyed()).toEqual(true);
        expect(scene.morphComplete.numberOfListeners).toEqual(0);
        expect(scene.preRender.numberOfListeners).toEqual(0);
    });

    it('dropDownVisible and toggleDropDown work', function() {
        var viewModel = new ProjectionPickerViewModel(scene);

        expect(viewModel.dropDownVisible).toEqual(false);
        viewModel.toggleDropDown();
        expect(viewModel.dropDownVisible).toEqual(true);
        viewModel.dropDownVisible = false;
        expect(viewModel.dropDownVisible).toEqual(false);

        viewModel.destroy();
    });

    it('morphing to 2D calls correct transition', function() {
        var viewModel = new ProjectionPickerViewModel(scene);

        expect(scene.mode).toEqual(SceneMode.SCENE3D);
        expect(viewModel.isOrthographicProjection).toEqual(false);

        scene.morphTo2D(0);
        expect(scene.mode).toEqual(SceneMode.SCENE2D);
        expect(viewModel.isOrthographicProjection).toEqual(true);

        viewModel.destroy();
    });

    it('switching projection calls correct transition', function() {
        var viewModel = new ProjectionPickerViewModel(scene);

        expect(scene.mode).toEqual(SceneMode.SCENE3D);
        expect(viewModel.isOrthographicProjection).toEqual(false);
        expect(scene.camera.frustum instanceof PerspectiveFrustum).toEqual(true);

        viewModel.switchToOrthographic();
        expect(viewModel.isOrthographicProjection).toEqual(true);
        expect(scene.camera.frustum instanceof OrthographicFrustum).toEqual(true);

        viewModel.switchToPerspective();
        expect(viewModel.isOrthographicProjection).toEqual(false);
        expect(scene.camera.frustum instanceof PerspectiveFrustum).toEqual(true);

        viewModel.destroy();
    });

    it('selectedTooltip changes on transition', function() {
        var viewModel = new ProjectionPickerViewModel(scene);

        viewModel.switchToOrthographic();
        expect(viewModel.selectedTooltip).toEqual(viewModel.tooltipOrthographic);

        viewModel.switchToPerspective();
        expect(viewModel.selectedTooltip).toEqual(viewModel.tooltipPerspective);

        viewModel.destroy();
    });

    it('create throws with undefined scene', function() {
        expect(function() {
            return new ProjectionPickerViewModel();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
