/*global define*/
define([
       '../Core/Color',
       '../Core/defined'
    ], function(
        Color,
        defined) {
    "use strict";

    /**
     * @private
     */
    function Cesium3DTileStyleEngine(tileset) {
        this._tileset = tileset;

        this._style = undefined; // The last style that was assigned
        this._lastStyleTime = 0; // The "time" when the last style was assigned
    }

    Cesium3DTileStyleEngine.prototype.applyStyle = function() {
        var tileset = this._tileset;

        if (!tileset.ready) {
            return;
        }

        // Was a new style assigned this frame?
        var styleDirty = false;
        var style = tileset.style;
        if ((this._style !== style) || (defined(style) && style.timeDynamic)) {
            this._style = style;
            ++this._lastStyleTime;
            styleDirty = true;
        }

        var lastStyleTime = this._lastStyleTime;
        var stats = tileset._statistics;

        // If the style is dirty, i.e., a new style was assigned or the style is time-dynamic,
        // loop through all the visible tiles; otherwise, loop through only the tiles
        // that are newly visible, i.e., they are visible this frame, but were not visible
        // last frame.  In many cases, the newly selected tiles list will be short or empty.
        var tiles = styleDirty ? tileset._selectedTiles : tileset._newlySelectedTiles;

        var length = tiles.length;
        for (var i = 0; i < length; ++i) {
            var tile = tiles[i];
            if (tile.selected) {
                // Apply the style to this tile if it wasn't already applied because:
                //   1) the user assigned a new style to the tileset
                //   2) this tile is now visible, but it wasn't visible when the style was first assigned
                if (tile.lastStyleTime !== lastStyleTime) {
                    tile.lastStyleTime = lastStyleTime;
                    styleCompositeContent(tile.content, tileset);

                    ++stats.numberOfTilesStyled;
                }
            }
        }
    };

    function styleCompositeContent(content, tileset) {
        var innerContents = content.innerContents;
        if (defined(innerContents)) {
            var length = innerContents.length;
            for (var i = 0; i < length; ++i) {
                // Recurse for composites of composites
                styleCompositeContent(innerContents[i], tileset);
            }
        } else {
            // Not a composite tile
            styleContent(content, tileset);
        }
    }

    function styleContent(content, tileset) {
        var length = content.featuresLength;
        var style = tileset.style;

        tileset._statistics.numberOfFeaturesStyled += length;

        if (!defined(style)) {
            clearStyle(content);
            return;
        }

        // PERFORMANCE_IDEA: we can create a slightly faster internal interface by directly using Cesium3DTileBatchTableResources
        for (var i = 0; i < length; ++i) {
            var feature = content.getFeature(i);

            // TODO: Design and implement full style schema
            feature.color = style.color;
        }
    }

    function clearStyle(content) {
        var length = content.featuresLength;
        for (var i = 0; i < length; ++i) {
            var feature = content.getFeature(i);
            feature.show = true;
            feature.color = Color.WHITE;
        }
    }

    return Cesium3DTileStyleEngine;
});
