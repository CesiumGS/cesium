define([
        '../Core/arraySlice',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Check',
        '../Core/Color',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/getStringFromTypedArray',
        '../Core/getTimestamp',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/oneTimeWarning',
        '../Core/OrthographicFrustum',
        '../Core/Plane',
        '../Core/PrimitiveType',
        '../Core/Resource',
        '../Core/RuntimeError',
        '../Core/TaskProcessor',
        '../Core/Transforms',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/Pass',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArray',
        '../ThirdParty/when',
        './BlendingState',
        './Cesium3DTileBatchTable',
        './Cesium3DTileFeature',
        './Cesium3DTileFeatureTable',
        './ClippingPlaneCollection',
        './getClipAndStyleCode',
        './getClippingFunction',
        './PointCloud',
        './PointCloudEyeDomeLighting',
        './PointCloudShading',
        './SceneMode',
        './ShadowMode'
    ], function(
        arraySlice,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Check,
        Color,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        getStringFromTypedArray,
        getTimestamp,
        JulianDate,
        CesiumMath,
        Matrix3,
        Matrix4,
        oneTimeWarning,
        OrthographicFrustum,
        Plane,
        PrimitiveType,
        Resource,
        RuntimeError,
        TaskProcessor,
        Transforms,
        Buffer,
        BufferUsage,
        DrawCommand,
        Pass,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArray,
        when,
        BlendingState,
        Cesium3DTileBatchTable,
        Cesium3DTileFeature,
        Cesium3DTileFeatureTable,
        ClippingPlaneCollection,
        getClipAndStyleCode,
        getClippingFunction,
        PointCloud,
        PointCloudEyeDomeLighting,
        PointCloudShading,
        SceneMode,
        ShadowMode) {
    'use strict';

    /**
     * Provides functionality for playback of time-dynamic point cloud data.
     *
     * @alias TimeDynamicPointCloud
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Clock} options.clock A Clock instance that is used when determining the value for the time dimension.
     * @param {TimeIntervalCollection} options.times TimeIntervalCollection with its data property being an object containing a url to a Point Cloud tile and an optional transform.
     * @param {PointCloudShading} options.pointCloudShading An object to control point attenuation based on geometric error and lighting.
     * @param {Cesium3DTileStyle} options.pointCloudShading An object to control point attenuation based on geometric error and lighting.
     */
    function TimeDynamicPointCloud(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options.clock', options.clock);
        Check.typeOf.object('options.times', options.times);
        //>>includeEnd('debug');

        this.pointCloudShading = new PointCloudShading(options.pointCloudShading);
        this.style = options.style;
        this.clippingPlanes = options.clippingPlanes; // TODO : getter/setter for ownership
        this.shadows = defaultValue(options.shadows, ShadowMode.ENABLED);
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this.show = defaultValue(options.show, true);

        this._pointCloudEyeDomeLighting = new PointCloudEyeDomeLighting();
        this._loadTimestamp = undefined;
        this._clippingPlanesState = 0;
        this._styleDirty = false;
        this._pickId = undefined;

        var clock = options.clock;

        this._clock = clock;
        this._times = options.times;
        this._frameIndex = -1;
        this._frames = [];

        clock.onTick.addEventListener(this._clockOnTick, this);
        this._clockOnTick(clock);
    }

    function getPickFragmentShaderLoaded(stream) {
        return function(fs) {
            return ShaderSource.createPickFragmentShaderSource(fs, 'uniform');
        };
    }

    function getPickUniformMapLoaded(stream) {
        return function(uniformMap) {
            return combine(uniformMap, {
                czm_pickColor : function() {
                    return stream._pickId.color;
                }
            });
        };
    }

    TimeDynamicPointCloud.prototype.makeStyleDirty = function() {
        this._styleDirty = true;
    };

    function getApproachingInterval(that) {
        var times = that._times;
        var clock = that._clock;
        var time = clock.currentTime;
        var isAnimating = clock.canAnimate && clock.shouldAnimate;
        var multiplier = clock.multiplier;

        if (!isAnimating && multiplier !== 0) {
            return undefined;
        }

        var seconds;
        var index = times.indexOf(time);
        if (index === -1) {
            return undefined;
        }

        var interval = times.get(index);
        if (multiplier > 0) { // animating forward
            seconds = JulianDate.secondsDifference(interval.stop, time);
            ++index;
        } else { //backwards
            seconds = JulianDate.secondsDifference(interval.start, time); // Will be negative
            --index;
        }
        seconds /= multiplier; // Will always be positive

        // Less than 5 wall time seconds
        return (index >= 0 && seconds <= 5.0) ? times.get(index) : undefined;
    }

    function getCurrentInterval(that) {
        var times = that._times;
        var clock = that._clock;
        var time = clock.currentTime;
        var index = times.indexOf(time);
        if (index === -1) {
            return undefined;
        }
        return times.get(index);
    }

    function loadFrame(that, interval) {
        var index = that._times.indexOf(interval.start);
        var cache = that._cache;
        if (!defined(cache[index])) {
            cache[index] = {
                pointCloud : undefined,
                transform : interval.data.transform,
                timer : getTimestamp(),
                ready : false
            };
            Resource.fetchArrayBuffer({
                url : interval.data.url
            }).then(function(arrayBuffer) {
                cache[index].pointCloud = new PointCloud({
                    arrayBuffer : arrayBuffer,
                    pickFragmentShaderLoaded : getPickFragmentShaderLoaded(that),
                    pickUniformMapLoaded : getPickUniformMapLoaded(that)
                });
            }).otherwise(function(error) {
                throw error;
            });
        }
        return cache[index];
    }

    function prepareFrame(that, frame, frameState) {
        var pointCloud = frame.pointCloud;
        if (!defined(pointCloud)) {
            // Still waiting on the request to finish
            return;
        }

        if (!pointCloud.ready) {
            var commandList = frameState.commandList;
            var lengthBeforeUpdate = commandList.length;
            pointCloud.update(frameState);
            if (pointCloud.ready) {
                // Point cloud became ready this update
                frame.ready = true;
                frame.timer = getTimestamp() - frame.timer;
                commandList.length = lengthBeforeUpdate; // Don't allow preparing frame to insert commands.
            }
        }
    }

    function preloadFrame(that, interval, frameState) {
        var frame = loadFrame(that, interval);
        prepareFrame(that, frame, frameState);
        return frame;
    }

    var scratchModelMatrix = new Matrix4();

    // TODO : remove pick shaders in PointCloud
    // TODO : merge in master
    // TODO : need to take into account current real-time time it takes to process an average tile, because just fetching the next interval is naive
    // TODO : make sure it works if clock is stopped
    // TODO : measure time required to fetch the data and update it
    // TODO : synchronous draco faster?
    // TODO : picking code may be obsolete?
    // TODO : clear any requests that didn't finish from the previous frame?
    // TODO : once a skip factor is supported that introduces a can of worms
    // TODO : LRU cache / GPU memory share?

    TimeDynamicPointCloud.prototype.update = function(frameState) {
        if (frameState.mode === SceneMode.MORPHING) {
            return;
        }

        if (!this.show) {
            return;
        }

        if (!defined(this._pickId)) {
            this._pickId = frameState.context.createPickId({
                primitive : this
            });
        }

        if (!defined(this._loadTimestamp)) {
            this._loadTimestamp = JulianDate.clone(frameState.time);
        }

        // For styling
        var timeSinceLoad = Math.max(JulianDate.secondsDifference(frameState.time, this._loadTimestamp) * 1000, 0.0);

        // Update clipping planes
        var clippingPlanes = this.clippingPlanes;
        var clippingPlanesState = 0;
        var clippingPlanesDirty = false;
        var isClipped = defined(clippingPlanes) && clippingPlanes.enabled;

        if (isClipped) {
            clippingPlanes.update(frameState);
            clippingPlanesState = clippingPlanes.clippingPlanesState;
        }

        if (this._clippingPlanesState !== clippingPlanesState) {
            this._clippingPlanesState = clippingPlanesState;
            clippingPlanesDirty = true;
        }

        var pointCloudShading = this.pointCloudShading;
        var eyeDomeLighting = this._pointCloudEyeDomeLighting;

        var commandList = frameState.commandList;
        var lengthBeforeUpdate = commandList.length;

        var currentInterval = getCurrentInterval(this);
        if (defined(currentInterval)) {
            var frame = preloadFrame(this, currentInterval, frameState);
            if (frame.ready) {
                var pointCloud = frame.pointCloud;
                var transform = defaultValue(frame.transform, Matrix4.IDENTITY);
                var modelMatrix = Matrix4.multiplyTransformation(this.modelMatrix, transform, scratchModelMatrix);
                pointCloud.modelMatrix = modelMatrix;
                pointCloud.style = this.style;
                pointCloud.styleDirty = this._styleDirty;
                pointCloud.time = timeSinceLoad;
                pointCloud.shadows = this.shadows;
                pointCloud.clippingPlanes = clippingPlanes;
                pointCloud.isClipped = isClipped;
                pointCloud.clippingPlanesDirty = clippingPlanesDirty;

                if (defined(pointCloudShading)) {
                    pointCloud.attenuation = pointCloudShading.attenuation;
                    pointCloud.geometricError = 10.0; // TODO : If we had a bounding volume we could derive it
                    pointCloud.geometricErrorScale = pointCloudShading.geometricErrorScale;
                    pointCloud.maximumAttenuation = defined(pointCloudShading.maximumAttenuation) ? pointCloudShading.maximumAttenuation : 10;
                }
                pointCloud.update(frameState);
            }
        }

        var lengthAfterUpdate = commandList.length;
        var addedCommandsLength = lengthAfterUpdate - lengthBeforeUpdate;

        // Start loading the approaching frame
        var approachingInterval = getApproachingInterval(this);
        if (defined(approachingInterval)) {
            preloadFrame(this, approachingInterval);
        }

        if (defined(pointCloudShading) && pointCloudShading.attenuation && pointCloudShading.eyeDomeLighting && (addedCommandsLength > 0)) {
            eyeDomeLighting.update(frameState, lengthBeforeUpdate, pointCloudShading);
        }
    };

    TimeDynamicPointCloud.prototype.isDestroyed = function() {
        return false;
    };

    TimeDynamicPointCloud.prototype.destroy = function() {
        var frames = this._cache;
        var framesLength = frames.length;
        for (var i = 0; i < framesLength; ++i) {
            var frame = frames[i];
            if (defined(frame)) {
                frame.destroy();
            }
        }
        this._frames = undefined;
        return destroyObject(this);
    };

    return TimeDynamicPointCloud;
});
