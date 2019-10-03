define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Matrix3'
    ], function(
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Matrix3) {
    'use strict';

    /**
     * Finds reachable indices for:
     *      * Traversal
     *      * highest lods in bounds,
     *      * highest available lods in bounds,
     *      * ray march
     *      * cone march?
     * @alias ImplicitIndicesFinder
     * @constructor
     */
    function ImplicitIndicesFinder(tileset) {
        this._tileset = tileset;

        // LOD info
        // 1D array of LOD sphere radii.
        this._lodDistances = [];

        // Probably not needed?
        this._rootDistance = 0;

        // The content level that can be accessed.
        // ADD iterates down to this level using this the distance for the level
        // REPLACE iterates down to this level - 1 since it is parent based traversal.
        // It checks if the parent is in range of the distance for the childs level, if so the parent must be replaced by its children.
        // So ADD request/render tiles are the same but REPLACE has different indices for request and render,
        // i.e. request must take all children (packs of 4/8) so just expand render indices a little to pick up those culled children
        // for min index, just subtract 1 if odd, for max index add 1 if even
        this._maximumTraversalLevel = 0;
        this._lodFactor = -1; // from the distanced based sse equation (screenHeight / (tileset._maximumScreenSpaceError * sseDenominator))

        // How the camera relates to the grids on every level
        this._seams = []; // Cartesian3's, xyz seam per level, max index along each dir.
        this._radii = []; // Number, sphere cut radii in meters, the circle that forms on the surface of nearest face slab, clamp to max if camera inside slab
        this._radiiRatios = []; // Cartesian3's, Radii / cell dim on a level
        this._centers = []; // Cartesian3's, Where the cam pos lives on the level
        this._region = undefined;
        this._boundsMin = new Cartesian3();
        this._boundsMax = new Cartesian3();
        this._boundsSpan = new Cartesian3();

        // Dim info
        this._worstCaseVirtualDims = new Cartesian3(); // Should be the same for every level
        this._virtualDims = []; // Cartesian3's, min or worst case dim and treedim
        this._treeDims = []; // Cartesian3's
        this._invTileDims = []; // Cartesian3's

        // TODO: move things like _startLevel from tileset into here?
    }

    defineProperties(ImplicitIndicesFinder.prototype, {
    });

    /**
     * Updates the _lodDistances array with LOD sphere radii from the camera to
     * pull in tiles on different levels of the tree
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.updateLODDistances = function(frameState) {
        var lodDistances = this._lodDistances;
        var length = lodDistances.length;
        var height = frameState.context.drawingBufferHeight;
        var sseDenominator = frameState.camera.frustum.sseDenominator;
        var tileset = this._tileset;
        var factor = height / (tileset._maximumScreenSpaceError * sseDenominator);

        if (this._lodFactor === factor) {
            return;
        }

        this._lodFactor = factor;
        var startingGError = tileset._geometricErrorContentRoot;
        var base = tileset.getGeomtricErrorBase();
        var tilesetStartLevel = tileset._startLevel;
        // var useChildSphere = tileset._allTilesAdditive ? 0 : 1; // ad to pow exponent
        var i, lodDistance, gErrorOnLevel;
        for (i = tilesetStartLevel; i < length; i++) {
            gErrorOnLevel = startingGError / Math.pow(base, i - tilesetStartLevel);
            lodDistance = gErrorOnLevel * factor;
            lodDistances[i] = lodDistance;
            // TODO: if lodFactor changed you must also update the other infomation about the levels
        }

        for (i = 0; i < length; i++) {
            console.log('lodDistance ' + i + ' ' + lodDistances[i]);
        }
    };

    var scratch0 = new Cartesian3();
    var scratch1 = new Cartesian3();
    var scratch2 = new Cartesian3();
    var scratchHalfDiagonal = new Cartesian3();
    /**
     * Inits the _lodDistances array so that it's the proper size
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.updateBoundsMinMax = function() {
        // Only works with orientedBoundingBox, region-based should not move.
        var bounds = this._tileset._root.boundingVolume._orientedBoundingBox;
        var center = bounds.center;
        var halfAxes = bounds.halfAxes

        var boundsMin = this._boundsMin;
        var boundsMax = this._boundsMax;

        Matrix3.getColumn(halfAxes, 0, scratch0);
        Matrix3.getColumn(halfAxes, 1, scratch1);
        Matrix3.getColumn(halfAxes, 2, scratch2);
        // Get the half diagonal
        Cartesian3.add(scratch0, scratch1, scratchHalfDiagonal);
        Cartesian3.add(scratchHalfDiagonal, scratch2 , scratchHalfDiagonal);

        // Find min max corners relative to its center in world coords
        Cartesian3.subtract(center, scratchHalfDiagonal, boundsMin);
        Cartesian3.add(center, scratchHalfDiagonal, boundsMax);
    };

    /**
     * Inits the _lodDistances array so that it's the proper size
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.initArraySizes = function() {
        // TODO: when to update this based on camera, context, and  max gerror changes?
        var tileset = this._tileset;
        var tilingScheme = tileset._tilingScheme;
        var length = tilingScheme.lastLevel + 1;

        var lodDistances = this._lodDistances;
        var seams =  this._seams;
        var radii =  this._radii;
        var radiiRatios =  this._radiiRatios;
        var centers =  this._centers;
        var treeDims =  this._treeDims;
        var virtuaDims =  this._virtualDims;
        var invTileDims =  this._invTileDims;

        var i;
        for (i = 0; i < length; i++) {
            lodDistances.push(-1);
            seams.push(new Cartesian3());
            radii.push(-1);
            radiiRatios.push(new Cartesian3());
            centers.push(new Cartesian3());
        }

        var boundsMin = this._boundsMin;
        var boundsMax = this._boundsMax;
        var boundsSpan = this._boundsSpan;

        var bounds = tilingScheme.boundingVolume.region;

        if (defined(bounds)) {
            this._region = bounds;
            // region: [ west, south, east, north, minimumHeight, maximumHeight ]
            boundsMin.x = bounds[0];
            boundsMin.y = bounds[1];
            boundsMin.z = bounds[4];
            boundsMax.x = bounds[2];
            boundsMax.y = bounds[3];
            boundsMax.z = bounds[5];
        } else {
            this.updateBoundsMinMax();
        }

        Cartesian3.subtract(boundsMax, boundsMin, boundsSpan);

        var isOct = tileset._isOct;
        var rootGridDimensions = tilingScheme.headCount;
        var result;
        for (i = 0; i < length; i++) {
            result = new Cartesian3(
                (rootGridDimensions[0] << i),
                (rootGridDimensions[1] << i),
                isOct ? (rootGridDimensions[2] << i) : 1
            );
            treeDims.push(result);

            result = Cartesian3.divideComponents(boundsSpan, result, result);
            invTileDims.push(result);
        }
    };

    /**
     * @private
     */
    ImplicitIndicesFinder.prototype.update = function(frameState) {
        // Updates the current view for all reachable levels.
        // Depeding on expense, maybe just do for every level and call it a day
        // (in case something wants to query beyond traversal depth later).

        this.updateLODDistances(frameState);

        var tileset = this._tileset;
        // Find the distnace to the tileset contentless root and use that that determine maximumTreversalDepth
        var distance = tileset._root._distanceToCamera;

        var lodDistances = this._lodDistances;
        var length = lodDistances.length;
        this._maximumTraversalLevel = length - 1;
        var tilesetStartLevel = tileset._startLevel;
        var i;
        for (i = tilesetStartLevel; i < length; i++) {
            if (lodDistances[i] < distance) {
                this._maximumTraversalLevel = i - 1;
                break;
            }
        }

        if (Math.abs(this._rootDistance - distance) > CesiumMath.EPSILON2) {
            console.log('root dist ' + distance);
            console.log('max lvl ' + this._maximumTraversalLevel);
            this._rootDistance = distance;
        }
    };

    /**
     * @private
     */
    ImplicitIndicesFinder.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    ImplicitIndicesFinder.prototype.destroy = function() {
        // For the interval between new content being requested and downloaded, expiredContent === content, so don't destroy twice
        // return destroyObject(this);
    };

    return ImplicitIndicesFinder;
});
