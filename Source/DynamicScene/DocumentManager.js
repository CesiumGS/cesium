/*global define*/
define([
        '../Core/createGuid',
        '../Core/DeveloperError',
        '../Core/Iso8601',
        '../Core/TimeInterval',
        './CompositeDynamicObjectCollection',
        './DynamicObjectCollection',
        './IterationDrivenBufferUpdater',
        './processCzml',
        './SystemClockBufferUpdater',
        './EventSourceBufferUpdater',
        './VisualizerCollection'
    ], function(
            createGuid,
            DeveloperError,
            Iso8601,
            TimeInterval,
            CompositeDynamicObjectCollection,
            DynamicObjectCollection,
            IterationDrivenBufferUpdater,
            processCzml,
            SystemClockDrivenBufferUpdater,
            EventSourceBufferUpdater,
            VisualizerCollection
        ) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias DocumentManager
     * @constructor
     * @param {Scene} The current scene.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @exports DocumentManager
     */
    var DocumentManager = function(scene){
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this.compositeCollections = [];
        this.visualizers = [];
        this.scene = scene;
    };

    /**
     * DOC_TBA
     *
     * @param {Scene} The current scene.
     *
     */
    DocumentManager.prototype.add = function(json, documentName){
        var dynamicObjectCollection  = new DynamicObjectCollection();
        var cDoc = new CompositeDynamicObjectCollection([dynamicObjectCollection]);
        if(typeof documentName !== 'undefined'){
            cDoc.documentName = documentName;
        }
        else{
            cDoc.documentName = createGuid();
        }
        this.compositeCollections.push(cDoc);
        this.visualizers.push(VisualizerCollection.createCzmlStandardCollection(this.scene, cDoc));
        this.process(json, dynamicObjectCollection, documentName);
        return cDoc;
    };

    /**
     * DOC_TBA
     *
     * @param {String} The document's name to remove from the current composite collection.
     *
     * @exception {DeveloperError} documentName is required.
     */
    DocumentManager.prototype.remove = function(documentName){
        if(typeof documentName === 'undefined'){
            throw new DeveloperError('documentName is required.');
        }
        var length = this.compositeCollections.length;
        for(var i = 0; i < length; ++i){
            var compositeCollection = this.compositeCollections[i];
            if(compositeCollection.documentName === documentName){
                this.visualizers[i].removeAllPrimitives();
                compositeCollection.clear();
                this.compositeCollections.splice(i, 1);
                this.visualizers.splice(i, 1);
                break;
            }
        }
    };

    /**
     * DOC_TBA
     *
     */
    DocumentManager.prototype.removeAll = function(){
        var length = this.visualizers.length;
        for(var i = 0; i < length; ++i){
            this.visualizers[i].removeAllPrimitives();
            this.compositeCollections[i].clear();
        }
    };

    /**
     * DOC_TBA
     *
     */
    DocumentManager.prototype.process = function(json, dynamicObjectCollection, documentName){
        var compositeDynamicObjectCollection = dynamicObjectCollection.compositeCollection;
        var updatedObjects = processCzml(json, dynamicObjectCollection, documentName);
        var length = updatedObjects.length;
        for(var i = 0; i < length; ++i){
            var updatedObject = updatedObjects[i];
            if(typeof updatedObject.external !== 'undefined'){
                var external = updatedObject.external;
                var doc = new DynamicObjectCollection();
                if(typeof external.polling !== 'undefined'){
                    if(typeof external.refreshInterval !== 'undefined'){
                        doc.updater = new SystemClockDrivenBufferUpdater(this, external.polling, external.refreshInterval);
                    }
                    else{
                        doc.updater = new IterationDrivenBufferUpdater(this, external.polling, 1);
                    }
                }
                else if(typeof external.eventsource !== 'undefined'){
                    doc.updater = new EventSourceBufferUpdater(this, external.eventsource, external.eventname);
                }
                var scope = external.scope;
                if(scope && scope === "SHARED"){
                    var collections = compositeDynamicObjectCollection.getCollections();
                    collections.splice(collections.length, 0, doc);
                    compositeDynamicObjectCollection.setCollections(collections);
                }
                else{
                    var cDoc = new CompositeDynamicObjectCollection([doc]);
                    cDoc.documentName = createGuid();
                    cDoc.parent = compositeDynamicObjectCollection;
                    this.compositeCollections.push(cDoc);
                    this.visualizers.push(VisualizerCollection.createCzmlStandardCollection(this.scene, cDoc));
                }
            }
        }
    };

    /**
     * DOC_TBA
     *
     * @param {String} The id of the object to retrieve.
     * @param {String} The document's name to find the object.
     *
     * @exception {DeveloperError} documentName is required.
     */
    DocumentManager.prototype.getObject = function(objectId, documentName){
        if(typeof documentName === 'undefined'){
            throw new DeveloperError('documentName is required.');
        }
        var length = this.compositeCollections.length;
        for(var i = 0; i < length; ++i){
            var compositeCollection = this.compositeCollections[i];
            if(compositeCollection.documentName === documentName){
                return compositeCollection.getObject(objectId);
            }
        }
        return undefined;
    };

    /**
     * Computes the maximum availability of the DynamicObjects in the collection.
     * If the collection contains a mix of infinitely available data and non-infinite data,
     * It will return the interval pertaining to the non-infinite data only.  If all
     * data is infinite, an infinite interval will be returned.
     * @memberof CompositeDynamicObjectCollection
     *
     * @returns {TimeInterval} The availability of DynamicObjects in the collection.
     */
    DocumentManager.prototype.computeAvailability = function() {
        var startTime = Iso8601.MAXIMUM_VALUE;
        var stopTime = Iso8601.MINIMUM_VALUE;
        var i;
        var len;
        var collection;
        var length = this.compositeCollections.length;
        for(var j = 0; j < length; ++j){
            var cDoc = this.compositeCollections[j];
            var collections = cDoc.getCollections();
            for (i = 0, len = collections.length; i < len; i++) {
                collection = collections[i];
                var availability = collection.computeAvailability();
                if (availability.start !== Iso8601.MINIMUM_VALUE && availability.start.lessThan(startTime)) {
                    startTime = availability.start;
                }
                if (availability.stop !== Iso8601.MAXIMUM_VALUE && availability.stop.greaterThan(stopTime)) {
                    stopTime = availability.stop;
                }
            }
        }
        if (startTime !== Iso8601.MAXIMUM_VALUE && stopTime !== Iso8601.MINIMUM_VALUE) {
            return new TimeInterval(startTime, stopTime, true, true);
        }
        return new TimeInterval(Iso8601.MINIMUM_VALUE, Iso8601.MAXIMUM_VALUE, true, true);
    };

    /**
     * DOC_TBA
     *
     * @param {JulianDate} The current time.
     */
    DocumentManager.prototype.update = function(currentTime){
        var length = this.visualizers.length;
        for(var i = 0; i <  length; ++i){
            this.compositeCollections[i].updateBuffer(currentTime);
            this.visualizers[i].update(currentTime);
        }
    };

    return DocumentManager;
});