define([
        '../ThirdParty/rbush',
        './Check'
    ], function(
        rbush,
        Check) {
    'use strict';

        /**
             * Wrapper around rbush for use with Rectangle types.
             * @private
             */
        class RectangleCollisionChecker {
            constructor() {
                this._tree = rbush();
            }
            /**
                 * Insert a rectangle into the collision checker.
                 *
                 * @param {String} id Unique string ID for the rectangle being inserted.
                 * @param {Rectangle} rectangle A Rectangle
                 * @private
                 */
            insert(id, rectangle) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.string('id', id);
                Check.typeOf.object('rectangle', rectangle);
                //>>includeEnd('debug');
                var withId = RectangleWithId.fromRectangleAndId(id, rectangle, new RectangleWithId());
                this._tree.insert(withId);
            }
            /**
                 * Remove a rectangle from the collision checker.
                 *
                 * @param {String} id Unique string ID for the rectangle being removed.
                 * @param {Rectangle} rectangle A Rectangle
                 * @private
                 */
            remove(id, rectangle) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.string('id', id);
                Check.typeOf.object('rectangle', rectangle);
                //>>includeEnd('debug');
                var withId = RectangleWithId.fromRectangleAndId(id, rectangle, removalScratch);
                this._tree.remove(withId, idCompare);
            }
            /**
                 * Checks if a given rectangle collides with any of the rectangles in the collection.
                 *
                 * @param {Rectangle} rectangle A Rectangle that should be checked against the rectangles in the collision checker.
                 * @returns {Boolean} Whether the rectangle collides with any of the rectangles in the collision checker.
                 */
            collides(rectangle) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.object('rectangle', rectangle);
                //>>includeEnd('debug');
                var withId = RectangleWithId.fromRectangleAndId('', rectangle, collisionScratch);
                return this._tree.collides(withId);
            }
        }

        class RectangleWithId {
            constructor() {
                this.minX = 0.0;
                this.minY = 0.0;
                this.maxX = 0.0;
                this.maxY = 0.0;
                this.id = '';
            }
            static fromRectangleAndId(id, rectangle, result) {
                result.minX = rectangle.west;
                result.minY = rectangle.south;
                result.maxX = rectangle.east;
                result.maxY = rectangle.north;
                result.id = id;
                return result;
            }
        }



    function idCompare(a, b) {
        return a.id === b.id;
    }

    var removalScratch = new RectangleWithId();

    var collisionScratch = new RectangleWithId();

    return RectangleCollisionChecker;
});
