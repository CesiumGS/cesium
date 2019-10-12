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
        this._startLevel = 0;
        this._lodFactor = -1; // from the distanced based sse equation (screenHeight / (tileset._maximumScreenSpaceError * sseDenominator))

        // How the camera relates to the grids on every level
        // NOTE: min max indices are an inclusive range
        this._minIndices = []; // Cartesian3's, max index along each dir, continuous grid
        this._maxIndices = []; // Cartesian3's, max index along each dir, continuous grid
        this._centerIndices = []; // Cartesian3's, Where the cam pos lives on the level, continuous grid.
        // TODO: are these needed outside of debug?
        this._minTilePositions = []; // Same as minIndices but includes fractional part as well
        this._maxTilePositions = []; // Same as maxIndices but includes fractional part as well

        // Needed to shift the originEllipsoid to the camera location in the level grid
        this._centerTilePositions = []; // Same as center but includes fractional part as well.

        // TODO: likely want a separate class for region? not sure which functions are different
        this._region = undefined;
        this._boundsMin = new Cartesian3(); // world space min corner of the box bounds
        this._boundsMax = new Cartesian3();  // world space max corner of the box bounds
        this._boundsSpan = new Cartesian3(); // world length, width, height of the box bounds
        this._lodDistanceToTileRatio = new Cartesian3(); // LOD radii / tile dims. How many tiles long is it, in each direction. Same for every level.

        // this is precomputed after _lodDistanceToTileRatio is recomputed since that tells the ellipsoid axial extents
        // This is a precomputed ellipsoid spine for the fixed grid where the camera is at 000
        // It does not store the main axes extents which would just be _lodDistanceToTileRatio
        // This is reference spine is the same for every level
        // Every level generates its own traversal spine from the 000 spine and _centerTilePositions[level].
        // Need to know when poke-through happens and what to do about it.
        // MAYBE: only need to update portions of traversal spine that need it
        //
        // how to organize it? want a pile of xstart-xend index pairs for a
        // bunch of yz coordinates (make a struct for this concept/primitive, like [x1, x2, y, z] oct and [x1, x2, y] quad, or use cartesian4/3 to use add)
        // The main x axis spine just flips once(two versionn +x and -x), higher x axis spines (further up z) need 4 versions but everything else needs 8 versions
        // since they are in an actual octant.
        this._originEllipsoid = []; // array of cartesian2, 3 if oct.
        this._levelEllipsoids = []; // array of shifted  origin ellipsoids  for every level
        this._levelEllipsoid = [];  // The ellipsoid indices for current level

        // Dim info
        this._worstCaseVirtualDims = new Cartesian3(); // Same for every level
        this._virtualDims = []; // Cartesian3's, min of worst case dim and treedim
        this._treeDims = []; // Cartesian3's
        this._lastIndices = []; // Cartesian3's tree indices on every level
        this._invTileDims = []; // Cartesian3's 1/tile dims per level
        this._invLocalTileDims = []; // Cartesian3's
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
        var minTilePositions =  this._minTilePositions;
        var maxTilePositions =  this._maxTilePositions;
        var centerTilePositions =  this._centerTilePositions;
        var treeDims =  this._treeDims;
        var lastIndices =  this._lastIndices;
        var virtuaDims =  this._virtualDims;
        var invTileDims =  this._invTileDims;
        var invLocalTileDims =  this._invLocalTileDims;
        var levelEllipsoids =  this._levelEllipsoids;

        var i;
        for (i = 0; i < length; i++) {
            lodDistances.push(-1);
            minIndices.push(new Cartesian3());
            maxIndices.push(new Cartesian3());
            centerIndices.push(new Cartesian3());
            minTilePositions.push(new Cartesian3());
            maxTilePositions.push(new Cartesian3());
            centerTilePositions.push(new Cartesian3());
            virtuaDims.push(new Cartesian3());
            levelEllipsoids.push([]);
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

    // /**
    //  * Called at the end of a generateOriginEllipsoid to sync the sizes for each level ellipsoid with the origin ellipsoid
    //  *
    //  * @private
    //  */
    // ImplicitIndicesFinder.prototype.updateLevelEllipsoidsLengths = function() {
    //     var startLevel = this._startLevel;
    //     var lastLevel = this._tileset._tilingScheme.lastLevel;
    //     var originEllipsoidLength = this._originEllipsoid.length;
    //     var i, levelEllipsoid;
    //     var levelEllipsoids = this._levelEllipsoids;
    //     if (this._tileset._isOct) {
    //         for (i = startLevel; i <= lastLevel; i++) {
    //             levelEllipsoid = levelEllipsoids[i];
    //             while(originEllipsoidLength > levelEllipsoid.length) {
    //                 levelEllipsoid.push(new Cartesian4());
    //             }
    //             levelEllipsoid.length = originEllipsoidLength;
    //         }
    //     } else {
    //         for (i = startLevel; i <= lastLevel; i++) {
    //             levelEllipsoid = levelEllipsoids[i];
    //             while(originEllipsoidLength > levelEllipsoid.length) {
    //                 levelEllipsoid.push(new Cartesian3());
    //             }
    //             levelEllipsoid.length = originEllipsoidLength;
    //         }
    //     }
    // };

    /**
     * Called at the end of a generateOriginEllipsoid to sync the sizes for each level ellipsoid with the origin ellipsoid
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.updateLevelEllipsoidLength = function() {
        var originEllipsoidLength = this._originEllipsoid.length;
        var levelEllipsoid = this._levelEllipsoid;
        if (this._tileset._isOct) {
            while(originEllipsoidLength > levelEllipsoid.length) {
                levelEllipsoid.push(new Cartesian4());
            }
            levelEllipsoid.length = originEllipsoidLength;
        } else {
            while(originEllipsoidLength > levelEllipsoid.length) {
                levelEllipsoid.push(new Cartesian3());
            }
            levelEllipsoid.length = originEllipsoidLength;
        }
    };

    /**
     * Updates the _originEllipsoid array for a quadtree.
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.generateOriginEllipsoidQuad = function() {
        var lodDistanceToTileRatio = this._lodDistanceToTileRatio;
        var axesExtentsX = lodDistanceToTileRatio.x;
        var axesExtentsY = lodDistanceToTileRatio.y;
        // For quad, we only care about x extents at every y tick.
        this._originEllipsoid = []; // reset
        var originEllipsoid = this._originEllipsoid;

        // The x axis for the ellipsoid only needs 1 pair of start/stop along x axis
        // Everything else needs 2 pairs 1 above and below x axis.
        var x = axesExtentsX;
        originEllipsoid.push(new Cartesian3(x, 0, -x));

        var yEnd = Math.floor(axesExtentsY);
        var My = axesExtentsX * axesExtentsX;
        var Ny = My / (axesExtentsY * axesExtentsY);
        var y;
        for (y = 1; y <= yEnd; y++) {
            x = Math.sqrt(My - Ny * y * y);
            originEllipsoid.push(new Cartesian3(x, y,-x));
            originEllipsoid.push(new Cartesian3(x,-y,-x));
        }

        // this.updateLevelEllipsoidsLengths();
        this.updateLevelEllipsoidLength();
    };

    /**
     * Updates the _originEllipsoid array for an octree.
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.generateOriginEllipsoidOct = function() {
        var lodDistanceToTileRatio = this._lodDistanceToTileRatio;
        var axesExtentsX = lodDistanceToTileRatio.x;
        var axesExtentsY = lodDistanceToTileRatio.y;
        var axesExtentsZ = lodDistanceToTileRatio.z;

        this._originEllipsoid = []; // Reset
        var originEllipsoid = this._originEllipsoid;

        // The x axis for the ellipsoid only needs 1 pair of start/stop along x axis
        // Everything else needs 2 pairs 1 above and below x axis.
        var x = axesExtentsX;
        originEllipsoid.push(new Cartesian4(x, 0, 0,-x));

        var yToXExtentRatio = axesExtentsY / axesExtentsX;
        var zEnd = Math.floor(axesExtentsZ);
        var Mz = axesExtentsX * axesExtentsX;
        var Nz = Mz / (axesExtentsZ * axesExtentsZ);
        var y, z, yEnd, My, Ny, yExtentForEllipsoidSlice;
        for (z = 0; z <= zEnd; z++) {
            x = Math.sqrt(Mz - Nz * z * z);
            if (z > 0) {
                originEllipsoid.push(new Cartesian4(x, 0,  z,-x));
                originEllipsoid.push(new Cartesian4(x, 0, -z,-x));
            }
            yExtentForEllipsoidSlice = x*yToXExtentRatio;
            yEnd = Math.floor(yExtentForEllipsoidSlice);
            My = x * x;
            Ny = My / (yExtentForEllipsoidSlice * yExtentForEllipsoidSlice);
            for (y = 1; y <= yEnd; y++) {
                x = Math.sqrt(My - Ny * y * y);
                if (z > 0) {
                    originEllipsoid.push(new Cartesian4(x, y, z,-x));
                    originEllipsoid.push(new Cartesian4(x, y,-z,-x));
                    originEllipsoid.push(new Cartesian4(x,-y, z,-x));
                    originEllipsoid.push(new Cartesian4(x,-y,-z,-x));
                } else {
                    originEllipsoid.push(new Cartesian4(x, y, 0,-x));
                    originEllipsoid.push(new Cartesian4(x,-y, 0,-x));
                }
            }
        }

        // this.updateLevelEllipsoidsLengths();
        this.updateLevelEllipsoidLength();
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
        var tilesetStartLevel = this._startLevel;
        var i, lodDistance, gErrorOnLevel;
        var treeDimsOnLevel, virtuaDimsOnLevel;
        var treeDims = this._treeDims;
        var virtuaDims = this._virtualDims;
        var invTileDims = this._invTileDims;

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

        if (tileset._isOct) {
            this.generateOriginEllipsoidOct();
        } else {
            this.generateOriginEllipsoidQuad();
        }

        for (i = 0; i < length; i++) {
            console.log('lodDistance ' + i + ' ' + lodDistances[i]);
        }
        console.log('lodDistanceToTileRatio ' + this._lodDistanceToTileRatio);
    };

    /**
     * Updates an ellipsoid for the given level using the origin ellipsoid and the cameraCenterPosition
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.updateLevelEllipsoid = function(level) {
        var centerTilePositionOnLevel = this._centerTilePositions[level];
        // var levelEllipsoid = this._levelEllipsoids[level];
        var levelEllipsoid = this._levelEllipsoid;
        var originEllipsoid = this._originEllipsoid;
        var i, indexRange;
        var length = levelEllipsoid.length;
        if (this._tileset._isOct) {
            for (i = 0; i < length; i++) {
                indexRange = levelEllipsoid[i];
                Cartesian4.clone(originEllipsoid[i], indexRange);
                indexRange.x = Math.floor(indexRange.x + centerTilePositionOnLevel.x);
                indexRange.y = Math.floor(indexRange.y + centerTilePositionOnLevel.y);
                indexRange.z = Math.floor(indexRange.z + centerTilePositionOnLevel.z);
                indexRange.w = Math.floor(indexRange.w + centerTilePositionOnLevel.x);
            }
        } else {
            for (i = 0; i < length; i++) {
                indexRange = levelEllipsoid[i];
                Cartesian3.clone(originEllipsoid[i], indexRange);
                indexRange.x = Math.floor(indexRange.x + centerTilePositionOnLevel.x);
                indexRange.y = Math.floor(indexRange.y + centerTilePositionOnLevel.y);
                indexRange.z = Math.floor(indexRange.z + centerTilePositionOnLevel.x);
            }
        }

        return levelEllipsoid;
    };

    // TODO: REMOVE
    ImplicitIndicesFinder.prototype.updateLevelEllipsoidDynamicOct = function(level, planes) {
        var centerTilePositionOnLevel = this._centerTilePositions[level];
        // Camera center position in grid
        var cx = centerTilePositionOnLevel.x;
        var cy = centerTilePositionOnLevel.y;
        var cz = centerTilePositionOnLevel.z;
        // The index center cell
        var icx = Math.floor(cx);
        var icy = Math.floor(cy);
        var icz = Math.floor(cz);
        // Rel pos in center cell, i.e. the fractionl part
        var rx = cx - icx;
        var ry = cy - icy;
        var rz = cz - icz;

        var lodDistanceToTileRatio = this._lodDistanceToTileRatio;
        var axesExtentsX = lodDistanceToTileRatio.x;
        var axesExtentsY = lodDistanceToTileRatio.y;
        var axesExtentsZ = lodDistanceToTileRatio.z;

        // this._levelEllipsoids[level] = [];
        // var levelEllipsoid = this._levelEllipsoids[level];
        this._levelEllipsoid = [];
        var levelEllipsoid = this._levelEllipsoid;

        var yToXExtentRatio = axesExtentsY / axesExtentsX;
        var zEnd = Math.ceil(rz + axesExtentsZ);
        var Mz = axesExtentsX * axesExtentsX;
        var Nz = Mz / (axesExtentsZ * axesExtentsZ);
        var x, y, z, zIdx, relZ, relY, yEnd, My, Ny, yExtentForEllipsoidSlice;

        // +z
        for (z = rz; z < zEnd; z++) {
            if (z !== rz) { z = Math.floor(z); }
            relZ = z - rz;
            x = Math.sqrt(Mz - Nz * relZ * relZ);
            zIdx = z + icz;
            levelEllipsoid.push(new Cartesian4(x + cx, cy, zIdx,-x + cx));
            yExtentForEllipsoidSlice = x*yToXExtentRatio;
            yEnd = Math.ceil(ry + yExtentForEllipsoidSlice);
            My = x * x;
            Ny = My / (yExtentForEllipsoidSlice * yExtentForEllipsoidSlice);
            for (y = 1; y < yEnd; y++) {
                relY  = y - ry;
                x = Math.sqrt(My - Ny * relY * relY);
                levelEllipsoid.push(new Cartesian4(x + cx, y + icy, zIdx, -x + cx));
            }

            yEnd = Math.floor(ry - yExtentForEllipsoidSlice);
            for (y = Math.ceil(ry-1); y > yEnd; y--) {
                relY = y - ry;
                x = Math.sqrt(My - Ny * relY * relY);
                levelEllipsoid.push(new Cartesian4(x + cx, y + icy - 1, zIdx, -x + cx));
                // The reason for minus 1 in y: you want to rasterize using the
                // grid line above the cell (which is towards the center of the sphere )
                // but this counts for the cell with index of -1 that raster line's grid index
            }
        }

        // -z
        zEnd = Math.floor(rz - axesExtentsZ);
        for (z = Math.ceil(rz-1); z > zEnd; z--) {
            relZ = z - rz;
            x = Math.sqrt(Mz - Nz * relZ * relZ);
            zIdx = z + icz - 1;
            levelEllipsoid.push(new Cartesian4(x + cx, cy, zIdx,-x + cx));
            yExtentForEllipsoidSlice = x*yToXExtentRatio;
            yEnd = Math.ceil(ry + yExtentForEllipsoidSlice);
            My = x * x;
            Ny = My / (yExtentForEllipsoidSlice * yExtentForEllipsoidSlice);
            for (y = 1; y < yEnd; y++) {
                relY  = y - ry;
                x = Math.sqrt(My - Ny * relY * relY);
                levelEllipsoid.push(new Cartesian4(x + cx, y + icy, zIdx, -x + cx));
            }

            yEnd = Math.floor(ry - yExtentForEllipsoidSlice);
            for (y = Math.ceil(ry-1); y > yEnd; y--) {
                relY = y - ry;
                x = Math.sqrt(My - Ny * relY * relY);
                levelEllipsoid.push(new Cartesian4(x + cx, y + icy - 1, zIdx, -x + cx));
            }
        }

        this.floorIndices();

        this.clipIndicesToTree(level);

        this.clipIndicesOutsidePlanes(planes);

        return levelEllipsoid;
    };

    /**
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.clipIndicesOutsidePlanes = function(planes) {
    };

    /**
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.floorIndices = function() {
        // Convert to indices by flooring
        var levelEllipsoid = this._levelEllipsoid;
        var length = levelEllipsoid.length;
        var indices;
        var i;
        if (this._tileset._isOct) {
            for (i = 0; i < length; i++) {
                indices = levelEllipsoid[i];
                indices.x = Math.floor(indices.x);
                indices.y = Math.floor(indices.y);
                indices.z = Math.floor(indices.z);
                indices.w = Math.floor(indices.w);
            }
        } else {
            for (i = 0; i < length; i++) {
                indices = levelEllipsoid[i];
                indices.x = Math.floor(indices.x);
                indices.y = Math.floor(indices.y);
                indices.z = Math.floor(indices.z);
            }
        }
    };

    /**
     * Updates the _lodDistances array with LOD sphere radii from the camera to
     * pull in tiles on different levels of the tree
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.clipIndicesToTree = function(level) {
        var levelEllipsoid = this._levelEllipsoid;
        var lastIndices = this._lastIndices[level];
        var length = levelEllipsoid.length;
        var indices, i;
        if (this._tileset._isOct) {
            for (i = 0; i < length; i++) {
                indices = levelEllipsoid[i];
                if (indices.x < 0) {
                    continue;
                } else if (indices.y < 0 || indices.y > lastIndices.y || indices.z < 0 || indices.z > lastIndices.z) {
                    indices.x = -indices.x;
                    continue;
                }
                indices.x = Math.min(indices.x, lastIndices.x);
                indices.w = Math.max(indices.w, 0);
            }
        } else {
            for (i = 0; i < length; i++) {
                indices = levelEllipsoid[i];
                if (indices.x < 0) {
                    continue;
                } else if (indices.y < 0 || indices.y > lastIndices.y) {
                    indices.x = -indices.x;
                    continue;
                }
                indices.x = Math.min(indices.x, lastIndices.x);
                indices.z = Math.max(indices.z, 0);
            }
        }
    };

    // TODO: post process the level ellipsoids to nullify (make the +x component negative) rows that are culled by planes
    // or modify rows where the planes cut into them.

    var scratchLocalCameraPosition = new Cartesian3();
    var scratchMinCornerToCameraPosition = new Cartesian3();
    var scratchTranspose = new Matrix3();
    var lastmin = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var lastminpos = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var lastmax = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var lastmaxpos = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
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

        var tilesetStartLevel = this._startLevel;
        // var invLocalTileDims = this._invLocalTileDims;
        var centerIndices = this._centerIndices;
        var centerTilePositions = this._centerTilePositions;
        var invTileDims = this._invTileDims;
        var lastIndices = this._lastIndices;
        var cameraPosition = frameState.camera.positionWC;
        var lodDistanceToTileRatio = this._lodDistanceToTileRatio;

        var i, invTileDimsOnLevel;
        var centerIndexOnLevel , centerTilePositionOnLevel, lodDistanceOnLevel;

        // Find the distance to the tileset's contentless root and use that that determine maximumTreversalDepth
        // NOTE: updateVisibility is called on root in traversal before this
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

            // TODO: not sure if need to the full thing or just the fractional part...
            // Cartesian3.subtract(centerTilePositionOnLevel.x, centerIndexOnLevel.x, centerTilePositionOnLevel.x);
            // Cartesian3.subtract(centerTilePositionOnLevel.y, centerIndexOnLevel.y, centerTilePositionOnLevel.y);
            // Cartesian3.subtract(centerTilePositionOnLevel.z, centerIndexOnLevel.z, centerTilePositionOnLevel.z);
        }

        var lastIndicesOnLevel, minIndicesOnLevel, maxIndicesOnLevel, maxTilePositionOnLevel, minTilePositionOnLevel;
        var minIndices = this._minIndices;
        var maxIndices = this._maxIndices;
        var minTilePositions = this._minTilePositions;
        var maxTilePositions = this._maxTilePositions;

        var maximumTreversalLevel = this._maximumTraversalLevel;
        for (i = tilesetStartLevel; i <= maximumTreversalLevel; i++) {
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
            Cartesian3.minimumByComponent(maxIndicesOnLevel, lastIndicesOnLevel, maxIndicesOnLevel);

            // minIndices, Positions
            minTilePositionOnLevel = minTilePositions[i];
            Cartesian3.subtract(centerTilePositionOnLevel, lodDistanceToTileRatio, minTilePositionOnLevel);

            minIndicesOnLevel = minIndices[i];
            minIndicesOnLevel.x = Math.floor(minTilePositionOnLevel.x);
            minIndicesOnLevel.y = Math.floor(minTilePositionOnLevel.y);
            minIndicesOnLevel.z = Math.floor(minTilePositionOnLevel.z);
            Cartesian3.maximumByComponent(minIndicesOnLevel, Cartesian3.ZERO, minIndicesOnLevel);

            // Actually, only have 1 levelEllipsoid to save memory, call this during travesal when you need to know about it.
            // this.updateLevelEllipsoid(i);
            // TODO: FIX the offset version and REMOVE this one.
            // this.updateLevelEllipsoidDynamicOct(i);

            // DEBUG PRINTS
            if (i === tilesetStartLevel) {
                // if (!Cartesian3.equals(lastcenter, centerIndexOnLevel)) {
                //     Cartesian3.clone(centerIndexOnLevel, lastcenter);
                //     console.log('centerIndexOnLevel: ' + centerIndexOnLevel);
                // }
                // if (!Cartesian3.equals(lastmin, minIndicesOnLevel)) {
                //     Cartesian3.clone(minIndicesOnLevel, lastmin);
                //     console.log('min indices: ' + minIndicesOnLevel);
                // }
                // if (!Cartesian3.equals(lastmax, maxIndicesOnLevel)) {
                //     Cartesian3.clone(maxIndicesOnLevel, lastmax);
                //     console.log('max indices: ' + maxIndicesOnLevel);
                // }
                // if (!Cartesian3.equals(lastcenterpos, centerTilePositionOnLevel)) {
                //     Cartesian3.clone(centerTilePositionOnLevel, lastcenterpos);
                //     console.log('centerTilePositionOnLevel: ' + centerTilePositionOnLevel);
                // }
                // if (!Cartesian3.equals(lastminpos, minTilePositionOnLevel)) {
                //     Cartesian3.clone(minTilePositionOnLevel, lastminpos);
                //     console.log('minTilePositionOnLevel: ' + minTilePositionOnLevel);
                // }
                // if (!Cartesian3.equals(lastmaxpos, maxTilePositionOnLevel)) {
                //     Cartesian3.clone(maxTilePositionOnLevel, lastmaxpos);
                //     console.log('maxTilePositionOnLevel: ' + maxTilePositionOnLevel);
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
