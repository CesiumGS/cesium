/*global defineSuite */
defineSuite([
         'Core/buildModuleUrl',
         'Core/loadText',
         'ThirdParty/Uri'
     ], function(
         buildModuleUrl,
         loadText,
         Uri) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('produces an absolute URL for a module', function() {
        var url = buildModuleUrl('Core/buildModuleUrl.js');

        expect(url).toMatch(/Core\/buildModuleUrl.js$/);
        expect(new Uri(url).isAbsolute()).toBe(true);

        // make sure it actually exists at that URL
        var loaded = false;
        loadText(url).then(function() {
            loaded = true;
        });

        waitsFor(function() {
            return loaded;
        });
    });
});