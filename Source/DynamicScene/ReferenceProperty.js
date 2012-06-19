/*global define*/
define(function() {
    "use strict";

    function ReferenceProperty(dynamicObjectCollection, targetObjectId, targetPropertyName) {
        this.targetProperty = undefined;
        this.dynamicObjectCollection = dynamicObjectCollection;
        this.targetObjectId = targetObjectId;
        this.targetPropertyName = targetPropertyName;
    }

    ReferenceProperty.fromString = function(dynamicObjectCollection, referenceString) {
        var parts = referenceString.split('.');
        if (parts.length === 2) {
            var objectId = parts[0];
            var property = parts[1];
            return new ReferenceProperty(dynamicObjectCollection, objectId, property);
        }
    };

    ReferenceProperty.prototype.resolve = function() {
        var targetProperty = this.targetProperty;
        if (typeof targetProperty === 'undefined') {
            var resolveBuffer = this.dynamicObjectCollection.parent || this.dynamicObjectCollection;
            var targetObject = resolveBuffer.getObject(this.targetObjectId);
            if (typeof targetObject !== 'undefined') {
                targetProperty = targetObject[this.targetPropertyName];
                this.targetProperty = targetProperty;
            }
        }
        return targetProperty;
    };

    ReferenceProperty.prototype.getValue = function(time, result) {
        var targetProperty = this.resolve();
        return typeof targetProperty !== 'undefined' ? targetProperty.getValue(time, result) : undefined;
    };

    ReferenceProperty.prototype.getValueCartographic = function(time, result) {
        var targetProperty = this.resolve();
        return typeof targetProperty !== 'undefined' ? targetProperty.getValueCartographic(time, result) : undefined;
    };

    ReferenceProperty.prototype.getValueCartesian = function(time, result) {
        var targetProperty = this.resolve();
        return typeof targetProperty !== 'undefined' ? targetProperty.getValueCartesian(time, result) : undefined;
    };

    ReferenceProperty.prototype.getValueSpherical = function(time, result) {
        var targetProperty = this.resolve();
        return typeof targetProperty !== 'undefined' ? targetProperty.getValueSpherical(time, result) : undefined;
    };

    return ReferenceProperty;
});