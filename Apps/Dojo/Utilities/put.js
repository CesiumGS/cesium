/*global define*/
define(['dojo/_base/xhr'], function(xhr) {
    "use strict";

    return function(uri, data) {
        return xhr.put({
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