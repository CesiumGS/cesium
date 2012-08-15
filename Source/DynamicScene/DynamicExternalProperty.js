/*global define*/
define([
        '../DynamicScene/processCzml',
        '../Core/TimeIntervalCollection'
    ], function(
        processCzml,
        TimeIntervalCollection
        ) {
    "use strict";


    var DynamicExternalDocumentProperty = function() {
        this._dynamicProperties = [];
        this._propertyIntervals = new TimeIntervalCollection();
        this._cachedTime = undefined;
        this._cachedInterval = undefined;
        this._fit = {};
    };


    DynamicExternalDocumentProperty.prototype.processCzmlIntervals = function(object, packet, dynamicObjectCollection, sourceUri, updaterFunctions) {
        if(object.polling){
            var that = this;
            var source = object.polling;
            var refreshInterval = object.refreshInterval;
            if(typeof refreshInterval !== 'undefined'){
                setInterval(function(){
                    that.refreshInterval(source, dynamicObjectCollection, updaterFunctions);
                }, refreshInterval * 1000);
            }
            else{
                this.refreshInterval(source, dynamicObjectCollection, updaterFunctions);
            }
        }

    };

    DynamicExternalDocumentProperty.prototype.refreshInterval = function(source, dynamicObjectCollection, updaterFunctions){
        var doc = dynamicObjectCollection;
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", source, true);
        xmlHttp.setRequestHeader('Accept', 'application/json');
        xmlHttp.responseType='text';
        xmlHttp.onload = function(){
            if(xmlHttp.status === 200){
                var text = JSON.parse(xmlHttp.responseText);
                if(doc.compositeCollection){
                    processCzml(text, doc, source, updaterFunctions);
                }else{
                    var collections = doc.getCollections();
                    var newLayer = doc.createDynamicObjectCollection();
                    collections.splice(1, 0, newLayer);
                    doc.setCollections(collections);
                    processCzml(text, newLayer, source, updaterFunctions);
                }
            }
        };
        xmlHttp.send(null);
    };


    return DynamicExternalDocumentProperty;
});