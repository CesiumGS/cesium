/*global define*/
define(function() {
    "use strict";

    var Command = function() {
        this.boundingVolume = undefined;
        this.modelMatrix = undefined;
        this.primitiveType = undefined;
        this.vertexArray = undefined;
        this.count = undefined;
        this.offset = undefined;
        this.shaderProgram = undefined;
        this.uniformMap = undefined;
        this.renderState = undefined;
        this.framebuffer = undefined;
    };

    return Command;
});