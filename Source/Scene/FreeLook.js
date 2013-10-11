/**
 * A simple utility object
 * TBD
 *
 * @author segabor
 *
 */
define(['../Core/defineProperties'
    ], function(defineProperties) {
    "use strict";


    /**
     * @constructor
     */
    var FreeLook = function(){
    };



    /**
     * Define properties
     */
    defineProperties(FreeLook.prototype, {
        /**
         * Horizontal angle (in degrees)
         */
        'hangle': {
            value: 0,
            writable: true
        },
        /**
         * Vertical angle (in degrees)
         */
        'vangle': {
            value: 0,
            writable: true
        },
        /**
         * Horizontal stepping value
         */
        'hstep': {
            value: 5,
            writable: true
        },
        /**
         * Vertical stepping value
         */
        'vstep': {
            value: 5,
            writable: true
        }
    });


    /**
     * Define functions
     */
    FreeLook.prototype.lookLeft = function() {
        this.hangle -= this.hstep;
        if (this.hangle < -90) {
            this.hangle = -90;
        }
    };
    FreeLook.prototype.lookRight = function() {
        this.hangle += this.hstep;
        if (this.hangle > 90) {
            this.hangle = 90;
        }
    };
    FreeLook.prototype.lookUp = function() {
        this.vangle += this.vstep;
        if (this.vangle > 90) {
            this.vangle = 90;
        }
    };
    FreeLook.prototype.lookDown = function() {
        this.vangle -= this.vstep;
        if (this.vangle < -90) {
            this.vangle = -90;
        }
    };
    FreeLook.prototype.reset = function() {
        this.hangle = this.vangle = 0;
    };

    return FreeLook;
});
