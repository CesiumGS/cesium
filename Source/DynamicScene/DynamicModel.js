/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlModel',
        './DynamicProperty'
    ], function(
        TimeInterval,
        defaultValue,
        CzmlBoolean,
        CzmlNumber,
        CzmlModel,
        DynamicProperty) {
    "use strict";

    /**
     * Represents a time-dynamic model, typically used in conjunction with DynamicModelVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicModel
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicModelVisualizer
     * @see VisualizerCollection
     * @see CustomSensor
     * @see CzmlDefaults
     */
    var DynamicModel = function() {
        /**
         * A DynamicProperty of type CzmlBoolean which determines the model's visibility.
         * @type DynamicProperty
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlCartesian3 which determines the model's scale.
         * @type DynamicProperty
         */
        this.scale = undefined;
        /**
         * A DynamicMaterialProperty which determines the uri.
         * @type DynamicMaterialProperty
         */
        this.uri = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's model.
     * If the DynamicObject does not have a model, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the model data.
     * @param {Object} packet The CZML packet to process.
     * @param {DynamicObject} dynamicObjectCollection The DynamicObjectCollection to which the DynamicObject belongs.
     *
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicModel.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var modelData = packet.model;
        if (typeof modelData === 'undefined') {
            return false;
        }

        var modelUpdated = false;
        var model = dynamicObject.model;
        modelUpdated = typeof model === 'undefined';
        if (modelUpdated) {
            dynamicObject.model = model = new DynamicModel();
        }

        var interval = modelData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof modelData.show !== 'undefined') {
            var show = model.show;
            if (typeof show === 'undefined') {
                model.show = show = new DynamicProperty(CzmlBoolean);
                modelUpdated = true;
            }
            show.processCzmlIntervals(modelData.show, interval, sourceUri);
        }

        if (typeof modelData.scale !== 'undefined') {
            var scale = model.scale;
            if (typeof scale === 'undefined') {
                model.scale = scale = new DynamicProperty(CzmlNumber);
                modelUpdated = true;
            }
            scale.processCzmlIntervals(modelData.scale, interval, sourceUri);
        }

        if (typeof modelData.uri !== 'undefined') {
            var uri = model.uri;
            if (typeof uri === 'undefined') {
                model.uri = uri = new DynamicProperty(CzmlModel);
                modelUpdated = true;
            }
            uri.processCzmlIntervals(modelData.uri, interval, sourceUri);
        }

        return modelUpdated;
    };

    /**
     * Given two DynamicObjects, takes the model properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicModel.mergeProperties = function(targetObject, objectToMerge) {
        var modelToMerge = objectToMerge.model;
        if (typeof modelToMerge !== 'undefined') {

            var targetModel = targetObject.model;
            if (typeof targetModel === 'undefined') {
                targetObject.model = targetModel = new DynamicModel();
            }

            targetModel.show = defaultValue(targetModel.show, modelToMerge.show);
            targetModel.scale = defaultValue(targetModel.scale, modelToMerge.scale);
            targetModel.uri = defaultValue(targetModel.uri, modelToMerge.uri);
        }
    };

    /**
     * Given a DynamicObject, undefines the model associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the model from.
     *
     * @see CzmlDefaults
     */
    DynamicModel.undefineProperties = function(dynamicObject) {
        dynamicObject.model = undefined;
    };

    return DynamicModel;
});