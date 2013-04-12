/*global define*/
define(['./DeveloperError'],function(DeveloperError) {
    "use strict";

    /**
     * Helper functions to turn a JSON object to query parameters and query parameters to a JSON object.
     *
     * @exports uriQuery
     */
    var uriQuery = {
            /**
             * Breaks a JSON object into query parameters.
             *
             * @param {Object} obj A JSON object to break down into query parameters.
             * @param {String} prefix An optional parameter that prepends text onto the query parameter.
             * @returns A query parameter.
             * @exception {DeveloperError} obj is required.
             * @example
             * var queryString = uriQuery.objectToQuery({foo: "access", bar: { what: 123, no: [1, 2, 3] }});
             */
            objectToQuery: function(obj, prefix){
                if (typeof obj === 'undefined') {
                    throw new DeveloperError('obj is required.');
                }
                var str = [];
                var value;
                for(var p in obj) {
                    if(obj.hasOwnProperty(p)){
                        value = obj[p];
                        var t = prefix ? prefix + '[' + p + ']' : p;
                        if(typeof value === 'object'){
                            str.push(this.objectToQuery(value, t));
                        } else {
                            str.push(encodeURIComponent(t) + "=" + encodeURIComponent(value));
                        }
                    }
                }
                return str.join("&");
            },
            /**
             * Breaks query parameters into an JSON object.
             * @param {String} Query parameters
             * @returns A JSON object.
             * @exception {DeveloperError} queryParameters is required.
             * @example
             * var obj = uriQuery.queryToObject('http://localhost?name=Bruce&value=kicks');
             */
            queryToObject: function(queryParameters){
                if (typeof queryParameters === 'undefined') {
                    throw new DeveloperError('queryParameters is required.');
                }
                var re = new RegExp(/\?(.+)$/);
                var params = re.exec(queryParameters);
                if(params === null){
                    return undefined;
                }
                params = params[1].split("&");
                var queryStringList = {};
                for(var i = 0; i < params.length;++i){
                    var tmp = params[i].split("=");
                    queryStringList[tmp[0]] = decodeURI(tmp.length === 2 ? tmp[1] : '');
                }
                return queryStringList;
            }

    };


    return uriQuery;
});