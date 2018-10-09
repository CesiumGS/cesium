define(function() {
    'use strict';

    /**
     * @private
     */
    export function appendForwardSlash(url: string) {
        if (url.length === 0 || url[url.length - 1] !== '/') {
            url = url + '/';
        }
        return url;
    }

    return appendForwardSlash;
});
