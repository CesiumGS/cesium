define([], function() {
   'use strict';

    function createTileKey(xOrTile, y, level) {
        if (typeof xOrTile === 'object') {
            var tile = xOrTile;
            xOrTile = tile.x;
            y = tile.y;
            level = tile.level;
        }
        return [xOrTile, y, level].join(',');
    }

    return createTileKey;
});
