/*global define*/
define(['dojo/_base/xhr'], function(xhr) {
    "use strict";

    return function(uri) {
        return xhr.del({
            url : uri,
            headers : {
                'Accept' : 'application/json'
            },
            handleAs : 'json'
        });
    };
});