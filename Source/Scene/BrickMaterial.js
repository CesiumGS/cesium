/*global define*/
define([
        '../Shaders/BrickMaterial'
   ], function (
       ShadersBrickMaterial) {
   "use strict";

   /**
    *
    * DOC_TBA
    *
    * @name BrickMaterial
    * @constructor
    */
   function BrickMaterial(template) {
       var t = template || {};

       /**
        * DOC_TBA
        */
       this.brickColor = t.brickColor || {
           red : 0.7,
           green : 0.2,
           blue : 0.0,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.mortarColor = t.mortarColor || {
           red : 0.8,
           green : 0.8,
           blue : 0.7,
           alpha : 1.0
       };

       /**
        * DOC_TBA
        */
       this.brickSize = t.brickSize || {
           x : 0.30,
           y : 0.15
       };

       /**
        * DOC_TBA
        */
       this.brickPct = t.brickPct || {
           x : 0.90,
           y : 0.85
       };

       var that = this;
       this._uniforms = {
           u_brickColor : function() {
               return that.brickColor;
           },
           u_mortarColor : function() {
               return that.mortarColor;
           },
           u_brickSize : function() {
               return that.brickSize;
           },
           u_brickPct : function() {
               return that.brickPct;
           }
       };
    }

    BrickMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersBrickMaterial;
    };

    return BrickMaterial;
});
