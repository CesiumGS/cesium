/*global define*/
define(['../Core/Iso8601',
        '../Core/Cartesian2',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/JulianDate',
        './ConstantProperty',
        './createPropertyDescriptor',
        './Property',
        '../Renderer/Texture'
    ], function(
        Iso8601,
        Cartesian2,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        JulianDate,
        ConstantProperty,
        createPropertyDescriptor,
        Property,
        Texture) {
    "use strict";

    function createSeekFunction(that, video, result) {
        var context = that.scene._context;
        return function() {
            if (!defined(that._texture)) {
                that._texture = new Texture({
                    context: context,
                    source : video
                });
                result.image = that._texture;
            }

            that._texture.copyFrom(video);
            var duration = video.duration;
            //TODO: We should probably be checking the video.seekable segments
            //before setting the currentTime, but if there are no seekable
            //segments, then this code will have no affect, so the net result
            //seems to be the same.
            var videoTime = JulianDate.secondsDifference(that._time, that._cachedStartTime);
            videoTime = videoTime * that._cachedSpeed;
            if (that._cachedLoop) {
                videoTime = videoTime % duration;
                if (videoTime < 0.0) {
                    videoTime = duration - videoTime;
                }
                video.currentTime = videoTime;
            } else if (videoTime > duration) {
                video.currentTime = duration;
            } else if (videoTime < 0.0) {
                video.currentTime = 0.0;
            } else {
                video.currentTime = videoTime;
            }
        };
    }

    /**
     * A {@link MaterialProperty} that maps to image {@link Material} uniforms.
     * @alias VideoMaterialProperty
     * @constructor
     */
    var VideoMaterialProperty = function(scene) {
        //>>includeStart('debug', pragmas.debug);
        if(!defined(scene)){
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._definitionChanged = new Event();

        this._video = undefined;
        this._videoSubscription = undefined;

        this._repeat = undefined;
        this._repeatSubscription = undefined;

        this._startTime = undefined;
        this._startTimeSubscription = undefined;

        this._loop = undefined;
        this._loopSubscription = undefined;

        this._speed = undefined;
        this._speedSubscription = undefined;

        this.repeat = new ConstantProperty(new Cartesian2(1, 1));
        this.startTime = new ConstantProperty(Iso8601.MINIMUM_VALUE);
        this.loop = new ConstantProperty(true);
        this.speed = new ConstantProperty(1.0);

        this._videoUrl = undefined;
        this._videoElement = undefined;
        this._seekFunction = undefined;
        this._texture = undefined;
        this.scene = scene;
    };

    defineProperties(VideoMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof StripeMaterialProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._video) && //
                       Property.isConstant(this._repeat) && //
                       Property.isConstant(this._startTime) && //
                       Property.isConstant(this._loop) && //
                       Property.isConstant(this._speed);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof StripeMaterialProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * A string {@link Property} which is the url of the desired video.
         * @type {Property}
         */
        video : createPropertyDescriptor('video'),
        /**
         * A {@link Cartesian2} {@link Property} which determines the number of times the video repeats in each direction.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1, 1))
         */
        repeat : createPropertyDescriptor('repeat'),
        /**
         * A {@link JulianDate} {@link Property} which determines the simulation start time of the video.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1, 1))
         */
        startTime : createPropertyDescriptor('startTime'),
        /**
         * A Boolean {@link Property} which determines whether or not the video should loop;
         * @type {Property}
         * @default new ConstantProperty(true)
         */
        loop : createPropertyDescriptor('loop'),
        /**
         * A Number {@link Property} which determines the playback rate of the video.
         * @type {Property}
         * @default new ConstantProperty(true)
         */
        speed : createPropertyDescriptor('speed')
    });

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof VideoMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    VideoMaterialProperty.prototype.getType = function(time) {
        return 'Image';
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof VideoMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    VideoMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }

        result.repeat = defined(this.repeat) ? this.repeat.getValue(time, result.repeat) : undefined;
        this._time = time;
        this._cachedSpeed = defined(this.speed) ? this.speed.getValue(time) : 1;
        this._cachedLoop = defined(this.loop) ? this.loop.getValue(time) : true;
        this._cachedStartTime = defined(this.startTime) ? this.startTime.getValue(time) : Iso8601.MINIMUM_VALUE;

        var videoProperty = this.video;
        if (defined(videoProperty)) {
            var url = videoProperty.getValue(time);
            if (defined(url) && this._videoUrl !== url) {
                this._videoUrl = url;
                if (defined(this._videoElement)) {
                    this._videoElement.removeEventListener("seeked", this._seekFunction, false);
                    document.body.removeChild(this._videoElement);
                }
                var video = document.createElement('video');
                video.style.display = 'none';
                video.preload = 'auto';
                document.body.appendChild(video);
                this._videoElement = video;

                var that = this;
                video.addEventListener("loadeddata", function() {
                    var seekFunction = createSeekFunction(that, video, result);
                    that._seekFunction = seekFunction;
                    video.addEventListener("seeked", that._seekFunction, false);
                    seekFunction();
                }, false);

                video.src = url;
                video.load();
            }
        }

        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof VideoMaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    VideoMaterialProperty.prototype.equals = function(other) {
        return this === other || //
                (other instanceof VideoMaterialProperty && //
                Property.equals(this.video, other.video) && //
                Property.equals(this.startTime, other.startTime) && //
                Property.equals(this.loop, other.loop) && //
                Property.equals(this.speed, other.speed) && //
                Property.equals(this.repeat, other.repeat));
    };

    return VideoMaterialProperty;
});
