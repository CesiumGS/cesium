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
        this._worstCaseVirtualDims = new Cartesian3(); // The same for every level
        this._virtualDims = []; // Cartesian3's, min of worst case dim and treedim
        this._treeDims = []; // Cartesian3's
        this._invTileDims = []; // Cartesian3's

        // TODO: move things like _startLevel from tileset into here?
    }

    defineProperties(ImplicitIndicesFinder.prototype, {
    });

    var scratch0 = new Cartesian3();
    var scratch1 = new Cartesian3();
    var scratch2 = new Cartesian3();
    var scratchHalfDiagonal = new Cartesian3();
    /**
     * Inits the _lodDistances array so that it's the proper size
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.updateBoundsMinMaxSpan = function() {
        // Only works with orientedBoundingBox, region-based should not move.
        var bounds = this._tileset._root.boundingVolume._orientedBoundingBox;
        var center = bounds.center;
        var halfAxes = bounds.halfAxes;

        var boundsMin = this._boundsMin;
        var boundsMax = this._boundsMax;

        // Each col is vector from center to a face along local axes
        Matrix3.getColumn(halfAxes, 0, scratch0);
        Matrix3.getColumn(halfAxes, 1, scratch1);
        Matrix3.getColumn(halfAxes, 2, scratch2);

        // Get the half diagonal
        Cartesian3.add(scratch0, scratch1, scratchHalfDiagonal);
        Cartesian3.add(scratchHalfDiagonal, scratch2 , scratchHalfDiagonal);

        // Find min max corners relative to its center in world coords
        Cartesian3.subtract(center, scratchHalfDiagonal, boundsMin);
        Cartesian3.add(center, scratchHalfDiagonal, boundsMax);

        // Get full diagonal, this is bounds span in each direction
        var boundsSpan = this._boundsSpan;
        boundsSpan.x = Cartesian3.magnitude(scratch0);
        boundsSpan.y = Cartesian3.magnitude(scratch1);
        boundsSpan.z = Cartesian3.magnitude(scratch2);
    };

    /**
     * Inits the _lodDistances array so that it's the proper size
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.initArraySizes = function() {
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
            virtuaDims.push(new Cartesian3());
        }

        // TODO: don't think these are needed beyond finding the invTileDims per level
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
            Cartesian3.subtract(boundsMax, boundsMin, boundsSpan);
        } else {
            this.updateBoundsMinMaxSpan();
        }

        var isOct = tileset._isOct;
        var rootGridDimensions = tilingScheme.headCount;
        var treeDimsOnLevel, invTileDimsOnLevel;
        for (i = 0; i < length; i++) {
            treeDimsOnLevel = new Cartesian3(
                (rootGridDimensions[0] << i),
                (rootGridDimensions[1] << i),
                isOct ? (rootGridDimensions[2] << i) : 1
            );
            treeDims.push(treeDimsOnLevel);

            invTileDimsOnLevel = new Cartesian3();
            Cartesian3.divideComponents(treeDimsOnLevel, boundsSpan, invTileDimsOnLevel);
            invTileDims.push(invTileDimsOnLevel);
        }
    };

    /**
     * Updates the _lodDistances array with LOD sphere radii from the camera to
     * pull in tiles on different levels of the tree
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.getMaxConeAngle = function() {
        return 0;
    };

    /**
     * Updates the _lodDistances array with LOD sphere radii from the camera to
     * pull in tiles on different levels of the tree
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.updateLevelInfo = function(frameState) {
        var lodDistances = this._lodDistances;
        var length = lodDistances.length;
        var height = frameState.context.drawingBufferHeight;
        var sseDenominator = frameState.camera.frustum.sseDenominator;
        var tileset = this._tileset;
        var factor = height / (tileset._maximumScreenSpaceError * sseDenominator);

        if (this._lodFactor === factor) {
            return;
        }

        // NOTE: if lodFactor changed, you must also update the other infomation about the levels.

        this._lodFactor = factor;
        var startingGError = tileset._geometricErrorContentRoot;
        var base = tileset.getGeomtricErrorBase();
        var tilesetStartLevel = tileset._startLevel;
        // var useChildSphere = tileset._allTilesAdditive ? 0 : 1; // ad to pow exponent
        var i, lodDistance, gErrorOnLevel;
        var treeDimsOnLevel, virtuaDimsOnLevel;
        var treeDims = this._treeDims;
        var virtuaDims = this._virtualDims;
        var invTileDims = this._invTileDims;
        var seams = this._seams;
        var radii = this._radii;
        var radiiRatios = this._radiiRatios;
        var centers = this._centers;

        // Worst case dims, they're the same for every level
        var worstCaseVirtualDims = this._worstCaseVirtualDims;
        lodDistance = startingGError * factor;
        // TODO: The calc is different for 2D Map, it would be the max cone angle between the two sphere intersections tile dims is in radians in that case
        // TODO: also not sure if its the same on ever level in the 2D map case?
        var radius = defined(this._region) ? lodDistance : lodDistance;
        Cartesian3.multiplyByScalar(invTileDims[tilesetStartLevel], radius * 2, worstCaseVirtualDims);
        worstCaseVirtualDims.x = Math.ceil(worstCaseVirtualDims.x) + 1;
        worstCaseVirtualDims.y = Math.ceil(worstCaseVirtualDims.y) + 1;
        worstCaseVirtualDims.z = Math.ceil(worstCaseVirtualDims.z) + 1;


        for (i = tilesetStartLevel; i < length; i++) {
            gErrorOnLevel = startingGError / Math.pow(base, i - tilesetStartLevel);
            lodDistance = gErrorOnLevel * factor;
            lodDistances[i] = lodDistance;

            // virtuaDims, i.e. min of worst and treeDimsOnLevel, or what the actual virtual grid would store
            treeDimsOnLevel = treeDims[i];
            virtuaDimsOnLevel = virtuaDims[i];
            Cartesian3.minimumByComponent(worstCaseVirtualDims, treeDimsOnLevel, virtuaDimsOnLevel);

            // centers, the cell location of cam pos
            // seams, the cell location of the sphere extents
            // radii, the circle formed on the surface of the slabs
            // radiiRatios, the circle radius length in array space along each direction
        }

        for (i = 0; i < length; i++) {
            console.log('lodDistance ' + i + ' ' + lodDistances[i]);
        }
    };

    /**
     * @private
     */
    ImplicitIndicesFinder.prototype.update = function(frameState) {
        // Updates the current view for all reachable levels.
        // Depeding on expense, maybe just do for every level and call it a day
        // (in case something wants to query beyond traversal depth later).

        this.updateLevelInfo(frameState);

        // Find the distnace to the tileset contentless root and use that that determine maximumTreversalDepth
        var tileset = this._tileset;
        // updateVisibility is called on root in traversal before this
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
