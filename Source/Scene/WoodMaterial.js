/*global define*/
define([
        '../Shaders/WoodMaterial'
   ], function (
       ShadersWoodMaterial) {
   "use strict";

   /**
    *
    * Wood material
    *
    * @name WoodMaterial
    * @constructor
    */
   function WoodMaterial(template) {
       var t = template || {};

       /**
        * Light wood color
        */
       this.lightWoodColor = t.lightWoodColor || {
           red : 0.6,
           green : 0.3,
           blue : 0.1,
           alpha : 1.0
       };

       /**
        * Dark wood color
        */
       this.darkWoodColor = t.darkWoodColor || {
           red : 0.4,
           green : 0.2,
           blue : 0.07,
           alpha : 1.0
       };

       /**
        * Controls the number of rings in the wood
        *
        * @type {Number}
        */
       this.ringFrequency = t.ringFrequency || 4.0;

       /**
        * Controls how noisy the wood pattern is in both directions
        *
        * @type {Number}
        */
       this.noiseScale = t.noiseScale || {
           x : 0.5,
           y : 0.1,
       };

       /**
        * Scales the noisiness determined by noiseScale
        *
        * @type {Number}
        */
       this.noisiness = t.noisiness || 3.0;

       /**
        * Controls how grainy the wood is (values between 10 and 50 recommended)
        *
        * @type {Number}
        */
       this.grainFrequency = t.grainFrequency || 27.0;

       var that = this;
       this._uniforms = {
           u_lightWoodColor : function() {
               return that.lightWoodColor;
           },
           u_darkWoodColor : function() {
               return that.darkWoodColor;
           },
           u_ringFrequency : function() {
               return that.ringFrequency;
           },
           u_grainThreshold : function() {
               return that.grainThreshold;
           },
           u_noiseScale : function() {
               return that.noiseScale;
           },
           u_noisiness : function() {
               return that.noisiness;
           },
           u_grainFrequency : function() {
               return that.grainFrequency;
           }
       };
    }

    WoodMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersWoodMaterial;
    };

    return WoodMaterial;
});
