import BoundingRectangle from "./BoundingRectangle.js";
import Check from "./Check.js";
import defined from "./defined.js";

/**
 * @typedef {object} TexturePacker.PackableObject
 * Any object, such as an <code>Image</code> with the following properties:
 * @private
 * @property {number} width The width of the image, or other object, usually in pixels
 * @property {number} height The height of the image, or other object, usually in pixels
 */

/**
 * A texture atlas is recursively broken down into regions of space called nodes.
 * Nodes contain either an image reference or child nodes.
 * @private
 * @constructor
 * @param {object} options An options object with the following properties:
 * @param {number} options.x The x-offset of the texture node
 * @param {number} options.y The y-offset of the texture node
 * @param {number} options.width The width of the texture node
 * @param {number} options.height The width of the texture node
 */
function TextureNode({ x, y, width, height }) {
  /**
   * @type {BoundingRectangle}
   */
  this.rectangle = new BoundingRectangle(x, y, width, height);

  /**
   * @type {TextureNode|undefined}
   */
  this.childNode1 = undefined;
  /**
   * @type {TextureNode|undefined}
   */
  this.childNode2 = undefined;

  /**
   * Identifier referencing an image or packed data
   * @type {number|undefined}
   */
  this.index = undefined;
}

/**
 * Typically used with {@link TextureAtlas} to calculate efficient regions of the larger areas to store images or other data. Typically, all units are specified in pixels.
 * @alias TexturePacker
 * @constructor
 * @private
 * @param {options} options Object with the following properties:
 * @param {number} options.width Width of the atlas, in pixels
 * @param {number} options.height Height of atlas, in pixels
 * @param {number} options.borderPadding Amount of border padding, in pixels
 */
function TexturePacker({ width, height, borderPadding }) {
  this._width = width;
  this._height = height;

  this._borderPadding = borderPadding;

  this._root = new TextureNode({
    x: borderPadding,
    y: borderPadding,
    width: width - 2 * borderPadding,
    height: height - 2 * borderPadding,
  });
}

/**
 * Inserts the given object into the next available region based on it's dimensions. Where convenient, it's most efficient to pack items largest to smallest.
 * @private
 * @param {number} index An identifier referencing the image or other stored data
 * @param {TexturePacker.PackableObject} packableObject An object, such as an <code>Image</code>, with <code>width</code> and <code>height</code> properties in pixels.
 * @returns {TextureNode|undefined} The created region, or <code>undefined</code> if there is no region large enough to accommodate the object's dimensions.
 */
TexturePacker.prototype.pack = function (index, { width, height }) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check.typeOf.number.greaterThanOrEquals("image.width", width, 1);
  Check.typeOf.number.greaterThanOrEquals("image.height", height, 1);
  //>>includeEnd('debug');

  const node = this._findNode(this._root, { width, height });
  if (!defined(node)) {
    return;
  }

  node.index = index;
  return node;
};

// A recursive function that finds the best place to insert
// a new image based on existing image 'nodes'.
// Inspired by: http://blackpawn.com/texts/lightmaps/default.html
TexturePacker.prototype._findNode = function (node, { width, height }) {
  if (!defined(node)) {
    return undefined;
  }

  // Leaf node
  if (!defined(node.childNode1) && !defined(node.childNode2)) {
    if (defined(node.index)) {
      // Node already contains an image: Skip it.
      return undefined;
    }

    const { rectangle } = node;

    const nodeWidth = rectangle.width;
    const nodeHeight = rectangle.height;
    const widthDifference = nodeWidth - width;
    const heightDifference = nodeHeight - height;

    // Node is smaller than the image.
    if (widthDifference < 0 || heightDifference < 0) {
      return undefined;
    }

    // If the node is the same size as the image, return the node
    if (widthDifference === 0 && heightDifference === 0) {
      return node;
    }

    // Vertical split (childNode1 = left half, childNode2 = right half).
    if (widthDifference > heightDifference) {
      node.childNode1 = new TextureNode({
        x: rectangle.x,
        y: rectangle.y,
        width,
        height: nodeHeight,
      });
      node.childNode2 = new TextureNode({
        x: rectangle.x + width,
        y: rectangle.y,
        width: widthDifference,
        height: nodeHeight,
      });

      return this._findNode(node.childNode1, { width, height });
    }

    // Horizontal split (childNode1 = bottom half, childNode2 = top half).
    node.childNode1 = new TextureNode({
      x: rectangle.x,
      y: rectangle.y,
      width: nodeWidth,
      height,
    });
    node.childNode2 = new TextureNode({
      x: rectangle.x,
      y: rectangle.y + height,
      width: nodeWidth,
      height: heightDifference,
    });
    return this._findNode(node.childNode1, { width, height });
  }

  // If not a leaf node
  return (
    this._findNode(node.childNode1, { width, height }) ||
    this._findNode(node.childNode2, { width, height })
  );
};

export default TexturePacker;
