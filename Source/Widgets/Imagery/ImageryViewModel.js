/*global define*/
define(['../../Core/DeveloperError',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            SceneMode,
            createCommand,
            knockout) {
    "use strict";

    /**
     * The ViewModel for {@link SceneModeWidget}.
     * @alias ImageryViewModel
     * @constructor
     *
     * @param {SceneTransitioner} transitioner The SceneTransitioner instance to use.
     *
     * @see SceneModeWidget
     */
    var ImageryViewModel = function(imageLayers) {
        var dropDownVisible = knockout.observable(false);
        var selectedViewModel = knockout.observable();

        this.changeProvider = function(viewModel, mouseEvent) {
            if (imageLayers.getLength() > 0) {
                imageLayers.remove(imageLayers.get(0));
            }
            var newLayer = viewModel.create();
            if (typeof newLayer !== 'undefined') {
                imageLayers.addImageryProvider(newLayer, 0);
            }
            selectedViewModel(viewModel);
            dropDownVisible(false);
        };

        /**
         *
         */
        this.imageryProviderViewModels = knockout.observableArray();

        /**
         * Gets or sets whether the button dropdown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = dropDownVisible;

        /**
         * Command to toggle dropDown visibility.
         * @type Command
        */
        this.toggleDropdown = createCommand(function() {
            dropDownVisible(!dropDownVisible());
        });

        /**
         * Gets the current selected mode's tooltip.
         * @type Observable
        */
        this.selected = knockout.computed(function() {
            return selectedViewModel();
        });
    };

    return ImageryViewModel;
});