/*global defineSuite*/
defineSuite([
    'Core/TrustedServers'
], function(
    TrustedServers) {
    'use strict';

    afterEach(function() {
        TrustedServers.clear();
    });

    it('add without argument throws', function() {
        expect(function() {
            TrustedServers.add();
        }).toThrowDeveloperError();
    });

    it('remove without argument throws', function() {
        expect(function() {
            TrustedServers.remove();
        }).toThrowDeveloperError();
    });

    it('isTrusted without argument throws', function() {
        expect(function() {
            TrustedServers.contains();
        }).toThrowDeveloperError();
    });

    it('without a port', function() {
        TrustedServers.add('cesiumjs.org');
        expect(TrustedServers.contains('http://cesiumjs.org/index.html')).toBe(true);
    });

    it('with a port', function() {
        TrustedServers.add('cesiumjs.org:81');
        expect(TrustedServers.contains('http://cesiumjs.org/index.html')).toBe(false);
        expect(TrustedServers.contains('http://cesiumjs.org:81/index.html')).toBe(true);
    });

    it('using default http port', function() {
        TrustedServers.add('cesiumjs.org:80');
        expect(TrustedServers.contains('http://cesiumjs.org/index.html')).toBe(true);
    });

    it('using default https port', function() {
        TrustedServers.add('cesiumjs.org:443');
        expect(TrustedServers.contains('https://cesiumjs.org/index.html')).toBe(true);
    });

    it('remove without a port', function() {
        TrustedServers.add('cesiumjs.org');
        expect(TrustedServers.contains('http://cesiumjs.org/index.html')).toBe(true);
        TrustedServers.remove('cesiumjs.org');
        expect(TrustedServers.contains('http://cesiumjs.org/index.html')).toBe(false);
    });

    it('remove with a port', function() {
        TrustedServers.add('cesiumjs.org:81');
        expect(TrustedServers.contains('http://cesiumjs.org:81/index.html')).toBe(true);
        TrustedServers.remove('cesiumjs.org');
        expect(TrustedServers.contains('http://cesiumjs.org:81/index.html')).toBe(true);
        TrustedServers.remove('cesiumjs.org:81');
        expect(TrustedServers.contains('http://cesiumjs.org:81/index.html')).toBe(false);
    });

    it('clear', function() {
        TrustedServers.add('cesiumjs.org');
        expect(TrustedServers.contains('http://cesiumjs.org/index.html')).toBe(true);
        TrustedServers.clear();
        expect(TrustedServers.contains('http://cesiumjs.org/index.html')).toBe(false);
    });
});
