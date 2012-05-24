/*global define*/
define([
        '../Shaders/WoodMaterial'
   ], function (
       ShadersWoodMaterial) {
   "use strict";

   /**
    *
    * DOC_TBA
    *
    * @name WoodMaterial
    * @constructor
    */
   function WoodMaterial(template) {
       var t = template || {};

       /**
        * DOC_TBA
        */
       this.lightWoodColor = t.lightWoodColor || {
           red : 0.6,
           green : 0.3,
           blue : 0.1,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.darkWoodColor = t.darkWoodColor || {
           red : 0.4,
           green : 0.2,
           blue : 0.07,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.ringFrequency = t.ringFrequency || 4.0;

       /**
        * DOC_TBA
        */
       this.noiseScale = t.noiseScale || {
           x : 0.5,
           y : 0.1,
       };

       /**
        * DOC_TBA
        */
       this.noisiness = t.noisiness || 3.0;

       /**
        * DOC_TBA
        */
       this.grainScale = t.grainScale || 27.0;

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
           u_grainScale : function() {
               return that.grainScale;
           }
       };
    }

    WoodMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersWoodMaterial;
    };

    return WoodMaterial;
});
