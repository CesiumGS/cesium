/*global define*/
define([
        '../Shaders/AsphaltMaterial'
   ], function (
       ShadersAsphaltMaterial) {
   "use strict";

   /**
    *
    * Asphalt material
    *
    * @name AspahltMaterial
    * @constructor
    */
   function AsphaltMaterial(template) {
       var t = template || {};

       /**
        * Asphalt color
        */
       this.asphaltColor = t.asphaltColor || {
           red : 0.15,
           green : 0.15,
           blue : 0.15,
           alpha : 1.0
       };

       /**
        * Controls the size of the bumps (values between 0.0 and 0.05 recommended)
        *
        * @type {Number}
        */
       this.bumpSize = t.bumpSize || 0.02;

       /**
        * Controls how rough the surface looks (values between 0.0 and 1.0 recommended)
        *
        * @type {Number}
        */
       this.roughness = t.roughness || 0.2;

       var that = this;
       this._uniforms = {
           u_asphaltColor : function() {
               return that.asphaltColor;
           },
           u_bumpSize : function() {
               return that.bumpSize;
           },
           u_roughness : function() {
               return that.roughness;
           }
       };
    }

    AsphaltMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersAsphaltMaterial;
    };

    return AsphaltMaterial;
});
