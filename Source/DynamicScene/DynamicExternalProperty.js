/*global define*/
define([
        '../DynamicScene/processCzml',
        '../Core/getJson'
    ], function(
        processCzml,
        get
        ) {
    "use strict";


    var DynamicExternalDocumentProperty = function() {
        this._source = undefined;
        this._updaterFunctions = undefined;
    };


    DynamicExternalDocumentProperty.prototype.processCzmlIntervals = function(object, packet, dynamicObjectCollection, sourceUri, updaterFunctions) {
        if(object.polling){
            var doc = dynamicObjectCollection;
            if(doc.compositeCollection){
                doc = doc.compositeCollection;
            }
            var collections = doc.getCollections();
            var newDoc = doc.createDynamicObjectCollection();
            collections.splice(collections.length, 0, newDoc);
            doc.setCollections(collections);

            var that = this;
            this._source = object.polling;
            this._updaterFunctions = updaterFunctions;
            var refreshInterval = object.refreshInterval;
            if(typeof refreshInterval !== 'undefined'){
                (function poll(){
                    setTimeout(function(){
                        DynamicExternalDocumentProperty.refreshInterval(that._source, newDoc, that._updaterFunctions, poll);
                    }, refreshInterval * 1000);
                })();
            }
            else{
                DynamicExternalDocumentProperty.refreshInterval(this._source, newDoc, this._updaterFunctions);
            }
        }
    };

    DynamicExternalDocumentProperty.refreshInterval = function(source, dynamicObjectCollection, updaterFunctions, poll){
        get(source).then(function(data) {
            processCzml(data, dynamicObjectCollection, source, updaterFunctions);
            if(typeof poll !== 'undefined'){
                poll();
            }
        });
    };


    return DynamicExternalDocumentProperty;
});