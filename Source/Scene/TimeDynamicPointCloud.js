define([
        '../Core/Check',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/getTimestamp',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Resource',
        './ClippingPlaneCollection',
        './PointCloud',
        './PointCloudEyeDomeLighting',
        './PointCloudShading',
        './SceneMode',
        './ShadowMode'
    ], function(
        Check,
        combine,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        getTimestamp,
        JulianDate,
        CesiumMath,
        Matrix4,
        Resource,
        ClippingPlaneCollection,
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
     * @param {Clock} options.clock A {@link Clock} instance that is used when determining the value for the time dimension.
     * @param {TimeIntervalCollection} options.intervals A {@link TimeIntervalCollection} with its data property being an object containing a uri to a Point Cloud tile and an optional transform.
     * @param {Boolean} [options.show=true] Determines if the point cloud will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] A 4x4 transformation matrix that transforms the point cloud.
     * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the point cloud casts or receives shadows from each light source.
     * @param {Number} [options.maximumMemoryUsage=256] The maximum amount of memory in MB that can be used by the point cloud.
     * @param {Object} [options.pointCloudShading] Options for constructing a {@link PointCloudShading} object to control point size based on geometric error and eye dome lighting.
     * @param {Cesium3DTileStyle} [options.style] The style, defined using the {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}, applied to each point in the point cloud.
     * @param {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the point cloud.
     */
    function TimeDynamicPointCloud(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options.clock', options.clock);
        Check.typeOf.object('options.intervals', options.intervals);
        //>>includeEnd('debug');

        /**
         * Determines if the point cloud will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * A 4x4 transformation matrix that transforms the point cloud.
         *
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        /**
         * Determines whether the point cloud casts or receives shadows from each light source.
         * <p>
         * Enabling shadows has a performance impact. A point cloud that casts shadows must be rendered twice, once from the camera and again from the light's point of view.
         * </p>
         * <p>
         * Shadows are rendered only when {@link Viewer#shadows} is <code>true</code>.
         * </p>
         *
         * @type {ShadowMode}
         * @default ShadowMode.ENABLED
         */
        this.shadows = defaultValue(options.shadows, ShadowMode.ENABLED);

        /**
         * The maximum amount of GPU memory (in MB) that may be used to cache point cloud frames.
         *
         * @memberof TimeDynamicPointCloud.prototype
         *
         * @type {Number}
         * @default 256
         *
         * @see TimeDynamicPointCloud#totalMemoryUsageInBytes
         */
        this.maximumMemoryUsage = defaultValue(options.maximumMemoryUsage, 256);

        /**
         * Options for controlling point size based on geometric error and eye dome lighting.
         * @type {PointCloudShading}
         */
        this.pointCloudShading = new PointCloudShading(options.pointCloudShading);

        /**
         * The style, defined using the
         * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language},
         * applied to each point in the point cloud.
         * <p>
         * Assign <code>undefined</code> to remove the style, which will restore the visual
         * appearance of the point cloud to its default when no style was applied.
         * </p>
         *
         * @type {Cesium3DTileStyle}
         *
         * @example
         * pointCloud.style = new Cesium.Cesium3DTileStyle({
         *    color : {
         *        conditions : [
         *            ['${Classification} === 0', 'color("purple", 0.5)'],
         *            ['${Classification} === 1', 'color("red")'],
         *            ['true', '${COLOR}']
         *        ]
         *    },
         *    show : '${Classification} !== 2'
         * });
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        this.style = options.style;

        this._clock = options.clock;
        this._intervals = options.intervals;
        this._clippingPlanes = options.clippingPlanes;
        this._pointCloudEyeDomeLighting = new PointCloudEyeDomeLighting();
        this._loadTimestamp = undefined;
        this._clippingPlanesState = 0;
        this._styleDirty = false;
        this._pickId = undefined;
        this._totalMemoryUsageInBytes = 0;
        this._frames = [];
    }

    defineProperties(TimeDynamicPointCloud.prototype, {
        /**
         * The {@link ClippingPlaneCollection} used to selectively disable rendering the point cloud.
         *
         * @memberof TimeDynamicPointCloud.prototype
         *
         * @type {ClippingPlaneCollection}
         */
        clippingPlanes : {
            get : function() {
                return this._clippingPlanes;
            },
            set : function(value) {
                ClippingPlaneCollection.setOwner(value, this, '_clippingPlanes');
            }
        },

        /**
         * The total amount of GPU memory in bytes used by the point cloud.
         *
         * @memberof TimeDynamicPointCloud.prototype
         *
         * @type {Number}
         * @readonly
         *
         * @see TimeDynamicPointCloud#maximumMemoryUsage
         */
        totalMemoryUsageInBytes : {
            get : function() {
                return this._totalMemoryUsageInBytes;
            }
        }
    });

    function getFragmentShaderLoaded(fs) {
        return 'uniform vec4 czm_pickColor;\n' + fs;
    }

    function getUniformMapLoaded(stream) {
        return function(uniformMap) {
            return combine(uniformMap, {
                czm_pickColor : function() {
                    return stream._pickId.color;
                }
            });
        };
    }

    function getPickIdLoaded() {
        return 'czm_pickColor';
    }

    /**
     * Marks the point cloud's {@link TimeDynamicPointCloud#style} as dirty, which forces all
     * points to re-evaluate the style in the next frame.
     */
    TimeDynamicPointCloud.prototype.makeStyleDirty = function() {
        this._styleDirty = true;
    };

    function getApproachingInterval(that) {
        var intervals = that._intervals;
        var clock = that._clock;
        var time = clock.currentTime;
        var isAnimating = clock.canAnimate && clock.shouldAnimate;
        var multiplier = clock.multiplier;

        if (!isAnimating && multiplier !== 0) {
            return undefined;
        }

        var seconds;
        var index = intervals.indexOf(time);
        if (index === -1) {
            return undefined;
        }

        var interval = intervals.get(index);
        if (multiplier > 0) { // animating forward
            seconds = JulianDate.secondsDifference(interval.stop, time);
            ++index;
        } else { //backwards
            seconds = JulianDate.secondsDifference(interval.start, time); // Will be negative
            --index;
        }
        seconds /= multiplier; // Will always be positive

        // Less than 5 wall time seconds
        return (index >= 0 && seconds <= 5.0) ? intervals.get(index) : undefined;
    }

    function getLastReadyFrame(that, interval) {
        var i;
        var frame;
        var frames = that._frames;
        var clock = that._clock;
        var multiplier = clock.multiplier;
        var index = getIntervalIndex(that, interval);

        if (multiplier >= 0) {
            // Animating forwards, so look backwards
            for (i = index - 1; i >= 0; --i) {
                frame = frames[i];
                if (defined(frame) && frame.ready) {
                    return frame;
                }
            }
        } else {
            // Animating backwards, so look forwards
            var length = frames.length;
            for (i = index + 1; i < length; ++i) {
                frame = frames[i];
                if (defined(frame) && frame.ready) {
                    return frame;
                }
            }
        }
    }

    function getIntervalIndex(that, interval) {
        return that._intervals.indexOf(interval.start);
    }

    function getCurrentInterval(that) {
        var intervals = that._intervals;
        var clock = that._clock;
        var time = clock.currentTime;
        var index = intervals.indexOf(time);
        if (index === -1) {
            return undefined;
        }
        return intervals.get(index);
    }

    function requestFrame(that, interval) {
        var index = getIntervalIndex(that, interval);
        var frames = that._frames;
        var frame = frames[index];
        if (!defined(frame)) {
            frame = {
                pointCloud : undefined,
                transform : interval.data.transform,
                loadDuration : getTimestamp(), // Updated after the frame is loaded
                ready : false,
                touchedFrameNumber : 0
            };
            frames[index] = frame;
            Resource.fetchArrayBuffer({
                url : interval.data.uri
            }).then(function(arrayBuffer) {
                frame.pointCloud = new PointCloud({
                    arrayBuffer : arrayBuffer,
                    fragmentShaderLoaded : getFragmentShaderLoaded,
                    uniformMapLoaded : getUniformMapLoaded(that),
                    pickIdLoaded : getPickIdLoaded
                });
            }).otherwise(function(error) {
                throw error;
            });
        }
        return frame;
    }

    function prepareFrame(that, frame, frameState) {
        var pointCloud = frame.pointCloud;
        if (!defined(pointCloud)) {
            // Still waiting on the request to finish
            return;
        }

        if (!frame.ready) {
            // Call update to prepare renderer resources. Don't render anything yet.
            var commandList = frameState.commandList;
            var lengthBeforeUpdate = commandList.length;
            pointCloud.update(frameState);
            if (pointCloud.ready) {
                // Point cloud became ready this update
                frame.ready = true;
                frame.loadDuration = getTimestamp() - frame.loadDuration;
                that._totalMemoryUsageInBytes += pointCloud.geometryByteLength;
                commandList.length = lengthBeforeUpdate; // Don't allow preparing frame to insert commands.
            }
        }
    }

    var scratchModelMatrix = new Matrix4();

    function renderFrame(that, frame, timeSinceLoad, isClipped, clippingPlanesDirty, frameState) {
        var pointCloud = frame.pointCloud;
        var transform = defaultValue(frame.transform, Matrix4.IDENTITY);
        pointCloud.modelMatrix = Matrix4.multiplyTransformation(that.modelMatrix, transform, scratchModelMatrix);
        pointCloud.style = that.style;
        pointCloud.styleDirty = that._styleDirty;
        pointCloud.time = timeSinceLoad;
        pointCloud.shadows = that.shadows;
        pointCloud.clippingPlanes = that._clippingPlanes;
        pointCloud.isClipped = isClipped;
        pointCloud.clippingPlanesDirty = clippingPlanesDirty;

        var pointCloudShading = that.pointCloudShading;
        if (defined(pointCloudShading)) {
            pointCloud.attenuation = pointCloudShading.attenuation;
            pointCloud.geometricError = 10.0; // TODO : If we had a bounding volume we could derive it
            pointCloud.geometricErrorScale = pointCloudShading.geometricErrorScale;
            pointCloud.maximumAttenuation = defined(pointCloudShading.maximumAttenuation) ? pointCloudShading.maximumAttenuation : 10;
        }
        pointCloud.update(frameState);
        frame.touchedFrameNumber = frameState.frameNumber;
    }

    function loadFrame(that, interval, frameState) {
        var frame = requestFrame(that, interval);
        prepareFrame(that, frame, frameState);
        frame.touchedFrameNumber = frameState.frameNumber;
        return frame;
    }

    function getUnloadCondition(frameState) {
        return function(frame) {
            // Unload all frames that aren't currently being loaded or rendered
            return frame.touchedFrameNumber < frameState.frameNumber;
        };
    }

    function unloadFrames(that, unloadCondition) {
        var frames = that._frames;
        var length = frames.length;
        for (var i = 0; i < length; ++i) {
            var frame = frames[i];
            if (defined(frame)) {
                if (!defined(unloadCondition) || unloadCondition(frame)) {
                    var pointCloud = frame.pointCloud;
                    if (frame.ready) {
                        that._totalMemoryUsageInBytes -= pointCloud.geometryByteLength;
                    }
                    if (defined(pointCloud)) {
                        // TODO : what happens if Draco decoding resolves after a frame is destroyed?
                        pointCloud.destroy();
                    }
                    frames[i] = undefined;
                }
            }
        }
    }

    // TODO : need to take into account current real-time time it takes to process an average tile, because just fetching the next interval is naive
    // TODO : make sure it works if clock is stopped
    // TODO : measure time required to fetch the data and update it
    // TODO : synchronous draco faster?
    // TODO : clear any requests that didn't finish from the previous frame?
    // TODO : once a skip factor is supported that introduces a can of worms
    // TODO : LRU cache / GPU memory share?
    // TODO : skipping frames
    // TODO : would be helpful to have a bounding sphere associated with the point cloud, better for the draw command to have one
    // TODO : czml to TimeDynamicIntervalCollection
    // TODO : getAbsoluteUri removes the trailing dots

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
        var clippingPlanes = this._clippingPlanes;
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

        var frame;

        var currentInterval = getCurrentInterval(this);
        if (defined(currentInterval)) {
            frame = loadFrame(this, currentInterval, frameState);

            if (!frame.ready) {
                frame = getLastReadyFrame(this, currentInterval);
            }

            if (defined(frame)) {
                renderFrame(this, frame, timeSinceLoad, isClipped, clippingPlanesDirty, frameState);
            }
        }

        // Start loading the approaching frame
        var approachingInterval = getApproachingInterval(this);
        if (defined(approachingInterval)) {
            loadFrame(this, approachingInterval, frameState);
        }

        var totalMemoryUsageInBytes = this._totalMemoryUsageInBytes;
        var maximumMemoryUsageInBytes = this.maximumMemoryUsage * 1024 * 1024;

        if (totalMemoryUsageInBytes > maximumMemoryUsageInBytes) {
            unloadFrames(this, getUnloadCondition(frameState));
        }

        var lengthAfterUpdate = commandList.length;
        var addedCommandsLength = lengthAfterUpdate - lengthBeforeUpdate;

        if (defined(pointCloudShading) && pointCloudShading.attenuation && pointCloudShading.eyeDomeLighting && (addedCommandsLength > 0)) {
            eyeDomeLighting.update(frameState, lengthBeforeUpdate, pointCloudShading);
        }
    };

    TimeDynamicPointCloud.prototype.isDestroyed = function() {
        return false;
    };

    TimeDynamicPointCloud.prototype.destroy = function() {
        unloadFrames(this);
        this._clippingPlanes = this._clippingPlanes && this._clippingPlanes.destroy();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return TimeDynamicPointCloud;
});
