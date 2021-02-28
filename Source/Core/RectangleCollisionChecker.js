import RBush from "../ThirdParty/rbush.js";
import Rectangle from "./Rectangle.js";
import Check from "./Check.js";

/**
 * Wrapper around rbush for use with Rectangle types.
 * Checks for collisions using the approximates projected extents of Rectangles.
 * @private
 */
function RectangleCollisionChecker(mapProjection) {
  this._tree = new RBush();
  this._mapProjection = mapProjection;
}

function RectangleWithId() {
  this.minX = 0.0;
  this.minY = 0.0;
  this.maxX = 0.0;
  this.maxY = 0.0;
  this.id = "";
}

var projectedExtentsScratch = new Rectangle();
RectangleWithId.fromRectangleAndId = function (
  id,
  rectangle,
  result,
  mapProjection
) {
  var projectedExtents = Rectangle.approximateProjectedExtents(
    {
      cartographicRectangle: rectangle,
      mapProjection: mapProjection,
    },
    projectedExtentsScratch
  );

  result.minX = projectedExtents.west;
  result.minY = projectedExtents.south;
  result.maxX = projectedExtents.east;
  result.maxY = projectedExtents.north;
  result.id = id;
  return result;
};

/**
 * Insert a rectangle into the collision checker.
 *
 * @param {String} id Unique string ID for the rectangle being inserted.
 * @param {Rectangle} rectangle A Rectangle
 * @private
 */
RectangleCollisionChecker.prototype.insert = function (id, rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("id", id);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  var withId = RectangleWithId.fromRectangleAndId(
    id,
    rectangle,
    new RectangleWithId(),
    this._mapProjection
  );
  this._tree.insert(withId);
};

function idCompare(a, b) {
  return a.id === b.id;
}

var removalScratch = new RectangleWithId();
/**
 * Remove a rectangle from the collision checker.
 *
 * @param {String} id Unique string ID for the rectangle being removed.
 * @param {Rectangle} rectangle A Rectangle
 * @private
 */
RectangleCollisionChecker.prototype.remove = function (id, rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("id", id);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  var withId = RectangleWithId.fromRectangleAndId(
    id,
    rectangle,
    removalScratch,
    this._mapProjection
  );
  this._tree.remove(withId, idCompare);
};

var collisionScratch = new RectangleWithId();
/**
 * Checks if a given rectangle collides with any of the rectangles in the collection.
 *
 * @param {Rectangle} rectangle A Rectangle that should be checked against the rectangles in the collision checker.
 * @returns {Boolean} Whether the rectangle collides with any of the rectangles in the collision checker.
 */
RectangleCollisionChecker.prototype.collides = function (rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  var withId = RectangleWithId.fromRectangleAndId(
    "",
    rectangle,
    collisionScratch,
    this._mapProjection
  );
  return this._tree.collides(withId);
};
export default RectangleCollisionChecker;
