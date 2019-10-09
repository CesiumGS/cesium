import rbush from '../ThirdParty/rbush.js';
import Check from './Check.js';

    /**
     * Wrapper around rbush for use with Rectangle types.
     * @private
     */
    function RectangleCollisionChecker() {
        this._tree = rbush();
    }

    function RectangleWithId() {
        this.minX = 0.0;
        this.minY = 0.0;
        this.maxX = 0.0;
        this.maxY = 0.0;
        this.id = '';
    }

    RectangleWithId.fromRectangleAndId = function(id, rectangle, result) {
        result.minX = rectangle.west;
        result.minY = rectangle.south;
        result.maxX = rectangle.east;
        result.maxY = rectangle.north;
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
    RectangleCollisionChecker.prototype.insert = function(id, rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('id', id);
        Check.typeOf.object('rectangle', rectangle);
        //>>includeEnd('debug');

        var withId = RectangleWithId.fromRectangleAndId(id, rectangle, new RectangleWithId());
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
    RectangleCollisionChecker.prototype.remove = function(id, rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('id', id);
        Check.typeOf.object('rectangle', rectangle);
        //>>includeEnd('debug');

        var withId = RectangleWithId.fromRectangleAndId(id, rectangle, removalScratch);
        this._tree.remove(withId, idCompare);
    };

    var collisionScratch = new RectangleWithId();
    /**
     * Checks if a given rectangle collides with any of the rectangles in the collection.
     *
     * @param {Rectangle} rectangle A Rectangle that should be checked against the rectangles in the collision checker.
     * @returns {Boolean} Whether the rectangle collides with any of the rectangles in the collision checker.
     */
    RectangleCollisionChecker.prototype.collides = function(rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('rectangle', rectangle);
        //>>includeEnd('debug');

        var withId = RectangleWithId.fromRectangleAndId('', rectangle, collisionScratch);
        return this._tree.collides(withId);
    };
export default RectangleCollisionChecker;
