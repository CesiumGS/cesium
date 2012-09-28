/*global define*/
define([
        './DynamicProperty',
        './CzmlImage',
        './CzmlNumber',
        '../Scene/Material',
        '../Core/JulianDate'
    ], function(
         DynamicProperty,
         CzmlImage,
         CzmlNumber,
         Material,
         JulianDate) {
    "use strict";

    /**
     * A utility class for processing CZML image materials.
     * @alias DynamicVideoMaterial
     * @constructor
     */
    var DynamicVideoMaterial = function() {
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's image.
         * @type DynamicProperty
         */
        this.video = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's vertical repeat.
         * @type DynamicProperty
         */
        this.verticalRepeat = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's horizontal repeat.
         *
         * @type DynamicProperty
         */
        this.horizontalRepeat = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains image material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML image material data, false otherwise.
     */
    DynamicVideoMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval.video !== 'undefined';
    };

    /**
     * Provided a CZML interval containing image material data, processes the
     * interval into a new or existing instance of this class.
     *
     * @param {Object} czmlInterval The interval to process.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     * @returns The modified existingMaterial parameter or a new DynamicVideoMaterial instance if existingMaterial was undefined or not a DynamicVideoMaterial.
     */
    DynamicVideoMaterial.prototype.processCzmlIntervals = function(czmlInterval, sourceUri) {
        var materialData = czmlInterval.video;
        if (typeof materialData === 'undefined') {
            return;
        }

        if (typeof materialData.video !== 'undefined') {
            var image = this.video;
            if (typeof image === 'undefined') {
                this.video = image = new DynamicProperty(CzmlImage);
            }
            image.processCzmlIntervals(materialData.video, undefined, sourceUri);
        }

        if (typeof materialData.verticalRepeat !== 'undefined') {
            var verticalRepeat = this.verticalRepeat;
            if (typeof verticalRepeat === 'undefined') {
                this.verticalRepeat = verticalRepeat = new DynamicProperty(CzmlNumber);
            }
            verticalRepeat.processCzmlIntervals(materialData.verticalRepeat);
        }

        if (typeof materialData.horizontalRepeat !== 'undefined') {
            var horizontalRepeat = this.horizontalRepeat;
            if (typeof horizontalRepeat === 'undefined') {
                this.horizontalRepeat = horizontalRepeat = new DynamicProperty(CzmlNumber);
            }
            horizontalRepeat.processCzmlIntervals(materialData.horizontalRepeat);
        }
    };

    var startTime = JulianDate.fromIso8601('2012-03-15T10:00:00Z');
    //var endTime = JulianDate.fromIso8601('2012-03-16T10:00:00Z');
    //var simulationDuration = startTime.getSecondsDifference(endTime);

    /**
     * Gets an Image Material that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Context} context The context in which this material exists.
     * @param {Material} [existingMaterial] An existing material to be modified.  If the material is undefined or not an Image Material, a new instance is created.
     * @returns The modified existingMaterial parameter or a new Image Material instance if existingMaterial was undefined or not a Image Material.
     */
    DynamicVideoMaterial.prototype.getValue = function(time, context, existingMaterial) {
        if (typeof existingMaterial === 'undefined' || (existingMaterial.type !== Material.ImageType)) {
            existingMaterial = Material.fromType(context, Material.ImageType);
        }

        var xRepeat;
        var property = this.verticalRepeat;
        if (typeof property !== 'undefined') {
            xRepeat = property.getValue(time);
            if (typeof xRepeat !== 'undefined') {
                existingMaterial.uniforms.repeat.x = xRepeat;
            }
        }

        var yRepeat;
        property = this.horizontalRepeat;
        if (typeof property !== 'undefined') {
            yRepeat = property.getValue(time);
            if (typeof yRepeat !== 'undefined') {
                existingMaterial.uniforms.repeat.y = yRepeat;
            }
        }

        existingMaterial.uniforms.repeat.x = 4;
        existingMaterial.uniforms.repeat.y = 4;

        //property = this.video;
        //if (typeof property !== 'undefined') {
        var video;
        var url = 'http://localhost:8080/Apps/CesiumViewer/Gallery/bkaovAYt-1287469.webm';
        if (typeof url !== 'undefined' && existingMaterial.currentUrl !== url) {
            existingMaterial.currentUrl = url;
            video = existingMaterial.video = document.createElement('video');
            video.preload = 'auto';
            video.src = url;
            //existingMaterial.uniforms.video = url;
        }
        //}

        video = existingMaterial.video;
        if (!isNaN(video.duration)) {
            if (typeof existingMaterial.texture === 'undefined') {
                //video.play();
                existingMaterial.texture = context.createTexture2D({
                    source : video
                });
                existingMaterial.uniforms.image = existingMaterial.texture;
            } else {
                if (!video.seeking) {
                    existingMaterial.texture.copyFrom(video);
                    if (video.seekable.length > 0) {
                        var a = video.seekable.start(0); // Returns the starting time (in seconds)
                        var b = video.seekable.end(0); // Returns the ending time (in seconds)

                        var frameTime = Math.max(startTime.getSecondsDifference(time), a);
                        frameTime = Math.min(startTime.getSecondsDifference(time), b);
                        video.currentTime = frameTime;
                    }
                }
            }
        }

        return existingMaterial;
    };

    return DynamicVideoMaterial;
});