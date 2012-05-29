/*global defineSuite*/
defineSuite([
         'Scene/BlobMaterial',
         '../Specs/renderMaterial'
     ], function(
         BlobMaterial,
         renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a procedural blob material using cellular noise", function() {
        var pixel = renderMaterial(new BlobMaterial({
            repeat : 10.0
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
