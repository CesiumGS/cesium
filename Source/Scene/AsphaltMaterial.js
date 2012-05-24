/*global define*/
define([
        '../Shaders/AsphaltMaterial'
   ], function (
       ShadersAsphaltMaterial) {
   "use strict";

   /**
    *
    * DOC_TBA
    *
    * @name AspahltMaterial
    * @constructor
    */
   function AsphaltMaterial(template) {
       var t = template || {};

       /**
        * DOC_TBA
        */
       this.asphaltColor = t.asphaltColor || {
           red : 0.15,
           green : 0.15,
           blue : 0.15,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.bumpSize = t.bumpSize || 50.0;

       /**
        * DOC_TBA
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
