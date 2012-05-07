/*global define*/
define(function() {
    "use strict";

    function DynamicLabel() {
        this.text = undefined;
        this.font = undefined;
        this.style = undefined;
        this.fillColor = undefined;
        this.outlineColor = undefined;
        this.horizontalOrigin = undefined;
        this.verticalOrigin = undefined;
        this.eyeOffset = undefined;
        this.pixelOffset = undefined;
        this.scale = undefined;
        this.show = undefined;
    }

    return DynamicLabel;
});