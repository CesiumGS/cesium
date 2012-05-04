/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math'
    ], function(
        DeveloperError,
        CesiumMath) {
    "use strict";

    /**
     * Contains information about a WMS layer.
     *
     * @name WebMapServiceLayer
     * @constructor
     *
     * @param {String} description.name The name of the WMS layer.
     * @param {String} description.title The title of the WMS layer.
     * @param {Object[]} description.projections The projections that are available for this WMS layer.
     * @param {Object} description.extent The extent of the WMS layer.
     * @param {String[]} description.styles The styles that are available for this WMS layer.
     *
     * @exception {DeveloperError} <code>description.name</code> is required.
     * @exception {DeveloperError} <code>description.title</code> is required.
     *
     * @see WebMapServiceCapabilities
     *
     * @see <a href="http://www.opengeospatial.org/standards/wms">WMS Specification</a>
     *
     * @example
     * var layer = new WebMapServiceLayer({
     *              name: "wms_map_layer",
     *              title: "Map Layer",
     *              projections: [Projections.WGS84],
     *              extent: {
     *                  north:  CesiumMath.PI_OVER_TWO,
     *                  south: -CesiumMath.PI_OVER_TWO,
     *                  east:   CesiumMath.PI,
     *                  west:  -CesiumMath.PI
     *              },
     *              styles: ["default"]
     *            });
     */
    function WebMapServiceLayer(description) {
        var desc = description || {};

        if (!desc.name) {
            throw new DeveloperError("description.name is required.", "description.name");
        }

        if (!desc.title) {
            throw new DeveloperError("description.title is required.", "description.title");
        }

        /**
         * The name of the WMS layer.
         * @type {String}
         */
        this.name = desc.name;

        /**
         * The title of the WMS layer.
         * @type {String}
         */
        this.title = desc.title;

        /**
         * The projections that are available for this WMS layer.
         * @type {Object[]}
         */
        this.projections = typeof desc.projections === 'undefined' ? [] : desc.projections.slice();

        /**
         * The extent of the WMS layer.
         * @type {Object}
         */
        if( desc.extent ) {
            this.extent = {
                    north: desc.extent.north,
                    south: desc.extent.south,
                    east:  desc.extent.east,
                    west:  desc.extent.west
            };
        }
        else {
            this.extent = {
                    north:  CesiumMath.PI_OVER_TWO,
                    south: -CesiumMath.PI_OVER_TWO,
                    east:   CesiumMath.PI,
                    west:  -CesiumMath.PI
            };
        }

        /**
         * The styles that are available for this WMS layer.
         * @type {String[]}
         */
        this.styles = typeof desc.styles === 'undefined' ? [] : desc.styles.slice();

        /**
         * The child layers of this WMS layer.
         * @type {Object[]}
         */
        this.children = [];
    }

    WebMapServiceLayer.prototype.findLayer = function(layerName) {
        if( this.name === layerName ) {
            return this;
        }

        var result;
        for(var i=0;i<this.children.length;++i) {
            result = this.children[i].findLayer(layerName);
            if( result ) {
                break;
            }
        }

        return result;
    };

    WebMapServiceLayer.prototype.findStyle = function(styleName) {
        var i = this.styles.indexOf(styleName);

        return (i===-1) ? null : this.styles[i];
    };


    return WebMapServiceLayer;
});