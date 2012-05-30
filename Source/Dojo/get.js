/*global define*/
define(['dojo/_base/xhr'], function(xhr) {
    "use strict";

    return function(uri) {
        return xhr.get({
            url : uri,
            headers : {
                'Accept' : 'application/json'
            },
            handleAs : 'text'
        }).then(function(value) {
            return JSON.parse(value);
        });
    };
});