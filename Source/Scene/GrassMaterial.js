/*global define*/
define([
        '../Shaders/GrassMaterial'
   ], function (
       ShadersGrassMaterial) {
   "use strict";

   /**
    *
    * Grass material
    *
    * @name GrassMaterial
    * @constructor
    */
   function GrassMaterial(template) {
       var t = template || {};

       /**
        * Grass color
        */
       this.grassColor = t.grassColor || {
           red : 0.25,
           green : 0.4,
           blue : 0.1,
           alpha : 1.0
       };

       /**
        * Dirt color (only has minor impact on the overall material color)
        */
       this.dirtColor = t.dirtColor || {
           red : 0.1,
           green : 0.1,
           blue : 0.1,
           alpha : 1.0
       };

       /**
        * Controls the size of the color patches in the grass (values between 0 and 5 recommended)
        *
        * @type {Number}
        */
       this.patchiness = t.patchiness || 1.5;

       var that = this;
       this._uniforms = {
           u_grassColor : function() {
               return that.grassColor;
           },
           u_dirtColor : function() {
               return that.dirtColor;
           },
           u_patchiness : function() {
               return that.patchiness;
           },
       };
    }

    GrassMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersGrassMaterial;
    };

    return GrassMaterial;
});
