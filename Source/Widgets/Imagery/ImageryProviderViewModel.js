/*global define*/
define(['../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            destroyObject,
            knockout) {
    "use strict";
    var ImageryProviderViewModel = function(name, createFunction) {
        this.name = knockout.observable(name);
        this.create = createFunction;
    };
    return ImageryProviderViewModel;
});