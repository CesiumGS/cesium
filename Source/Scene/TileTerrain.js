/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/DeveloperError',
        './TerrainProvider',
        './TerrainState',
        '../ThirdParty/when'
    ], function(
        BoundingSphere,
        Cartesian3,
        DeveloperError,
        TerrainProvider,
        TerrainState,
        when) {
   "use strict";

   var TileTerrain = function TileTerrain(upsampleDetails) {
       /**
        * The current state of the terrain in the terrain processing pipeline.
        * @type TerrainState
        */
       this.state = TerrainState.UNLOADED;
       this.data = undefined;
       this.mesh = undefined;
       this.vertexArray = undefined;
       this.upsampleDetails = upsampleDetails;
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

   TileTerrain.prototype.processLoadStateMachine = function(context, terrainProvider, x, y, level) {
       if (this.state === TerrainState.UNLOADED) {
           // Request the terrain from the terrain provider.
           this.data = terrainProvider.requestTileGeometry(x, y, level);

           // If the request method returns undefined (instead of a promise), the request
           // has been deferred.
           if (typeof this.data !== 'undefined') {
               this.state = TerrainState.RECEIVING;

               var that = this;
               when(this.data, function(terrainData) {
                   that.data = terrainData;
                   that.state = TerrainState.RECEIVED;
               }, function() {
                   // TODO: add error reporting and retry logic similar to imagery providers.
                   that.state = TerrainState.FAILED;
               });
           }
       }

       if (this.state === TerrainState.RECEIVED) {
           transform(this, context, terrainProvider, x, y, level);
       }

       if (this.state === TerrainState.TRANSFORMED) {
           createResources(this, context, terrainProvider, x, y, level);
       }
   };

   TileTerrain.prototype.processUpsampleStateMachine = function(context, terrainProvider, x, y, level) {
       if (this.state === TerrainState.UNLOADED) {
           var upsampleDetails = this.upsampleDetails;
           if (typeof upsampleDetails === 'undefined') {
               throw new DeveloperError('TileTerrain cannot upsample unless provided upsampleDetails.');
           }

           var sourceData = upsampleDetails.data;
           var sourceX = upsampleDetails.x;
           var sourceY = upsampleDetails.y;
           var sourceLevel = upsampleDetails.level;

           this.data = sourceData.upsample(terrainProvider.tilingScheme, sourceX, sourceY, sourceLevel, x, y, level);
           if (typeof this.data === 'undefined') {
               // The upsample request has been deferred - try again later.
               return;
           }

           this.state = TerrainState.RECEIVING;

           var that = this;
           when(this.data, function(terrainData) {
               that.data = terrainData;
               that.state = TerrainState.RECEIVED;
           }, function() {
               that.state = TerrainState.FAILED;
           });
       }

       if (this.state === TerrainState.RECEIVED) {
           transform(this, context, terrainProvider, x, y, level);
       }

       if (this.state === TerrainState.TRANSFORMED) {
           createResources(this, context, terrainProvider, x, y, level);
       }
   };

   function transform(tileTerrain, context, terrainProvider, x, y, level) {
       var tilingScheme = terrainProvider.tilingScheme;
       var ellipsoid = tilingScheme.getEllipsoid();

       var terrainData = tileTerrain.data;
       var meshPromise = terrainData.createMesh(ellipsoid, tilingScheme, x, y, level);

       if (typeof meshPromise === 'undefined') {
           // Postponed.
           return;
       }

       tileTerrain.state = TerrainState.TRANSFORMING;

       when(meshPromise, function(mesh) {
           tileTerrain.mesh = mesh;
           tileTerrain.state = TerrainState.TRANSFORMED;
       }, function() {
           tileTerrain.state = TerrainState.FAILED;
       });
   }

   function createResources(tileTerrain, context, terrainProvider, x, y, level) {
       TerrainProvider.createTileEllipsoidGeometryFromBuffers(context, tileTerrain.mesh, tileTerrain, true);
       tileTerrain.state = TerrainState.READY;
   }

   return TileTerrain;
});
