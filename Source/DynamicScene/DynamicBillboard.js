/*global define*/
define(function() {
    "use strict";

    function DynamicBillboard() {
        this.image = undefined;
        this.scale = undefined;
        this.horizontalOrigin = undefined;
        this.verticalOrigin = undefined;
        this.color = undefined;
        this.eyeOffset = undefined;
        this.pixelOffset = undefined;
        this.show = undefined;
    }

    return DynamicBillboard;
});