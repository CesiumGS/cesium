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

       if (typeof this.vertexArray !== 'undefined') {
           var indexBuffer = this.vertexArray.getIndexBuffer();

           this.vertexArray.destroy();
           this.vertexArray = undefined;

           if (!indexBuffer.isDestroyed() && typeof indexBuffer.referenceCount !== 'undefined') {
               --indexBuffer.referenceCount;
               if (indexBuffer.referenceCount === 0) {
                   indexBuffer.destroy();
               }
           }
       }
   };

   return TileTerrain;
});
