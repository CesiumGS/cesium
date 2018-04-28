define([
        './defined',
        './isBitSet'
    ], function(
        defined,
        isBitSet) {
    'use strict';

    // Bitmask for checking tile properties
    var childrenBitmasks = [0x01, 0x02, 0x04, 0x08];
    var anyChildBitmask = 0x0F;
    var cacheFlagBitmask = 0x10; // True if there is a child subtree
    var imageBitmask = 0x40;
    var terrainBitmask = 0x80;

    /**
     * Contains information about each tile from a Google Earth Enterprise server
     *
     * @param {Number} bits Bitmask that contains the type of data and available children for each tile.
     * @param {Number} cnodeVersion Version of the request for subtree metadata.
     * @param {Number} imageryVersion Version of the request for imagery tile.
     * @param {Number} terrainVersion Version of the request for terrain tile.
     * @param {Number} imageryProvider Id of imagery provider.
     * @param {Number} terrainProvider Id of terrain provider.
     *
     * @private
     */
    function GoogleEarthEnterpriseTileInformation(bits, cnodeVersion, imageryVersion, terrainVersion, imageryProvider, terrainProvider) {
        this._bits = bits;
        this.cnodeVersion = cnodeVersion;
        this.imageryVersion = imageryVersion;
        this.terrainVersion = terrainVersion;
        this.imageryProvider = imageryProvider;
        this.terrainProvider = terrainProvider;
        this.ancestorHasTerrain = false; // Set it later once we find its parent
        this.terrainState = undefined;
    }

    /**
     * Creates GoogleEarthEnterpriseTileInformation from an object
     *
     * @param {Object} info Object to be cloned
     * @param {GoogleEarthEnterpriseTileInformation} [result] The object onto which to store the result.
     * @returns {GoogleEarthEnterpriseTileInformation} The modified result parameter or a new GoogleEarthEnterpriseTileInformation instance if none was provided.
     */
    GoogleEarthEnterpriseTileInformation.clone = function(info, result) {
        if (!defined(result)) {
            result = new GoogleEarthEnterpriseTileInformation(info._bits, info.cnodeVersion, info.imageryVersion, info.terrainVersion,
                info.imageryProvider, info.terrainProvider);
        } else {
            result._bits = info._bits;
            result.cnodeVersion = info.cnodeVersion;
            result.imageryVersion = info.imageryVersion;
            result.terrainVersion = info.terrainVersion;
            result.imageryProvider = info.imageryProvider;
            result.terrainProvider = info.terrainProvider;
        }
        result.ancestorHasTerrain = info.ancestorHasTerrain;
        result.terrainState = info.terrainState;

        return result;
    };

    /**
     * Sets the parent for the tile
     *
     * @param {GoogleEarthEnterpriseTileInformation} parent Parent tile
     */
    GoogleEarthEnterpriseTileInformation.prototype.setParent = function(parent) {
        this.ancestorHasTerrain = parent.ancestorHasTerrain || this.hasTerrain();
    };

    /**
     * Gets whether a subtree is available
     *
     * @returns {Boolean} true if subtree is available, false otherwise.
     */
    GoogleEarthEnterpriseTileInformation.prototype.hasSubtree = function() {
        return isBitSet(this._bits, cacheFlagBitmask);
    };

    /**
     * Gets whether imagery is available
     *
     * @returns {Boolean} true if imagery is available, false otherwise.
     */
    GoogleEarthEnterpriseTileInformation.prototype.hasImagery = function() {
        return isBitSet(this._bits, imageBitmask);
    };

    /**
     * Gets whether terrain is available
     *
     * @returns {Boolean} true if terrain is available, false otherwise.
     */
    GoogleEarthEnterpriseTileInformation.prototype.hasTerrain = function() {
        return isBitSet(this._bits, terrainBitmask);
    };

    /**
     * Gets whether any children are present
     *
     * @returns {Boolean} true if any children are available, false otherwise.
     */
    GoogleEarthEnterpriseTileInformation.prototype.hasChildren = function() {
        return isBitSet(this._bits, anyChildBitmask);
    };

    /**
     * Gets whether a specified child is available
     *
     * @param {Number} index Index of child tile
     *
     * @returns {Boolean} true if child is available, false otherwise
     */
    GoogleEarthEnterpriseTileInformation.prototype.hasChild = function(index) {
        return isBitSet(this._bits, childrenBitmasks[index]);
    };

    /**
     * Gets bitmask containing children
     *
     * @returns {Number} Children bitmask
     */
    GoogleEarthEnterpriseTileInformation.prototype.getChildBitmask = function() {
        return this._bits & anyChildBitmask;
    };

    return GoogleEarthEnterpriseTileInformation;
});
