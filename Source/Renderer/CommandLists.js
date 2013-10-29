/*global define*/
define(function() {
    "use strict";

    /**
     * Represents lists of commands for drawing for each render pass.
     *
     * @alias CommandLists
     * @constructor
     */
    var CommandLists = function() {
        /**
         * The command list for a opaque color pass.
         * @type {Array}
         * @default []
         */
        this.opaqueList = [];

        /**
         * The command list for a translucent color pass.
         * @type {Array}
         * @default []
         */
        this.translucentList = [];

        /**
         * The command lists for a pick pass.
         * @type {Object}
         */
        this.pickList = {
            opaqueList : [],
            translucentList : []
        };

        /**
         * The command list for an overlay pass.
         * @type {Array}
         * @default []
         */
        this.overlayList = [];
    };

    CommandLists.prototype.empty = function() {
        return this.opaqueList.length === 0 &&
               this.translucentList.length === 0 &&
               this.pickList.opaqueList.length === 0 &&
               this.pickList.translucentList.length === 0 &&
               this.overlayList.length === 0;
    };

    CommandLists.prototype.removeAll = function() {
        this.opaqueList.length = 0;
        this.translucentList.length = 0;
        this.pickList.opaqueList.length = 0;
        this.pickList.translucentList.length = 0;
        this.overlayList.length = 0;
    };

    return CommandLists;
});
