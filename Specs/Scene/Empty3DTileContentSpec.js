/*global defineSuite*/
defineSuite([
        'Scene/Empty3DTileContent'
    ], function(
        Empty3DTileContent) {
    'use strict';

    it('destroys', function() {
        var content = new Empty3DTileContent();
        expect(content.isDestroyed()).toEqual(false);
        content.destroy();
        expect(content.isDestroyed()).toEqual(true);
    });
});
