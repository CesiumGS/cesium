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
           red : 0.2,
           green : 0.2,
           blue : 0.2,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.bumpSize = t.bumpSize || 0.01;

       var that = this;
       this._uniforms = {
           u_asphaltColor : function() {
               return that.asphaltColor;
           },
           u_bumpSize : function() {
               return that.bumpSize;
           }
       };
    }

    AsphaltMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersAsphaltMaterial;
    };

    return AsphaltMaterial;
});
