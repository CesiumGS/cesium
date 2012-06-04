/*global define*/
define([
        '../../Shaders/Noise',
        '../../Shaders/Materials/WoodMaterial'
    ], function (
        ShadersNoise,
        ShadersWoodMaterial) {
    "use strict";

   /**
    *
    * Procedural wood texture generated with simplex noise.
    * Creates rings of dark color around a few different points in the wood.
    *
    * @name WoodMaterial
    * @constructor
    */
   function WoodMaterial(template) {
       var t = template || {};

       /**
        * The wood's base color.
        * Light brown recommended.
        */
       this.lightWoodColor = t.lightWoodColor || {
           red : 0.6,
           green : 0.3,
           blue : 0.1,
           alpha : 1.0
       };

       /**
        * The wood's ring color.
        * Dark brown recommended.
        */
       this.darkWoodColor = t.darkWoodColor || {
           red : 0.4,
           green : 0.2,
           blue : 0.07,
           alpha : 1.0
       };

       /**
        * Controls the frequency of rings in the wood.
        *
        * @type {Number}
        */
       this.ringFrequency = t.ringFrequency || 4.0;

       /**
        * Controls how noisy the ring pattern is in two directions.
        * For example, if x and y are the same, the rings have a circular shape.
        * If x and y are different, the rings are more amorphous.
        *
        * @type {Number}
        */
       this.noiseScale = t.noiseScale || {
           x : 0.7,
           y : 0.5,
       };

       /**
        * Controls how grainy the wood is. Grains are represented by
        * thin vertical slits of varying darkness.
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
           u_grainFrequency : function() {
               return that.grainFrequency;
           }
       };
    }

   WoodMaterial.prototype._getShaderSource = function() {
       return "#line 0\n" +
              ShadersNoise +
              "#line 0\n" +
              ShadersWoodMaterial;
   };

    return WoodMaterial;
});
