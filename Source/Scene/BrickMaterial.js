/*global define*/
define([
        '../Shaders/BrickMaterial'
   ], function (
       ShadersBrickMaterial) {
   "use strict";

   /**
    *
    * Material for a brick wall. Gives control over brick and mortar properties.
    *
    * @name BrickMaterial
    * @constructor
    */
   function BrickMaterial(template) {
       var t = template || {};

       /**
        * Brick color
        */
       this.brickColor = t.brickColor || {
           red : 0.7,
           green : 0.2,
           blue : 0.0,
           alpha : 1.0
       };

       /**
        * Mortar color
        */
       this.mortarColor = t.mortarColor || {
           red : 0.8,
           green : 0.8,
           blue : 0.7,
           alpha : 1.0
       };

       /**
        * Controls the size of the bricks (mortar will get scaled as well)
        */
       this.brickSize = t.brickSize || {
           x : 0.30,
           y : 0.15
       };

       /**
        * Ratio between brick and mortar (values between 0.0 and 1.0)
        */
       this.brickPct = t.brickPct || {
           x : 0.90,
           y : 0.85
       };

       /**
        * Controls brick roughness (values between 0.01 and 0.10 recommended)
        *
        * @type {Number}
        */
       this.brickRoughness = t.brickRoughness || 0.04;

       /**
        * Controls mortar roughness (values between 0.0 and 0.5 recommended)
        *
        * @type {Number}
        */
       this.mortarRoughness = t.mortarRoughness || 0.1;

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
           },
           u_brickRoughness : function() {
               return that.brickRoughness;
           },
           u_mortarRoughness : function() {
               return that.mortarRoughness;
           }
       };
    }

    BrickMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersBrickMaterial;
    };

    return BrickMaterial;
});
