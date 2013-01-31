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
       this.mesh = undefined;
       this.vertexArray = undefined;
   };

   TileTerrain.prototype.freeResources = function() {
       this.state = TerrainState.UNLOADED;
       this.data = undefined;
       this.mesh = undefined;

       // TODO: free the vertexArray, but watch out because we transfer ownership of it to the Tile.
   };

   return TileTerrain;
});
