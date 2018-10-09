define([
        '../Core/defined'
    ], function(
        defined) {
    'use strict';
        /**
             * @alias KmlTourWait
             * @constructor
             *
             * @param {Number} duration entry duration
             */
        class KmlTourWait {
            constructor(duration) {
                this.type = 'KmlTourWait';
                this.blocking = true;
                this.duration = duration;
                this.timeout = null;
            }
            /**
                 * Play this playlist entry
                 *
                 * @param {KmlTourWait~DoneCallback} done function which will be called when playback ends
                 */
            play(done) {
                var self = this;
                this.activeCallback = done;
                this.timeout = setTimeout(function() {
                    delete self.activeCallback;
                    done(false);
                }, this.duration * 1000);
            }
            /**
                 * Stop execution of curent entry, cancel curent timeout
                 */
            stop() {
                clearTimeout(this.timeout);
                if (defined(this.activeCallback)) {
                    this.activeCallback(true);
                }
            }
        }



    /**
     * A function which will be called when playback ends.
     *
     * @callback KmlTourWait~DoneCallback
     * @param {Boolean} terminated true if {@link KmlTourWait#stop} was
     * called before entry done playback.
     */

    return KmlTourWait;
});
