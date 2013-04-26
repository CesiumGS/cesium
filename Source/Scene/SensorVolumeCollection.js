/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/DeveloperError',
        '../Core/Intersect',
        '../Core/Matrix4',
        './CustomSensorVolume',
        './RectangularPyramidSensorVolume',
        './SceneMode'
    ], function(
        defaultValue,
        destroyObject,
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        DeveloperError,
        Intersect,
        Matrix4,
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
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Sensors.html">Cesium Sandcastle Sensors Demo</a>
     */
    var SensorVolumeCollection = function() {
        this._sensors = [];
    };

    /**
     * DOC_TBA
     *
     * @memberof SensorVolumeCollection
     *
     * @see SensorVolumeCollection#addCustom
     * @see SensorVolumeCollection#addComplexConic
     */
    SensorVolumeCollection.prototype.addRectangularPyramid = function(template) {
        var sensor = new RectangularPyramidSensorVolume(template);
        this._sensors.push(sensor);
        return sensor;
    };

    /**
     * DOC_TBA
     *
     * @memberof SensorVolumeCollection
     *
     * @see SensorVolumeCollection#addRectangularPyramid
     * @see SensorVolumeCollection#addComplexConic
     */
    SensorVolumeCollection.prototype.addCustom = function(template) {
        var sensor = new CustomSensorVolume(template);
        this._sensors.push(sensor);
        return sensor;
    };

    /**
     * DOC_TBA
     *
     * @memberof SensorVolumeCollection
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
     * @memberof SensorVolumeCollection
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
     * @memberof SensorVolumeCollection
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
     * @memberof SensorVolumeCollection
     *
     * @see SensorVolumeCollection#getLength
     */
    SensorVolumeCollection.prototype.get = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.');
        }

        return this._sensors[index];
    };

    /**
     * DOC_TBA
     *
     * @memberof SensorVolumeCollection
     *
     * @see SensorVolumeCollection#get
     */
    SensorVolumeCollection.prototype.getLength = function() {
        return this._sensors.length;
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
     * @memberof SensorVolumeCollection
     */
    SensorVolumeCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof SensorVolumeCollection
     */
    SensorVolumeCollection.prototype.destroy = function() {
        this.removeAll();
        return destroyObject(this);
    };

    return SensorVolumeCollection;
});
