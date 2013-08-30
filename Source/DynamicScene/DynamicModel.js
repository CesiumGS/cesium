/*global define*/
define(['../Core/defaultValue'], function(defaultValue) {
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