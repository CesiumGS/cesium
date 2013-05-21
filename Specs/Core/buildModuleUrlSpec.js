/*global defineSuite */
defineSuite([
         'Core/buildModuleUrl',
         'ThirdParty/Uri'
     ], function(
         buildModuleUrl,
         Uri) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('produces an absolute URL for a module', function() {
        var url = buildModuleUrl('Core/buildModuleUrl.js');

        expect(url).toMatch(/Core\/buildModuleUrl.js$/);
        expect(new Uri(url).isAbsolute()).toBe(true);
    });
});