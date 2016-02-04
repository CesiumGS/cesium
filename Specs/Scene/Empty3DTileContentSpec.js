/*global defineSuite*/
defineSuite([
        'Scene/Empty3DTileContent',
        'Scene/Cesium3DTileContentState'
    ], function(
        Empty3DTileContent,
        Cesium3DTileContentState) {
    "use strict";

    it('resolves readyPromise', function() {
        var content = new Empty3DTileContent();
        content.request();
        content.update();
        return content.readyPromise.then(function(content) {
            expect(content.state).toEqual(Cesium3DTileContentState.READY);
        });
    });

    it('destroys', function() {
        var content = new Empty3DTileContent();
        expect(content.isDestroyed()).toEqual(false);
        content.destroy();
        expect(content.isDestroyed()).toEqual(true);
    });
});
