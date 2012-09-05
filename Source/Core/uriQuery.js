/*global define*/
define(['./DeveloperError'],function(DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports uriQuery
     */
    var uriQuery = {

            objectToQuery:function(obj, prefix){
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
                        }
                        else{
                            str.push(encodeURIComponent(t) + "=" + encodeURIComponent(value));
                        }
                    }
                }
                return str.join("&");
            },

            queryToObject : function(baseUrl){
                if (typeof baseUrl === 'undefined') {
                    throw new DeveloperError('baseUrl is required.');
                }
                baseUrl.match(/\?(.+)$/);
                var params = RegExp.$1;
                if(params === ''){
                    return undefined;
                }
                params = params.split("&");
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