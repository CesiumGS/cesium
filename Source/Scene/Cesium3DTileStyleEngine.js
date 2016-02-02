/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       './getCesium3DTileStyle'
    ], function(
        Color,
        defined,
        defineProperties,
        getCesium3DTileStyle) {
    "use strict";

    /**
     * @private
     */
    function Cesium3DTileStyleEngine(style) {
        this._style = style;               // The style JSON provided by the user
        this._styleDirty = defined(style); // true when the style JSON is reassigned
        this._lastStyleTime = 0;           // The "time" when the last style was assigned
        this._runtimeStyle = undefined;    // The computed style for runtime use from the style JSON

        this.statistics = {
            numberOfTilesStyled : 0,
            numberOfFeaturesStyled : 0,

            lastNumberOfTilesStyled : -1,
            lastNumberOfFeaturesStyled : -1
        };
    }

    defineProperties(Cesium3DTileStyleEngine.prototype, {
        style : {
            get : function() {
                return this._style;
            },
            set : function(value) {
                this._style = value;
                this._styleDirty = true;
            }
        }
    });

    Cesium3DTileStyleEngine.prototype.applyStyle = function(selectedTiles, newlySelectedTiles) {
        var styleDirty = this._styleDirty;
        this._styleDirty = false;

        // Was a new style assigned since last frame?
        if (styleDirty) {
            this._runtimeStyle = getCesium3DTileStyle(this._style);
        }

        var applyToAllVisibleTiles = false;

        // Should the style be reapplied to all visible tiles?
        if (styleDirty || ((defined(this._runtimeStyle) && this._runtimeStyle.timeDynamic))) {
            ++this._lastStyleTime;
            applyToAllVisibleTiles = true;
        }

        var lastStyleTime = this._lastStyleTime;
        var stats = this.statistics;

        // If a new style was assigned or the style is time-dynamic, loop through all the visible
        // tiles; otherwise, loop through only the tiles that are newly visible, i.e., they are
        // visible this frame, but were not visible last frame.  In many cases, the newly selected
        // tiles list will be short or empty.
        var tiles = applyToAllVisibleTiles ? selectedTiles : newlySelectedTiles;

        var length = tiles.length;
        for (var i = 0; i < length; ++i) {
            var tile = tiles[i];
            if (tile.selected) {
                // Apply the style to this tile if it wasn't already applied because:
                //   1) the user assigned a new style to the tileset
                //   2) this tile is now visible, but it wasn't visible when the style was first assigned
                if (tile.lastStyleTime !== lastStyleTime) {
                    tile.lastStyleTime = lastStyleTime;
                    styleCompositeContent(tile.content, this);

                    ++stats.numberOfTilesStyled;
                }
            }
        }
    };

    function styleCompositeContent(content, styleEngine) {
        var innerContents = content.innerContents;
        if (defined(innerContents)) {
            var length = innerContents.length;
            for (var i = 0; i < length; ++i) {
                // Recurse for composites of composites
                styleCompositeContent(innerContents[i], styleEngine);
            }
        } else {
            // Not a composite tile
            styleContent(content, styleEngine);
        }
    }

    function styleContent(content, styleEngine) {
        var length = content.featuresLength;
        var runtimeStyle = styleEngine._runtimeStyle;

        styleEngine.statistics.numberOfFeaturesStyled += length;

        if (!defined(runtimeStyle)) {
            clearStyle(content);
            return;
        }

        // PERFORMANCE_IDEA: we can create a slightly faster internal interface by directly
        // using Cesium3DTileBatchTableResources.  We might also be able to use less memory
        // by using reusing a batchValues array across tiles.
        for (var i = 0; i < length; ++i) {
            var feature = content.getFeature(i);

            // TODO: Design and implement full style schema
            feature.color = runtimeStyle.color;
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
