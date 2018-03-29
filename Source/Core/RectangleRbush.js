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
    function RectangleRbush() {
        this._tree = rbush();
    }

    function RectangleWithId() {
        this.minX = 0.0;
        this.minY = 0.0;
        this.maxX = 0.0;
        this.maxY = 0.0;
        this.id = '';
    }

    function fromRectangleAndId(rectangle, id, result) {
        result.minX = rectangle.west;
        result.minY = rectangle.south;
        result.maxX = rectangle.east;
        result.maxY = rectangle.north;
        result.id = id;
        return result;
    }

    function idCompare(a, b) {
        return a.id === b.id;
    }

    RectangleRbush.prototype.insert = function(id, rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('id', id);
        Check.typeOf.object('rectangle', rectangle);
        //>>includeEnd('debug');

        var withId = fromRectangleAndId(rectangle, id, new RectangleWithId());
        this._tree.insert(withId);
    };

    var removalScratch = new RectangleWithId();
    RectangleRbush.prototype.remove = function(id, rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('id', id);
        Check.typeOf.object('rectangle', rectangle);
        //>>includeEnd('debug');

        var withId = fromRectangleAndId(rectangle, id, removalScratch);
        this._tree.remove(withId, idCompare);
    };

    var collisionScratch = new RectangleWithId();
    RectangleRbush.prototype.collides = function(rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('rectangle', rectangle);
        //>>includeEnd('debug');

        var withId = fromRectangleAndId(rectangle, '', collisionScratch);
        return this._tree.collides(withId);
    };

    return RectangleRbush;
});
