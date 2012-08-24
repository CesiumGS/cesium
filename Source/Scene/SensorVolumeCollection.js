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
        './ComplexConicSensorVolume',
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
        ComplexConicSensorVolume,
        CustomSensorVolume,
        RectangularPyramidSensorVolume,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias SensorVolumeCollection
     * @constructor
     */
    var SensorVolumeCollection = function() {
        this._sensors = [];
        this._renderList = [];
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
        var mode = sceneState.mode;
        if (mode !== SceneMode.SCENE3D) {
            return undefined;
        }

        var sensors = this._sensors;
        var length = sensors.length;
        var camera = sceneState.camera;

        for ( var i = 0; i < length; ++i) {
            var sensor = sensors[i];
            var spatialState = sensor.update(context, sceneState);

            if (typeof spatialState === 'undefined') {
                continue;
            }

            var boundingVolume = spatialState.boundingVolume;
            var modelMatrix = defaultValue(spatialState.modelMatrix, Matrix4.IDENTITY);

            if (typeof boundingVolume !== 'undefined') {
                var center = new Cartesian4(boundingVolume.center.x, boundingVolume.center.y, boundingVolume.center.z, 1.0);
                center = Cartesian3.fromCartesian4(modelMatrix.multiplyByVector(center));
                boundingVolume = new BoundingSphere(center, boundingVolume.radius);

                if (camera.getVisibility(boundingVolume) === Intersect.OUTSIDE) {
                    continue;
                }

                var occluder = sceneState.occluder;
                if (typeof occluder !== 'undefined' &&
                        !occluder.isVisible(boundingVolume)) {
                    continue;
                }
            }

            this._renderList.push(sensor);
        }

        return {};
    };

    /**
     * @private
     */
    SensorVolumeCollection.prototype.render = function(context) {
        var sensors = this._renderList;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].render(context);
        }
        this._renderList.length = 0;
    };

    /**
     * @private
     */
    SensorVolumeCollection.prototype.updateForPick = function(context) {
        // This assumes that updateForPick is called after update and before renderForPick
        var sensors = this._renderList;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].updateForPick(context);
        }
    };

    /**
     * @private
     */
    SensorVolumeCollection.prototype.renderForPick = function(context, framebuffer) {
        var sensors = this._renderList;
        var length = sensors.length;
        for ( var i = 0; i < length; ++i) {
            sensors[i].renderForPick(context, framebuffer);
        }
        this._renderList.length = 0;
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