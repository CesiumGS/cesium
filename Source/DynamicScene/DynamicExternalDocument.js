/*global define*/
define([
        './SystemClockBufferUpdater'
    ], function(
        BufferUpdater
        ) {
    "use strict";


    var DynamicExternalDocumentProperty = function() {
    };


    DynamicExternalDocumentProperty.prototype.processCzmlIntervals = function(object, packet, dynamicObjectCollection, sourceUri, updaterFunctions) {
        if(object.polling){
            var doc = dynamicObjectCollection;
            if(doc.compositeCollection){
                doc = doc.compositeCollection;
            }
            var collections = doc.getCollections();
            var newDoc = doc.createDynamicObjectCollection();
            newDoc.updater = new BufferUpdater(newDoc, object.polling, object.refreshInterval * 1000, updaterFunctions);
            collections.splice(collections.length, 0, newDoc);
            doc.setCollections(collections);
        }
    };

    return DynamicExternalDocumentProperty;
});