/*global define*/
define([
        './TerrainState'
    ], function(
        TerrainState) {
   "use strict";

   var TerrainMesh = function TerrainMesh(center, vertices, indices, minHeight, maxHeight) {
       this.center = center;
       this.vertices = vertices;
       this.indices = indices;
       this.minHeight = minHeight;
       this.maxHeight = maxHeight;
   };

   return TerrainMesh;
});
