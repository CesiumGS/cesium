/*global define*/
define(function() {
    "use strict";

    /**
     * @private
     */
    var getBasePath = function(url) {
        var basePath = '';
        var i = url.lastIndexOf('/');
        if (i !== -1) {
            basePath = url.substring(0, i + 1);
        }

        return basePath;
    };

    return getBasePath;
});
