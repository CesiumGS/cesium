import { defined } from '../Source/Cesium.js';
import { DeveloperError } from '../Source/Cesium.js';

    function createTileKey(xOrTile, y, level) {
        if (!defined(xOrTile)) {
            throw new DeveloperError('xOrTile is required');
        }

        if (typeof xOrTile === 'object') {
            var tile = xOrTile;
            xOrTile = tile.x;
            y = tile.y;
            level = tile.level;
        }
        return 'L' + level + 'X' + xOrTile + 'Y' + y;
    }
export default createTileKey;
