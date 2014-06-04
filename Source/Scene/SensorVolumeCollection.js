/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        './CustomSensorVolume',
        './RectangularPyramidSensorVolume',
        './SceneMode'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        CustomSensorVolume,
        RectangularPyramidSensorVolume,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias SensorVolumeCollection
     * @constructor
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Sensors.html|Cesium Sandcastle Sensors Demo}
     */
    var SensorVolumeCollection = function() {
        this._sensors = [];
    };

    defineProperties(SensorVolumeCollection.prototype, {
        /**
         * DOC_TBA
         * @memberof SensorVolumeCollection.prototype
         * @type {Event}
         */
        length : {
            get : function() {
                return this._sensors.length;
            }
        }
    });

    /**
     * DOC_TBA
     *
     * @see SensorVolumeCollection#addCustom
     * @see SensorVolumeCollection#addComplexConic
     */
    SensorVolumeCollection.prototype.addRectangularPyramid = function(options) {
        var sensor = new RectangularPyramidSensorVolume(options);
        this._sensors.push(sensor);
        return sensor;
    };

    /**
     * DOC_TBA
     *
     * @see SensorVolumeCollection#addRectangularPyramid
     * @see SensorVolumeCollection#addComplexConic
     */
    SensorVolumeCollection.prototype.addCustom = function(options) {
        var sensor = new CustomSensorVolume(options);
        this._sensors.push(sensor);
        return sensor;
    };

    /**
     * DOC_TBA
     *
     * @see SensorVolumeCollection#removeAll
     */
    SensorVolumeCollection.prototype.remove = function(sensor) {
        if (sensor) {
            var sensors = this._sensors;
            var i = sensors.indexOf(sensor);
            if (i !== -1) {
                sensors[i].destroy();
                sensors.splice(i, 1);
                return true;
            }
        }

        return false;
    };

    /**
     * DOC_TBA
     *
     * @see SensorVolumeCollection#remove
     */
    SensorVolumeCollection.prototype.removeAll = function() {
        var sensors = this._sensors;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].destroy();
        }

        this._sensors = [];
    };

    /**
     * DOC_TBA
     */
    SensorVolumeCollection.prototype.contains = function(sensor) {
        if (sensor) {
            return (this._sensors.indexOf(sensor) !== -1);
        }

        return false;
    };

    /**
     * DOC_TBA
     *
     * @see SensorVolumeCollection#length
     */
    SensorVolumeCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.');
        }
        //>>includeEnd('debug');

        return this._sensors[index];
    };

    /**
     * @private
     */
    SensorVolumeCollection.prototype.update = function(context, frameState, commandList) {
        var mode = frameState.mode;
        if (mode !== SceneMode.SCENE3D) {
            return;
        }

        var sensors = this._sensors;
        var length = sensors.length;
        for (var i = 0; i < length; ++i) {
            sensors[i].update(context, frameState, commandList);
        }
    };

    /**
     * DOC_TBA
     */
    SensorVolumeCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    SensorVolumeCollection.prototype.destroy = function() {
        this.removeAll();
        return destroyObject(this);
    };

    return SensorVolumeCollection;
});
