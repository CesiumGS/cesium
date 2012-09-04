/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports uriQuery
     */
    var uriQuery = {

            objectToQuery:function(obj, prefix){
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
                baseUrl.match(/\?(.+)$/);
                var params = RegExp.$1;
                params = params.split("&");
                var queryStringList = {};
                for(var i = 0; i < params.length;++i){
                    var tmp = params[i].split("=");
                    queryStringList[tmp[0]] = decodeURI(tmp[1]);
                }
                return queryStringList;
            }

    };


    return uriQuery;
});