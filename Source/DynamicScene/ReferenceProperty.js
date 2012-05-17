/*global define*/
define(function() {
    "use strict";

    //TODO We should probably have a ReferencePositionProperty and a ReferenceDirectionProperty
    //rather than have them all tied together like this.  Though it might be easier to just
    //keep it this way.

    function ReferenceProperty(buffer, targetObjectId, targetPropertyName) {
        this.targetProperty = undefined;
        this.buffer = buffer;
        this.targetObjectId = targetObjectId;
        this.targetPropertyName = targetPropertyName;
    }

    ReferenceProperty.fromString = function(buffer, referenceString) {
        var parts = referenceString.split(".");
        if (parts.length === 2) {
            var objectId = parts[0].slice(1);
            var property = parts[1];
            return new ReferenceProperty(buffer, objectId, property);
        }
    };

    ReferenceProperty.prototype.resolve = function(buffer) {
        var targetObject = buffer.getObject(this.targetObjectId);
        if (typeof targetObject !== 'undefined') {
            this.targetProperty = targetObject[this.targetPropertyName];
        }
    };

    ReferenceProperty.prototype.getValue = function(time) {
        var targetProperty = this.targetProperty;
        if (typeof targetProperty === 'undefined') {
            this.resolve(this.buffer);
            targetProperty = this.targetProperty;
        }

        if (typeof targetProperty !== 'undefined') {
            return targetProperty.getValue(time);
        }

        return undefined;
    };

    ReferenceProperty.prototype.getValueCartographic = function(time) {
        var targetProperty = this.targetProperty;
        if (typeof targetProperty === 'undefined') {
            this.resolve(this.buffer);
            targetProperty = this.targetProperty;
        }

        if (typeof targetProperty !== 'undefined') {
            return targetProperty.getValueCartographic(time);
        }

        return undefined;
    };

    ReferenceProperty.prototype.getValueCartesian = function(time) {
        var targetProperty = this.targetProperty;
        if (typeof targetProperty === 'undefined') {
            this.resolve(this.buffer);
            targetProperty = this.targetProperty;
        }

        if (typeof targetProperty !== 'undefined') {
            return targetProperty.getValueCartesian(time);
        }

        return undefined;
    };

    ReferenceProperty.prototype.getValueSpherical = function(time) {
        var targetProperty = this.targetProperty;
        if (typeof targetProperty === 'undefined') {
            this.resolve(this.buffer);
            targetProperty = this.targetProperty;
        }

        if (typeof targetProperty !== 'undefined') {
            return targetProperty.getValueSpherical(time);
        }

        return undefined;
    };

    return ReferenceProperty;
});