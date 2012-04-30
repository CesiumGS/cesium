/*global define*/
define(function() {
    "use strict";

    function DynamicBillboard(image, color, horizontalOrigin, verticalOrigin, eyeOffset, pixelOffset, rotation, scale, show) {
        this.color = color;
        this.eyeOffset = eyeOffset;
        this.horizontalOrigin = horizontalOrigin;
        this.image = image;
        this.pixelOffset = pixelOffset;
        this.rotation = rotation;
        this.scale = scale;
        this.show = show;
        this.verticalOrigin = verticalOrigin;
    }

    return DynamicBillboard;
});