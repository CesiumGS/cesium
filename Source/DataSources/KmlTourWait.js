import defined from "../Core/defined.js";
/**
 * Pauses the KmlTour for a given number of seconds.
 *
 * @alias KmlTourWait
 * @constructor
 *
 * @param {Number} duration entry duration
 *
 * @see KmlTour
 * @see KmlTourFlyTo
 */
function KmlTourWait(duration) {
  this.type = "KmlTourWait";
  this.blocking = true;
  this.duration = duration;

  this.timeout = null;
}

/**
 * Play this playlist entry
 *
 * @param {KmlTourWait.DoneCallback} done function which will be called when playback ends
 */
KmlTourWait.prototype.play = function (done) {
  var self = this;
  this.activeCallback = done;
  this.timeout = setTimeout(function () {
    delete self.activeCallback;
    done(false);
  }, this.duration * 1000);
};

/**
 * Stop execution of curent entry, cancel curent timeout
 */
KmlTourWait.prototype.stop = function () {
  clearTimeout(this.timeout);
  if (defined(this.activeCallback)) {
    this.activeCallback(true);
  }
};

/**
 * A function which will be called when playback ends.
 *
 * @callback KmlTourWait.DoneCallback
 * @param {Boolean} terminated true if {@link KmlTourWait#stop} was
 * called before entry done playback.
 */
export default KmlTourWait;
