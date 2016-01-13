/*jshint node:true*/
"use strict";

var path = require('path');
var requirejs = require('requirejs');

requirejs.config({
                     paths : {
                         'Cesium' : path.join(__dirname, 'Source')
                     },
                     nodeRequire : require
                 });

module.exports = requirejs('Cesium/Cesium');
