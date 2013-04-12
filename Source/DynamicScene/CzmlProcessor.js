/*global define*/
define([
        '../Core/createGuid',
        '../Core/DeveloperError',
        '../Core/Iso8601',
        '../Core/TimeInterval',
        './CompositeDynamicObjectCollection',
        './DynamicObjectCollection',
        './IterationDrivenUpdater',
        './TimeIntervalUpdater',
        './processCzml',
        './SystemClockUpdater',
        './EventSourceUpdater',
        './VisualizerCollection'
    ], function(
            createGuid,
            DeveloperError,
            Iso8601,
            TimeInterval,
            CompositeDynamicObjectCollection,
            DynamicObjectCollection,
            IterationDrivenUpdater,
            TimeIntervalUpdater,
            processCzml,
            SystemClockUpdater,
            EventSourceUpdater,
            VisualizerCollection
        ) {
    "use strict";

    /**
     * A class to maintain multiple {@link CompositeDynamicObjectCollection}. Use this class to add, remove and update distinct CZML
     * from various sources.
     *
     * @alias CzmlProcessor
     * @constructor
     *
     * @param {Scene} scene The current scene.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see Scene
     */
    var CzmlProcessor = function(scene){
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this.compositeCollections = [];
        this.visualizers = [];
        this._scene = scene;
        this._updaters = [];
        this._documentAdded = [];
    };

    var Updater = function(cdoc, updater){
        this._compositeDynamicObjectCollection = cdoc;
        this._updater = updater;
    };

    Updater.prototype.update = function(currentTime){
        this._updater.update(currentTime);
    };

    /**
     * Processes the JSON object to a new {@link CompositeDynamicObjectCollection} and adds it to the {@link CompositeDynamicObjectCollection} container.
     * If the CZML fragment contains an external property, it creates a new {@link CompositeDynamicObjectCollection} according
     * to the scope of the external property. If the scope property is not specified or specified as PRIVATE. A new
     * CompositeDynamicObjectCollection is created and populated with the external CZML data. If the scope property
     * is specified as SHARED, then a new DynamicObjectCollection is created, populated with the external CZML and
     * added to the existing CompositeDynamicObjectCollection. Any properties in a SHARED scope are then merged.
     * @memberof CzmlProcessor
     *
     * @param {Object} json A JSON object with valid CZML.
     * @param {String} name The name to associate with the {@link CompositeDynamicObjectCollection}.
     * @returns {CompositeDynamicObjectCollection} The newly created {@link CompositeDynamicObjectCollection}.
     *
     */
    CzmlProcessor.prototype.add = function(json, name){
        var dynamicObjectCollection  = new DynamicObjectCollection();
        var cDoc = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        if(typeof name !== 'undefined') {
            cDoc.name = name;
        } else {
            cDoc.name = createGuid();
        }

        this.compositeCollections.push(cDoc);
        this.visualizers.push(VisualizerCollection.createCzmlStandardCollection(this._scene, cDoc));
        this.process(json, dynamicObjectCollection, name);
        return cDoc;
    };

    /**
     * Removes a {@link CompositeDynamicObjectCollection} from the {@link CompositeDynamicObjectCollection} collection.
     * @memberof CzmlProcessor
     *
     * @param {String} name The {@link CompositeDynamicObjectCollection}'s name to remove from the current composite collection.
     *
     * @exception {DeveloperError} name is required.
     */
    CzmlProcessor.prototype.remove = function(name){
        if(typeof name === 'undefined'){
            throw new DeveloperError('name is required.');
        }
        var length = this.compositeCollections.length;
        for(var i = 0; i < length; ++i){
            var compositeCollection = this.compositeCollections[i];
            if(compositeCollection.name === name){
                var updaterLength = this._updaters.length;
                for(var j = 0; j < updaterLength; ++j){
                    if(this._updaters[j]._compositeDynamicObjectCollection === compositeCollection){
                        this._updaters.splice(j, 1);
                        break;
                    }
                }
                this.visualizers[i].removeAllPrimitives();
                compositeCollection.clear();
                this.compositeCollections.splice(i, 1);
                this.visualizers.splice(i, 1);
                break;
            }
        }
    };

    /**
     * Removes all {@link CompositeDynamicObjectCollection} from the composite collection.
     * @memberof CzmlProcessor
     */
    CzmlProcessor.prototype.removeAll = function(){
        var length = this.visualizers.length;
        for(var i = 0; i < length; ++i){
            this.visualizers[i].removeAllPrimitives();
            this.compositeCollections[i].clear();
        }
        this.visualizers.length = 0;
        this.compositeCollections.length = 0;
        this._updaters.length = 0;
    };

    /**
     * Processes the JSON object and updates the {@link DynamicObjectCollection}. It then looks for any external CZML properties and if the CZML
     * contains an external CZML property, it creates new {@link CompositeDynamicObjectCollection} according to the scope of the external property. If the
     * scope property is not specified or specified as PRIVATE, a new {@link CompositeDynamicObjectCollection} is created
     * and populated with the external CZML data. If the scope property is specified as SHARED, then a new
     * {@link DynamicObjectCollection} is created, populated with the external CZML and added to the existing
     * {@link CompositeDynamicObjectCollection}. Any properties in a SHARED scope are then merged.
     * @memberof CzmlProcessor
     *
     * @param {Object} json The JSON object to process.
     * @param {DynamicObjectCollection} dynamicObjectCollection The {@link DynamicObjectCollection} to update with the processed CZML.
     * @param {String} name The name of the {@link CompositeDynamicObjectCollection}.
     */
    CzmlProcessor.prototype.process = function(json, dynamicObjectCollection, name){
        var compositeDynamicObjectCollection = dynamicObjectCollection.compositeCollection;
        var updatedObjects = processCzml(json, dynamicObjectCollection, name);
        var length = updatedObjects.length;
        for(var i = 0; i < length; ++i){
            var updatedObject = updatedObjects[i];
            if(typeof updatedObject.external !== 'undefined'){
                var external = updatedObject.external;
                var doc = new DynamicObjectCollection();
                if (typeof external.sourceType === 'undefined' || external.sourceType.getValue(Iso8601.MINIMUM_VALUE) === 'json') {
                    if(typeof external.pollingUpdate === 'undefined'){
                        this._updaters.push(new Updater(compositeDynamicObjectCollection, new IterationDrivenUpdater(this, doc, external.url, 1)));
                    } else {
                        this._updaters.push(new Updater(compositeDynamicObjectCollection, new SystemClockUpdater(this, doc, external)));
                    }
                } else if (external.sourceType.getValue(Iso8601.MINIMUM_VALUE) === 'eventstream') {
                    if(typeof external.simulationDrivenUpdate === 'undefined'){
                        this._updaters.push(new Updater(compositeDynamicObjectCollection, new EventSourceUpdater(this, doc, external)));
                    }  else {
                        this._updaters.push(new Updater(compositeDynamicObjectCollection, new TimeIntervalUpdater(this, doc, external)));
                    }
                }
                var scope = external.scope.getValue(Iso8601.MINIMUM_VALUE);
                if(scope && scope === 'SHARED'){
                    var collections = compositeDynamicObjectCollection.getCollections();
                    collections.splice(collections.length, 0, doc);
                    compositeDynamicObjectCollection.setCollections(collections);
                    this._documentAddedCallback(compositeDynamicObjectCollection);
                } else {
                    var cDoc = new CompositeDynamicObjectCollection([doc]);
                    cDoc.name = createGuid();
                    cDoc.parent = compositeDynamicObjectCollection;
                    this.compositeCollections.push(cDoc);
                    this.visualizers.push(VisualizerCollection.createCzmlStandardCollection(this._scene, cDoc));
                    this._documentAddedCallback(cDoc);
                }
            }
        }
    };

    CzmlProcessor.prototype._documentAddedCallback = function(compositeDynamicObjectCollection) {
        for ( var i = 0; i < this._documentAdded.length; ++i) {
            this._documentAdded[i](compositeDynamicObjectCollection);
        }
    };

    CzmlProcessor.prototype.addDocumentAddedListener = function(callback) {
        this._documentAdded.push(callback);
    };

    /**
     * Returns all {@link CompositeDynamicObjectCollection}.
     * @memberof CzmlProcessor
     *
     * @returns {Array} The list of {@link CompositeDynamicObjectCollection} contained in the {@link CzmlProcessor}
     *
     * @see CompositeDynamicObjectCollection
     */
    CzmlProcessor.prototype.getDocuments = function(){
        return this.compositeCollections;
    };

    /**
     * Returns all visualizers.
     * @memberof CzmlProcessor
     *
     * @returns {Array} The list of {@link VisualizerCollection} contained in the {@link CzmlProcessor}
     *
     * @see VisualizerCollection
     */
    CzmlProcessor.prototype.getVisualizers = function(){
        return this.visualizers;
    };

    /**
     * Gets an object with the specified id in the specified {@link CompositeDynamicObjectCollection}.
     * @memberof CzmlProcessor
     *
     * @param {String} objectId The id of the object to retrieve.
     * @param {String} name The {@link CompositeDynamicObjectCollection}'s name to find the object.
     * @returns {DynamicObject} The {@link DynamicObject} with the provided id or undefined if not found.
     *
     * @exception {DeveloperError} objectId is required.
     * @exception {DeveloperError} name is required
     *
     * @see {DynamicObject}
     */
    CzmlProcessor.prototype.getObject = function(objectId, name){
        if(typeof objectId === 'undefined'){
            throw new DeveloperError('objectId is required.');
        }
        if(typeof name === 'undefined'){
            throw new DeveloperError('name is required.');
        }
        var length = this.compositeCollections.length;
        for(var i = 0; i < length; ++i){
            var compositeCollection = this.compositeCollections[i];
            if(compositeCollection.name === name){
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
     * @memberof CzmlProcessor
     *
     * @returns {TimeInterval} The availability of DynamicObjects in the collection.
     */
    CzmlProcessor.prototype.computeAvailability = function() {
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
     * Calls all document updaters and visualizers with the current time.
     * @memberof CzmlProcessor
     *
     * @param {JulianDate} currentTime The current time.
     */
    CzmlProcessor.prototype.update = function(currentTime){
        var updaters = this._updaters;
        var length = updaters.length;
        var i;
        for(i = 0; i < length; ++i){
            updaters[i].update(currentTime);
        }
        length = this.visualizers.length;
        for(i = 0; i <  length; ++i){
            this.visualizers[i].update(currentTime);
        }
    };

    return CzmlProcessor;
});