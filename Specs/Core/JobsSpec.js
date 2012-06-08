/*global defineSuite*/
defineSuite([
         'Core/Jobs',
         'ThirdParty/Chain'
     ], function(
         Jobs,
         Chain) {
    "use strict";
    /*global it,expect,waitsFor,runs*/

    it('downloads an image', function() {
        var image;

        Chain.run(Jobs.downloadImage('./Data/Images/Green.png')).thenRun(function() {
            image = this.images['./Data/Images/Green.png'];
        });

        waitsFor(function() {
            return image;
        }, 'downloads an image.', 3000);

        runs(function() {
            expect(image.width).toEqual(1);
            expect(image.height).toEqual(1);
        });
    });
});