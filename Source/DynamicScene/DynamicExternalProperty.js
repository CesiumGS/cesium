/*global define*/
define([
        '../DynamicScene/processCzml'
    ], function(
        processCzml
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
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", source, true);
        xmlHttp.setRequestHeader('Accept', 'application/json');
        xmlHttp.setRequestHeader("Cache-Control", "no-cache");
        xmlHttp.responseType='text';
        xmlHttp.onload = function(){
            if(xmlHttp.status === 200){
                var text = JSON.parse(xmlHttp.responseText);
                processCzml(text, dynamicObjectCollection, source, updaterFunctions);
                if(typeof poll !== 'undefined'){
                    poll();
                }
            }
        };
        xmlHttp.send(null);
    };


    return DynamicExternalDocumentProperty;
});