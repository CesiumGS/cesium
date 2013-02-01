/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        './TerrainState'
    ], function(
        BoundingSphere,
        Cartesian3,
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

   TileTerrain.prototype.publishToTile = function(tile) {
       var mesh = this.mesh;
       Cartesian3.clone(mesh.center, tile.center);
       tile.minHeight = mesh.minHeight;
       tile.maxHeight = mesh.maxHeight;
       BoundingSphere.clone(mesh.boundingSphere2D, tile.boundingSphere2D);
       BoundingSphere.clone(mesh.boundingSphere3D, tile.boundingSphere3D);

       if (typeof mesh.occludeePointInScaledSpace !== 'undefined') {
           Cartesian3.clone(mesh.occludeePointInScaledSpace, tile.occludeePointInScaledSpace);
       } else {
           tile.occludeePointInScaledSpace = undefined;
       }

       // Free the existing vertex array, if any.
       tile.freeVertexArray();

       // Transfer ownership of the vertex array to the tile itself.
       tile.vertexArray = this.vertexArray;
       this.vertexArray = undefined;
   };

   return TileTerrain;
});
