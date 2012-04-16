(function() {
    "use strict";
    /*global Cesium, describe, it, expect, waitsFor, runs*/

    describe("JobSpec", function () {

        it("downloads an image", function () {
            var image;

            Cesium.Chain.run(Cesium.Jobs.downloadImage("./Data/Images/Green.png")).thenRun(function() {
               image = this.images["./Data/Images/Green.png"];
            });

            waitsFor(function() {
                return image;
            }, "downloads an image.", 3000);

            runs(function() {
                expect(image.width).toEqual(1);
                expect(image.height).toEqual(1);
            });
        });
    });
}());