define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math'
    ], function(
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        CesiumMath) {
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
        this._maximumTraversalLevel = 0;
        this._lodDistances = []; // set of spheres per level centered around the camera
        this._lodFactor = -1;

        // How the camera relates to the grids on every level
        this._seams = []; // xyz Seams per level
        this._radii = []; // sphere cut radii in meters, the circle that forms on the surface of nearest face slab, clamp to max if camera inside slab
        this._cellRadii = []; // Radii / cell dim on a level. cartesian3
        this._centers = []; // Where the cam pos lives on the level, cartesian3

        // Dim info
        this._worstCaseVirtualDims = new Cartesian3(); // Should be the same for every level
        this._treeDimsPerLevel = [];
        this._virtualDimsPerLevel = [];

        this._is2DMap = false; // boundingVolume instanceof region

        // TODO: move things like _startLevel from tileset into here?

        // Probably not needed
        this._rootDistance = 0;
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
        // var startingGError = tileset._geometricErrorContentRoot;
        var startingGError = tileset._geometricError;
        var base = tileset.getGeomtricErrorBase();
        var tilesetStartLevel = tileset._startLevel;
        // var useChildSphere = tileset._allTilesAdditive ? 0 : 1; // ad to pow exponent
        var i, lodDistance, gErrorOnLevel;
        for (i = tilesetStartLevel; i < length; i++) {
            gErrorOnLevel = startingGError / Math.pow(base, i - tilesetStartLevel);
            lodDistance = gErrorOnLevel * factor;
            lodDistances[i] = lodDistance;
        }

        for (i = 0; i < length; i++) {
            console.log('lodDistance ' + i + ' ' + lodDistances[i]);
        }

        // TODO: if lodFactor changed you must also update the other infomation about the levels
    };

    /**
     * Inits the _lodDistances array so that it's the proper size
     *
     * @private
     */
    ImplicitIndicesFinder.prototype.initLODDistances = function() {
        // TODO: when to update this based on camera, context, and  max gerror changes?
        var lodDistances = this._lodDistances;
        var tileset = this._tileset;
        var tilingScheme = tileset._tilingScheme;
        // +2 to get the the contentless tileset root as well as all the content levels (the other +1), though may not need
        // 0 being the contentless tileset root, 1 being the root nodes
        // var length = tilingScheme.lastLevel - this._startLevel + 2;
        var length = tilingScheme.lastLevel + 1;
        var i;
        for (i = 0; i < length; i++) {
            lodDistances.push(-1);
            // TODO: init sizes of other arrays
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
