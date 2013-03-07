/*global define*/
define(['../../Core/DeveloperError',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            SceneMode,
            knockout) {
    "use strict";

    var SceneModeViewModel = function(sceneTransitioner) {
        this.transitioner = sceneTransitioner;

        var sceneMode = knockout.observable(this.transitioner.getScene().mode);
        this.sceneMode = sceneMode;

        sceneTransitioner.onTransitionStart.addEventListener(function(transitioner, oldMode, newMode) {
            sceneMode(newMode);
        });
        sceneTransitioner.onTransitionComplete.addEventListener(function(transitioner, oldMode, newMode) {
            sceneMode(newMode);
        });

        var dropDownVisible = knockout.observable(false);
        this.dropDownVisible = dropDownVisible;

        this.toggleDropdown = function() {
            dropDownVisible(!dropDownVisible());
        };

        this.morphTo2D = function() {
            if (sceneMode() === SceneMode.MORPHING) {
                sceneTransitioner.cancelMorph();
            }
            sceneTransitioner.morphTo2D();
            dropDownVisible(false);
        };

        this.morphTo3D = function() {
            if (sceneMode() === SceneMode.MORPHING) {
                sceneTransitioner.cancelMorph();
            }
            sceneTransitioner.morphTo3D();
            dropDownVisible(false);
        };

        this.morphToColumbusView = function() {
            if (sceneMode() === SceneMode.MORPHING) {
                sceneTransitioner.cancelMorph();
            }
            sceneTransitioner.morphToColumbusView();
            dropDownVisible(false);
        };

        this.tooltip2D = '2D';
        this.tooltip3D = '3D';
        this.tooltipColumbusView = 'Colubus View';

        this.tooltip = knockout.computed(function() {
            switch (sceneMode()) {
            case SceneMode.SCENE2D:
                return '2D';
            case SceneMode.SCENE3D:
                return '3D';
            case SceneMode.COLUMBUS_VIEW:
                return 'Columbus View';
            default:
                return 'Morphing';
            }
        });
    };

    return SceneModeViewModel;
});