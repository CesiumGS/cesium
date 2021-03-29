/**
 * Results from loading a model.
 *
 * @alias ModelLoaderResults
 * @constructor
 *
 * @private
 */
export default function ModelLoaderResults() {
  /**
   * An array of nodes.
   *
   * @type {ModelComponents.Node[]}
   */

  this.nodes = [];

  /**
   * An object containing per-feature metadata.
   *
   * @type {FeatureMetadata}
   */
  this.featureMetadata = undefined;
}
