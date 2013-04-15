/*global defineSuite*/
defineSuite(['Widgets/SceneModePicker/SceneModePickerViewModel',
             'Core/Event',
             'Scene/SceneMode'
             ], function(
              SceneModePickerViewModel,
              Event,
              SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var MockTransitioner = function() {
        this.scene = {
            mode : SceneMode.SCENE3D
        };
        this.onTransitionStart = new Event();
    };

    MockTransitioner.prototype.morphTo2D = function() {
        this.scene.mode = SceneMode.MORPHING;
        this.onTransitionStart.raiseEvent(this, this.scene.mode, SceneMode.SCENE2D, true);
        this.scene.mode = SceneMode.SCENE2D;
    };

    MockTransitioner.prototype.morphTo3D = function() {
        this.scene.mode = SceneMode.MORPHING;
        this.onTransitionStart.raiseEvent(this, this.scene.mode, SceneMode.SCENE3D, true);
        this.scene.mode = SceneMode.SCENE3D;
    };

    MockTransitioner.prototype.morphToColumbusView = function() {
        this.scene.mode = SceneMode.MORPHING;
        this.onTransitionStart.raiseEvent(this, this.scene.mode, SceneMode.COLUMBUS_VIEW, true);
        this.scene.mode = SceneMode.COLUMBUS_VIEW;
    };

    MockTransitioner.prototype.getScene = function() {
        return this.scene;
    };

    it('Can construct and destroy', function() {
        var mockTransitioner = new MockTransitioner();
        var viewModel = new SceneModePickerViewModel(mockTransitioner);
        expect(mockTransitioner.onTransitionStart.getNumberOfListeners()).toEqual(1);
        viewModel.destroy();
    });

    it('dropDownVisible and toggleDropDown work', function() {
        var viewModel = new SceneModePickerViewModel(new MockTransitioner());

        expect(viewModel.dropDownVisible()).toEqual(false);
        viewModel.toggleDropDown();
        expect(viewModel.dropDownVisible()).toEqual(true);
        viewModel.dropDownVisible(false);
        expect(viewModel.dropDownVisible()).toEqual(false);

        viewModel.destroy();
    });

    it('morphing closes the dropDown', function() {
        var viewModel = new SceneModePickerViewModel(new MockTransitioner());

        viewModel.dropDownVisible(true);
        viewModel.morphTo2D();
        expect(viewModel.dropDownVisible()).toEqual(false);

        viewModel.dropDownVisible(true);
        viewModel.morphTo3D();
        expect(viewModel.dropDownVisible()).toEqual(false);

        viewModel.dropDownVisible(true);
        viewModel.morphToColumbusView();
        expect(viewModel.dropDownVisible()).toEqual(false);

        viewModel.destroy();
    });

    it('morphing calls correct transition', function() {
        var mockTransitioner = new MockTransitioner();
        var viewModel = new SceneModePickerViewModel(mockTransitioner);

        expect(mockTransitioner.scene.mode).toEqual(SceneMode.SCENE3D);
        viewModel.morphTo2D();
        expect(mockTransitioner.scene.mode).toEqual(SceneMode.SCENE2D);

        viewModel.morphTo3D();
        expect(mockTransitioner.scene.mode).toEqual(SceneMode.SCENE3D);

        viewModel.morphToColumbusView();
        expect(mockTransitioner.scene.mode).toEqual(SceneMode.COLUMBUS_VIEW);

        viewModel.destroy();
    });

    it('selectedToolTip changes on transition', function() {
        var mockTransitioner = new MockTransitioner();
        var viewModel = new SceneModePickerViewModel(mockTransitioner);

        viewModel.morphTo2D();
        expect(viewModel.selectedTooltip()).toEqual(viewModel.tooltip2D());

        viewModel.morphTo3D();
        expect(viewModel.selectedTooltip()).toEqual(viewModel.tooltip3D());

        viewModel.morphToColumbusView();
        expect(viewModel.selectedTooltip()).toEqual(viewModel.tooltipColumbusView());

        viewModel.destroy();
    });

    it('create throws with undefined transitioner', function() {
        expect(function() {
            return new SceneModePickerViewModel();
        }).toThrow();
    });

});