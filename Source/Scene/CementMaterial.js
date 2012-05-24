/*global define*/
define([
        '../Shaders/CementMaterial'
   ], function (
       ShadersCementMaterial) {
   "use strict";

   /**
    *
    * DOC_TBA
    *
    * @name CementMaterial
    * @constructor
    */
   function CementMaterial(template) {
       var t = template || {};

       /**
        * DOC_TBA
        */
       this.cementColor = t.cementColor || {
           red : 0.95,
           green : 0.95,
           blue : 0.85,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.grainScale = t.grainScale || 80.0;

       /**
        * DOC_TBA
        */
       this.roughness = t.roughness || 1.0;

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
