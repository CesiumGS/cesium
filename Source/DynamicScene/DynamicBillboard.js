/*global define*/
define(function() {
    "use strict";

    function DynamicBillboard(color, eyeOffset, horizontalOrigin, image, pixelOffset, rotation, scale, show, verticalOrigin) {
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

    DynamicBillboard.prototype.show = undefined;

    DynamicBillboard.prototype.color = undefined;

    DynamicBillboard.prototype.eyeOffset = undefined;

    DynamicBillboard.prototype.horizontalOrigin = undefined;

    DynamicBillboard.prototype.image = undefined;

    DynamicBillboard.prototype.pixelOffset = undefined;

    DynamicBillboard.prototype.rotation = undefined;

    DynamicBillboard.prototype.scale = undefined;

    DynamicBillboard.prototype.verticalOrigin = undefined;

    return DynamicBillboard;
});