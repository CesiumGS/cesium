/*global define*/
define([
        './TerrainState'
    ], function(
        TerrainState) {
   "use strict";

   var TileTerrain = function TileTerrain() {
       /**
        * The current state of the terrain in the terrain processing pipeline.
        * @type TerrainState
        */
       this.state = TerrainState.UNLOADED;
       this.data = undefined;
       this.transformedData = undefined;

       this.center = undefined;

       /**
        * The {@link VertexArray} defining the geometry of this tile.  This property
        * is expected to be set before the tile enter's the {@link TerrainState.READY}
        * {@link state}.
        * @type VertexArray
        */
       this.vertexArray = undefined;

       this.minHeight = 0.0;
       this.maxHeight = 0.0;

       /**
        * A sphere that completely contains this tile on the globe.  This property may be
        * undefined until the tile's {@link vertexArray} is loaded.
        * @type BoundingSphere
        */
       this.boundingSphere3D = undefined;

       this.boundingSphere2D = undefined;

       /**
        * A proxy point to use for this tile for horizon culling.  If this point is below the horizon, the
        * entire tile is below the horizon as well.  The point is expressed in the ellipsoid-scaled
        * space.  To transform a point from world coordinates centered on the ellipsoid to ellipsoid-scaled
        * coordinates, multiply the world coordinates by {@link Ellipsoid#getOneOverRadii}.  See
        * <a href="http://blogs.agi.com/insight3d/index.php/2009/03/25/horizon-culling-2/">http://blogs.agi.com/insight3d/index.php/2009/03/25/horizon-culling-2/</a>
        * for information the proxy point.
        *
        * @type {Cartesian3}
        */
       this.occludeePointInScaledSpace = undefined;
   };

   return TileTerrain;
});
