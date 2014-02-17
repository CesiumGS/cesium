/*global define*/
define(['../Core/defineProperties', '../Core/DeveloperError'], function(defineProperties, DeveloperError) {
    "use strict";

    var GeometryUpdater = function(dynamicObject) {
        DeveloperError.throwInstantiationError();
    };

    GeometryUpdater.PerInstanceColorAppearanceType = undefined;

    GeometryUpdater.MaterialAppearanceType = undefined;

    defineProperties(GeometryUpdater.prototype, {
        dynamicObject : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        fillEnabled : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        hasConstantFill : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        fillMaterialProperty : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        outlineEnabled : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        hasConstantOutline : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        outlineColorProperty : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        isDynamic : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        isClosed : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        geometryChanged : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        }
    });

    GeometryUpdater.prototype.isOutlineVisible = function(time) {
        DeveloperError.throwInstantiationError();
    };

    GeometryUpdater.prototype.isFilled = function(time) {
        DeveloperError.throwInstantiationError();
    };

    GeometryUpdater.prototype.createGeometryInstance = function(time) {
        DeveloperError.throwInstantiationError();
    };

    GeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        DeveloperError.throwInstantiationError();
    };

    GeometryUpdater.prototype.isDestroyed = function() {
        DeveloperError.throwInstantiationError();
    };

    GeometryUpdater.prototype.destroy = function() {
        DeveloperError.throwInstantiationError();
    };

    GeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        DeveloperError.throwInstantiationError();
    };

    var DynamicGeometryUpdater = function(primitives, geometryUpdater) {
        DeveloperError.throwInstantiationError();
    };

    DynamicGeometryUpdater.prototype.update = function(time) {
        DeveloperError.throwInstantiationError();
    };

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        DeveloperError.throwInstantiationError();
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        DeveloperError.throwInstantiationError();
    };

    return GeometryUpdater;
});