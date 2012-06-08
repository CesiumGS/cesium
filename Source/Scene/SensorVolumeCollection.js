/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        './ComplexConicSensorVolume',
        './CustomSensorVolume',
        './RectangularPyramidSensorVolume'
    ], function(
        DeveloperError,
        destroyObject,
        ComplexConicSensorVolume,
        CustomSensorVolume,
        RectangularPyramidSensorVolume) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name SensorVolumeCollection
     * @constructor
     */
    function SensorVolumeCollection() {
        this._sensors = [];
    }

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
     * @see SensorVolumeCollection#addCustom
     */
    SensorVolumeCollection.prototype.addComplexConic = function(template) {
        var sensor = new ComplexConicSensorVolume(template);
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
    SensorVolumeCollection.prototype.update = function(context, sceneState) {
        var sensors = this._sensors;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].update(context, sceneState);
        }
    };

    /**
     * @private
     */
    SensorVolumeCollection.prototype.render = function(context) {
        var sensors = this._sensors;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].render(context);
        }
    };

    /**
     * @private
     */
    SensorVolumeCollection.prototype.updateForPick = function(context) {
        var sensors = this._sensors;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].updateForPick(context);
        }
    };

    /**
     * @private
     */
    SensorVolumeCollection.prototype.renderForPick = function(context, framebuffer) {
        var sensors = this._sensors;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].renderForPick(context, framebuffer);
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