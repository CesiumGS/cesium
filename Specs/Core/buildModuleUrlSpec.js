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
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('produces an absolute URL for a module', function() {
        var url = buildModuleUrl('Workers/sanitizeHtml.js');

        expect(url).toMatch(/Workers\/sanitizeHtml.js$/);
        expect(new Uri(url).isAbsolute()).toBe(true);

        // make sure it actually exists at that URL
        return loadText(url);
    });

    it('matches the expected forms of URLs to Cesium.js', function() {
        var r = buildModuleUrl._cesiumScriptRegex;

        expect(r.exec('Cesium.js')[1]).toEqual('');
        expect(r.exec('assets/foo/Cesium-b16.js')[1]).toEqual('assets/foo/');
        expect(r.exec('assets/foo/Cesium.js')[1]).toEqual('assets/foo/');
        expect(r.exec('http://example.invalid/Cesium/assets/foo/Cesium.js')[1]).toEqual('http://example.invalid/Cesium/assets/foo/');

        expect(r.exec('assets/foo/bar.cesium.js')).toBeNull();
    });
});