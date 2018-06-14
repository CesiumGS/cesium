To refine past a tile, one of the following conditions must be met:

   * The tile is loaded.
   * The tile has a SSE that is _known_ (not just suspected) to be too high AND we know which of the tile's children exist. We'll know the SSE is too high if:
      * The distance to the tile is known accurately (e.g. we know the precise min/max height), or
      * The bounding volume for the tile is known to be X or _closer_, and X is sufficient to necessitate refinement. For example, if we have no min/max height information for this tile, but the parent tile has a min of A and a max of B, we know the child must fall within these bounds as well. Therefore, the child tile can be no farther away than max(distance to A, distance to B).


GlobeSurfaceTile properties:

   * `tileBoundingRegion` is used to estimate the distance to the tile. It is _not_ used for culling.
   * `orientedBoundingBox` is used for culling, _not_ for distance estimation.
   * `minimumHeight` and `maximumheight` are used for picking, for culling in 2D, and for `updateHeights` in `QuadtreePrimitive`.


A tile conceptually has three sets of min/max heights:

   * The spatially coherent min/max of the real terrain in this horizontal extent, i.e. the min/max of this tile and all its descendants.
      * Distance estimation: Great!
      * Culling for rendering: Great!
      * Skipping loading: Great!
   * The min/max of the geometry, which may not reflect the full range of heights of descendants.
      * Distance estimation: Not perfect, but should be good enough.
      * Culling for rendering: Great!
      * Skipping loading: Not perfect, but should be good enough.
   * The (spatially coherent) min/max of the parent tile, applied to this tile.
      * Distance estimation: Tile is guaranteed to be closer than the farther-away height surface (min or max).
      * Culling for rendering: If test says its invisible, it definitely is. If test says its visible, it may or may not be.
      * Skipping loading: We can skip loading if the tile is culled.



## Tile properties

* Available from construction:
    * level
    * x
    * y
    * rectangle
    * tilingScheme
    * parent
    * southwestChild
    * southeastChild
    * northwestChild
    * northeastChild
    * state
* Populated by loading or upsampling
    * vertexArray (rendering)
    * center (rendering vertexArray RTC)
    * imagery (rendering)
    * waterMaskTexture (rendering)
    * waterMaskTranslationAndScale (rendering)
    * orientedBoundingBox (culling)
    * occludeePointInScaledSpace (culling)
    * boundingSphere3D (culling, when orientedBoundingBox isn't available)
    * terrainData (used to upsample children, determine child tile mask)
    * upsampledFromParent (true if terrain and all imagery are just upsampled from the parent)
    * renderable (true if the tile is renderable at all)
* Populated by non-tile loading
    * childTileMask / getTileDataAvailable (not stored on tile directly, comes from terrainData.childTileMask or TerrainProvider.getTileDataAvailable, determines if we need to upsample)
    * tileBoundingRegion (distance estimation for SSE, load priority)
* Caching / per-frame intermediates
    * surfaceShader (shader used to render this tile last frame)
    * _distance (distance from the camera to this tile, set as a side-effect of GlobeSurfaceTileProvider#computeTileVisibility)
    * isClipped (true if the tile is clipped by a custom clipping plane, set as a side-effect of GlobeSurfaceTileProvider#computeTileVisibility)
    * replacementPrevious / replacementNext (This tile's position in the TileReplacementQueue linked list)
* Probably not needed
    * pickBoundingSphere (assigned and used in Globe#pick, not clear why this needs to be a tile property)
    * pickTerrain (points to either the loaded or upsampled TileTerrain instance)
    * minimumHeight / maximumHeight (same as the min/max height in tileBoundingRegion?)
* Not sure
    * _priorityFunction (used to prioritize requests, returns the tile's distance to the tileBoundingRegion)
    * _customData (custom data that is inside the bounds of this tile)
    * _frameUpdated (used in QuadtreeTile#_updateCustomData to determine when a parent tile was updated more (?) recently than this tile)
    * _frameRendered (used in QuadtreePrimitive#createRenderCommandsForSelectedTiles to determine which tiles need updated heights)
    * _loadedCallbacks (used for WMTS (?) to remove old imagery once new imagery is loaded. I think.)
