/**
    @description Support parsing of command line querystrings into JS objects.
    @module common/query
    @example
    
        -q 'format=xml&root+node=documentation&publish='
        
    > becomes
    
        {
            "format": "xml",
            "root node": "documentation",
            "publish": true
        }
*/
(function() {
    var query = module.exports = {
        /**
            @name module:common/query.toObject
            @param {string} querystring
            @returns {object}
         */
        toObject: function(querystring) {
            var object = {};
            
            querystring.replace(
                new RegExp('([^?=&]+)(?:=([^&]*))?', 'g'),
                function($0, key, val) {
                    object[query._decode(key)] = 
                        (typeof val !== 'undefined')? query._decode(val) : true;
                }
            );
            
            return object;
        },
        
        /** @private */
        _decode: function(string) {
            return decodeURIComponent( string.replace(/\+/g, ' ') );
        }
    };
})();