/*global define*/
define(['../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            destroyObject,
            knockout) {
    "use strict";
    var ImageryProviderViewModel = function(name, imageUrl, createFunction) {
        this.name = knockout.observable(name);
        this.image = knockout.observable('url(' + imageUrl + ')');
        this.create = createFunction;
    };
    return ImageryProviderViewModel;
});