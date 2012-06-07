/*global define*/
define(['dojo/_base/xhr'], function(xhr) {
    "use strict";

    function loadCzmlFromUrl(dynamicObjectCollection, url, doneCallback) {
        var deferred = xhr.get({
            url : url,
            headers : {
                'Accept' : 'application/json'
            },
            handleAs : 'text'
        }).then(function(value) {
            return JSON.parse(value);
        }).then(function(data) {
            dynamicObjectCollection.processCzml(data, url);
            if (typeof doneCallback !== 'undefined') {
                doneCallback();
            }
        });

        return {
            abort : deferred.cancel
        };
    }

    return loadCzmlFromUrl;
});