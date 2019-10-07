define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4'
    ], function(
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Matrix3,
        Matrix4) {
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

        // Only used for debug
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
        this._minIndices = []; // Cartesian3's, max index along each dir, continuous grid
        this._maxIndices = []; // Cartesian3's, max index along each dir, continuous grid
        this._centerIndices = []; // Cartesian3's, Where the cam pos lives on the level, continuous grid.
        // TODO: are these needed
        this._minTilePositions = []; // Same as minIndices but includes fractional part as well
        this._maxTilePositions = []; // Same as maxIndices but includes fractional part as well
        this._centerTilePositions = []; // Same as center but includes fractional part as well.

        // Number, sphere cut radii in meters, the circle that forms on the surface of nearest face slab, clamp to max if camera inside slab
        // imprintRadii, the circle formed on the surface of the slabs
        // for quad you only need along the z dir, for oct you need x and y dirs as well
        // for quad there's only 1 slab on every level. For oct every level will have a set of slabs (worstCaseVirtualDims)
        // radiiToTileRatios, the circle radius length in array space along each direction, same idea as to lodDistanceToTileRatio
        // Don't think i need per slab imprint radii, only lodDistanceToTileRatio
        // this._imprintRadiiZ = []; // Only 1 per level in quad
        // this._imprintRadiiX = []; // Oct only
        // this._imprintRadiiY = []; // Oct only
        // // Cartesian3's, Radii / cell dim on a level. How many tiles long is it, in each direction.
        // this._imprintRadiiToTileRatiosZ = [];
        // this._imprintRadiiToTileRatiosX = [];
        // this._imprintRadiiToTileRatiosY = [];
        this._region = undefined;
        this._boundsMin = new Cartesian3(); // world space min corner of the box bounds
        this._boundsMax = new Cartesian3();  // world space max corner of the box bounds
        this._boundsSpan = new Cartesian3(); // world length, width, height of the box bounds
        this._lodDistanceToTileRatio = new Cartesian3(); // the lod sphere radii / tile dims. Will be the same for every level. How many tiles long is it, in each direction.

        // Dim info
        this._worstCaseVirtualDims = new Cartesian3(); // The same for every level
        this._virtualDims = []; // Cartesian3's, min of worst case dim and treedim
        this._treeDims = []; // Cartesian3's
        this._lastIndices = []; // Cartesian3's
        this._invTileDims = []; // Cartesian3's
        this._invLocalTileDims = []; // Cartesian3's

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
        var boundsCenter = bounds.center;
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
        Cartesian3.subtract(boundsCenter, scratchHalfDiagonal, boundsMin);
        Cartesian3.add(boundsCenter, scratchHalfDiagonal, boundsMax);

        // Get full diagonal, this is bounds span in each direction
        var boundsSpan = this._boundsSpan;
        boundsSpan.x = Cartesian3.magnitude(scratch0) * 2;
        boundsSpan.y = Cartesian3.magnitude(scratch1) * 2;
        boundsSpan.z = Cartesian3.magnitude(scratch2) * 2;
    };

    var constLocalBoxSpan = new Cartesian3(2, 2, 2);
    var constOne = new Cartesian3(1, 1, 1);
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
        var minIndices =  this._minIndices;
        var maxIndices =  this._maxIndices;
        var centerIndices =  this._centerIndices;
        // var imprintRadii =  this._imprintRadii;
        // var imprintRadiiToTileRatios =  this._imprintRadiiToTileRatios;
        var minTilePositions =  this._minTilePositions;
        var maxTilePositions =  this._maxTilePositions;
        var centerTilePositions =  this._centerTilePositions;
        var treeDims =  this._treeDims;
        var lastIndices =  this._lastIndices;
        var virtuaDims =  this._virtualDims;
        var invTileDims =  this._invTileDims;
        var invLocalTileDims =  this._invLocalTileDims;

        var i;
        for (i = 0; i < length; i++) {
            lodDistances.push(-1);
            minIndices.push(new Cartesian3());
            maxIndices.push(new Cartesian3());
            centerIndices.push(new Cartesian3());
            // imprintRadii.push(new Cartesian3());
            // imprintRadiiToTileRatios.push(new Cartesian3());
            minTilePositions.push(new Cartesian3());
            maxTilePositions.push(new Cartesian3());
            centerTilePositions.push(new Cartesian3());
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
        var treeDimsOnLevel, invTileDimsOnLevel, invLocalTileDimsOnLevel, lastIndicesOnLevel;
        for (i = 0; i < length; i++) {
            treeDimsOnLevel = new Cartesian3(
                (rootGridDimensions[0] << i),
                (rootGridDimensions[1] << i),
                isOct ? (rootGridDimensions[2] << i) : 1
            );
            treeDims.push(treeDimsOnLevel);

            lastIndicesOnLevel = Cartesian3.subtract(treeDimsOnLevel, constOne, new Cartesian3());
            lastIndices.push(lastIndicesOnLevel);

            invTileDimsOnLevel = new Cartesian3();
            Cartesian3.divideComponents(treeDimsOnLevel, boundsSpan, invTileDimsOnLevel);
            invTileDims.push(invTileDimsOnLevel);

            invLocalTileDimsOnLevel = new Cartesian3();
            Cartesian3.divideComponents(treeDimsOnLevel, constLocalBoxSpan, invLocalTileDimsOnLevel);
            invLocalTileDims.push(invLocalTileDimsOnLevel);
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
        var i, lodDistance, gErrorOnLevel;
        var treeDimsOnLevel, virtuaDimsOnLevel;
        var treeDims = this._treeDims;
        var virtuaDims = this._virtualDims;
        var invTileDims = this._invTileDims;
        // Shouldn't this be the same on every level?
        // var lodDistanceToTileRatios = this._lodDistanceToTileRatios;

        // Worst case dims, they're the same for every level
        var worstCaseVirtualDims = this._worstCaseVirtualDims;
        lodDistance = startingGError * factor;
        // TODO: The calc is different for 2D Map, it would be the max cone angle between the two sphere intersections tile dims is in radians in that case
        // TODO: also not sure if worstCaseVirtualDims the same on every level in the 2D map case
        // var radius = defined(this._region) ? this.getMaxConeAngle() : lodDistance;
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

            // TODO: setup array of radii
        }

        Cartesian3.multiplyByScalar(invTileDims[tilesetStartLevel], lodDistances[tilesetStartLevel], this._lodDistanceToTileRatio);

        for (i = 0; i < length; i++) {
            console.log('lodDistance ' + i + ' ' + lodDistances[i]);
        }
        console.log('lodDistanceToTileRatios ' + this._lodDistanceToTileRatio);
    };

    var scratchLocalCameraPosition = new Cartesian3();
    var scratchMinCornerToCameraPosition = new Cartesian3();
    var scratchTranspose = new Matrix3();
    var lastmin = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var lastmax = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var lastcenter = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var lastcenterpos = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    /**
     * Updates the _lodDistances array with LOD sphere radii from the camera to
     * pull in tiles on different levels of the tree
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.updateCameraLevelInfo = function(frameState) {
        var lodDistances = this._lodDistances;
        var length = lodDistances.length;
        var tileset = this._tileset;
        var boxAxes = tileset.boxAxes;

        var tilesetStartLevel = tileset._startLevel;
        // var invLocalTileDims = this._invLocalTileDims;
        var centerIndices = this._centerIndices;
        var centerTilePositions = this._centerTilePositions;
        var invTileDims = this._invTileDims;
        var lastIndices = this._lastIndices;
        var cameraPosition = frameState.camera.positionWC;
        var lodDistanceToTileRatio = this._lodDistanceToTileRatio;

        var i, invTileDimsOnLevel;
        var centerIndexOnLevel , centerTilePositionOnLevel, lodDistanceOnLevel;

        // Find the distnace to the tileset contentless root and use that that determine maximumTreversalDepth
        // updateVisibility is called on root in traversal before this
        var distance = tileset._root._distanceToCamera;
        this._maximumTraversalLevel = length - 1;
        for (i = tilesetStartLevel; i < length; i++) {
            if (lodDistances[i] < distance) {
                this._maximumTraversalLevel = i - 1;
                break;
            }
        }

        // DEBUG PRINT
        if (Math.abs(this._rootDistance - distance) > CesiumMath.EPSILON2) {
            // console.log('root dist ' + distance);
            // console.log('max lvl ' + this._maximumTraversalLevel);
            this._rootDistance = distance;
        }

        // Get local cam pos relative to min corner
        // Matrix4.multiplyByPoint(tileset.computedTransformInverse, cameraPosition, scratchLocalCameraPosition);
        // Cartesian3.add(scratchLocalCameraPosition, constLocalBoxHalfSpan, scratchLocalCameraPosition);

        Cartesian3.subtract(cameraPosition, this._boundsMin, scratchMinCornerToCameraPosition);
        Matrix3.transpose(boxAxes, scratchTranspose);
        Matrix3.multiplyByVector(scratchTranspose, scratchMinCornerToCameraPosition, scratchLocalCameraPosition);

        for (i = tilesetStartLevel; i < length; i++) {

            // centerIndices:
            // the center tile index of cam pos
            centerTilePositionOnLevel = centerTilePositions[i];

            // invLocalTileDimsOnLevel = invLocalTileDims[i];
            // Cartesian3.multiplyComponents(scratchLocalCameraPosition, invLocalTileDimsOnLevel, centerTilePositionOnLevel);
            invTileDimsOnLevel = invTileDims[i];
            Cartesian3.multiplyComponents(scratchLocalCameraPosition, invTileDimsOnLevel, centerTilePositionOnLevel);

            centerIndexOnLevel = centerIndices[i];
            centerIndexOnLevel.x = Math.floor(centerTilePositionOnLevel.x);
            centerIndexOnLevel.y = Math.floor(centerTilePositionOnLevel.y);
            centerIndexOnLevel.z = Math.floor(centerTilePositionOnLevel.z);

            // TODO: not sure if need to the full thing or just the fractional part
            // Cartesian3.subtract(centerTilePositionOnLevel.x, centerIndexOnLevel.x, centerTilePositionOnLevel.x);
            // Cartesian3.subtract(centerTilePositionOnLevel.y, centerIndexOnLevel.y, centerTilePositionOnLevel.y);
            // Cartesian3.subtract(centerTilePositionOnLevel.z, centerIndexOnLevel.z, centerTilePositionOnLevel.z);

        }
        var lastIndicesOnLevel, minIndicesOnLevel, maxIndicesOnLevel, maxTilePositionOnLevel, minTilePositionOnLevel;
        var minIndices = this._minIndices;
        var maxIndices = this._maxIndices;
        var minTilePositions = this._minTilePositions;
        var maxTilePositions = this._maxTilePositions;
        // var imprintRadii = this._imprintRadii;
        // var imprintRadiiToTileRatios = this._imprintRadiiToTileRatios;

        var maximumTreversalLevel = this._maximumTraversalLevel;
        for (i = tilesetStartLevel; i < maximumTreversalLevel; i++) {
            invTileDimsOnLevel = invTileDims[i];
            centerTilePositionOnLevel = centerTilePositions[i];

            // maxIndices, Positions
            maxTilePositionOnLevel = maxTilePositions[i];
            lodDistanceOnLevel = lodDistances[i];
            Cartesian3.multiplyByScalar(invTileDimsOnLevel, lodDistanceOnLevel, lodDistanceToTileRatio);
            Cartesian3.add(centerTilePositionOnLevel, lodDistanceToTileRatio, maxTilePositionOnLevel);

            maxIndicesOnLevel = maxIndices[i];
            maxIndicesOnLevel.x = Math.floor(maxTilePositionOnLevel.x);
            maxIndicesOnLevel.y = Math.floor(maxTilePositionOnLevel.y);
            maxIndicesOnLevel.z = Math.floor(maxTilePositionOnLevel.z);

            lastIndicesOnLevel = lastIndices[i];
            // Cartesian3.minimumByComponent(maxIndicesOnLevel, lastIndicesOnLevel, maxIndicesOnLevel);

            // minIndices, Positions
            minTilePositionOnLevel = minTilePositions[i];
            Cartesian3.subtract(centerTilePositionOnLevel, lodDistanceToTileRatio, minTilePositionOnLevel);

            minIndicesOnLevel = minIndices[i];
            minIndicesOnLevel.x = Math.floor(minTilePositionOnLevel.x);
            minIndicesOnLevel.y = Math.floor(minTilePositionOnLevel.y);
            minIndicesOnLevel.z = Math.floor(minTilePositionOnLevel.z);
            // Cartesian3.maximumByComponent(minIndicesOnLevel, Cartesian3.ZERO, minIndicesOnLevel);

            // DEBUG PRINTS
            if (i === tilesetStartLevel) {
                // if (!Cartesian3.equals(lastcenter, centerIndexOnLevel)) {
                //     Cartesian3.clone(centerIndexOnLevel, lastcenter);
                //     console.log('centerIndexOnLevel: ' + centerIndexOnLevel);
                // }
                // if (!Cartesian3.equals(lastcenterpos, centerTilePositionOnLevel)) {
                //     Cartesian3.clone(centerTilePositionOnLevel, lastcenterpos);
                //     console.log('centerTilePositionOnLevel: ' + centerTilePositionOnLevel);
                // }
                // if (!Cartesian3.equals(lastmin, minIndicesOnLevel)) {
                //     Cartesian3.clone(minIndicesOnLevel, lastmin);
                //     console.log('min indices: ' + minIndicesOnLevel);
                // }
                // if (!Cartesian3.equals(lastmax, maxIndicesOnLevel)) {
                //     Cartesian3.clone(maxIndicesOnLevel, lastmax);
                //     console.log('max indices: ' + maxIndicesOnLevel);
                // }
            }
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

        this.updateCameraLevelInfo(frameState);
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
