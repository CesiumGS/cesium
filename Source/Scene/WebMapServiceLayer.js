/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math'
    ], function(
        DeveloperError,
        CesiumMath) {
    "use strict";
    /*global Image*/

    /**
     * Uses the WMS API to get the capabilities of the WMS server
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
        var i;

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
        this.projections = [];
        if( desc.projections ) {
            for(i=0;i<desc.projections.length;++i) {
                this.projections.push(desc.projections[i]);
            }
        }

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
        this.styles = [];
        if( desc.styles ) {
            for(i=0;i<desc.styles.length;++i) {
                this.styles.push(desc.styles[i]);
            }
        }

        /**
         * The child layers of this WMS layer.
         * @type {Object[]}
         */
        this.children = [];
    }

    return WebMapServiceLayer;
});