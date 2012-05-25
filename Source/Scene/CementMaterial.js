/*global define*/
define([
        '../Shaders/CementMaterial'
   ], function (
       ShadersCementMaterial) {
   "use strict";

   /**
    *
    * Cement material
    *
    * @name CementMaterial
    * @constructor
    */
   function CementMaterial(template) {
       var t = template || {};

       /**
        * Cement color
        */
       this.cementColor = t.cementColor || {
           red : 0.95,
           green : 0.95,
           blue : 0.85,
           alpha : 1.0
       };

       /**
        * Controls the size of the rock grains in the cement (values between 0.0 and 0.05 recommended)
        *
        * @type {Number}
        */
       this.grainScale = t.grainScale || 0.01;

       /**
        * Controls how rough the surface looks (values between 0.0 and 1.0 recommended)
        *
        * @type {Number}
        */
       this.roughness = t.roughness || 0.3;

       var that = this;
       this._uniforms = {
           u_cementColor : function() {
               return that.cementColor;
           },
           u_grainScale : function() {
               return that.grainScale;
           },
           u_roughness : function() {
               return that.roughness;
           }
       };
    }

    CementMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersCementMaterial;
    };

    return CementMaterial;
});
