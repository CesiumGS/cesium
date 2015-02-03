/*global define*/
define([
        'Core/RuntimeError'
    ], function(
        RuntimeError) {
    "use strict";

    var BadGeometry = function() {
        this._workerName = '../../Specs/TestWorkers/createBadGeometry';
    };

    BadGeometry.createGeometry = function() {
        //This function is only called when synchronous, see Specs/TestWorks/createBadGeometry for asynchronous.
        throw new RuntimeError('BadGeometry.createGeometry');
    };

    BadGeometry.packedLength = 0;

    BadGeometry.pack = function() {

    };

    BadGeometry.unpack = function() {
        return new BadGeometry();
    };

    return BadGeometry;
});