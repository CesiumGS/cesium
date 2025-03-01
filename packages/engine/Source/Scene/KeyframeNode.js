const LoadState = Object.freeze({
  UNLOADED: 0, // Has no data and is in dormant state
  RECEIVING: 1, // Is waiting on data from the provider
  PROCESSING: 2, // Data received.  Contents are being processed for rendering.  Depending on the content, it might make its own requests for external data.
  LOADED: 3, // Processed data from provider
  FAILED: 4, // Failed to receive data from the provider
  UNAVAILABLE: 5, // No data available for this tile
});

/**
 * @alias KeyframeNode
 * @constructor
 *
 * @param {SpatialNode} spatialNode
 * @param {number} keyframe
 *
 * @private
 */
function KeyframeNode(spatialNode, keyframe) {
  this.spatialNode = spatialNode;
  this.keyframe = keyframe;
  this.state = LoadState.UNLOADED;
  this.content = undefined;
  this.megatextureIndex = -1;
  this.priority = -Number.MAX_VALUE;
  this.highPriorityFrameNumber = -1;
}

/**
 * Frees the resources used by this object.
 * @private
 */
KeyframeNode.prototype.unload = function () {
  this.content = this.content && this.content.destroy();

  this.spatialNode = undefined;
  this.state = LoadState.UNLOADED;
  this.megatextureIndex = -1;
  this.priority = -Number.MAX_VALUE;
  this.highPriorityFrameNumber = -1;
};

/**
 * @param {KeyframeNode} a
 * @param {KeyframeNode} b
 */
KeyframeNode.priorityComparator = function (a, b) {
  return a.priority - b.priority;
};

/**
 * @param {KeyframeNode} a
 * @param {KeyframeNode} b
 */
KeyframeNode.searchComparator = function (a, b) {
  return a.keyframe - b.keyframe;
};

KeyframeNode.LoadState = LoadState;

export default KeyframeNode;
