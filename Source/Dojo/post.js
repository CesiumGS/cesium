/*global define*/
define(['dojo/_base/xhr'], function(xhr) {
    "use strict";

    return function(uri, data) {
        return xhr.post({
            url : uri,
            headers : {
                'Content-Type' : 'application/json',
                'Accept' : 'application/json'
            },
            handleAs : 'text',
            postData : data && JSON.stringify(data)
        });
    };
});