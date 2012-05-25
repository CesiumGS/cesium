/*global define*/
define([
        '../Shaders/GrassMaterial'
   ], function (
       ShadersGrassMaterial) {
   "use strict";

   /**
    *
    * DOC_TBA
    *
    * @name GrassMaterial
    * @constructor
    */
   function GrassMaterial(template) {
       var t = template || {};

       /**
        * DOC_TBA
        */
       this.grassColor = t.grassColor || {
           red : 0.25,
           green : 0.4,
           blue : 0.1,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.dirtColor = t.dirtColor || {
           red : 0.1,
           green : 0.1,
           blue : 0.1,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.grassLength = t.grassLength || 3.0;

       var that = this;
       this._uniforms = {
           u_grassColor : function() {
               return that.grassColor;
           },
           u_dirtColor : function() {
               return that.dirtColor;
           },
           u_grassLength : function() {
               return that.grassLength;
           },
       };
    }

    GrassMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersGrassMaterial;
    };

    return GrassMaterial;
});
