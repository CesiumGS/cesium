/*global defineSuite*/
defineSuite([
    'Core/CredentialsRegistry'
], function(
    CredentialsRegistry) {
    'use strict';

    afterEach(function() {
        CredentialsRegistry.clear();
    });

    it('addTrustedServer without argument throws', function() {
        expect(function() {
            CredentialsRegistry.addTrustedServer();
        }).toThrowDeveloperError();
    });

    it('removeTrustedServer without argument throws', function() {
        expect(function() {
            CredentialsRegistry.removeTrustedServer();
        }).toThrowDeveloperError();
    });

    it('isTrusted without argument throws', function() {
        expect(function() {
            CredentialsRegistry.isTrusted();
        }).toThrowDeveloperError();
    });

    it('without a port', function() {
        CredentialsRegistry.addTrustedServer('cesiumjs.org');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org/index.html')).toBe(true);
    });

    it('with a port', function() {
        CredentialsRegistry.addTrustedServer('cesiumjs.org:81');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org/index.html')).toBe(false);
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org:81/index.html')).toBe(true);
    });

    it('using default http port', function() {
        CredentialsRegistry.addTrustedServer('cesiumjs.org:80');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org/index.html')).toBe(true);
    });

    it('using default https port', function() {
        CredentialsRegistry.addTrustedServer('cesiumjs.org:443');
        expect(CredentialsRegistry.isTrusted('https://cesiumjs.org/index.html')).toBe(true);
    });

    it('remove without a port', function() {
        CredentialsRegistry.addTrustedServer('cesiumjs.org');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org/index.html')).toBe(true);
        CredentialsRegistry.removeTrustedServer('cesiumjs.org');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org/index.html')).toBe(false);
    });

    it('remove with a port', function() {
        CredentialsRegistry.addTrustedServer('cesiumjs.org:81');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org:81/index.html')).toBe(true);
        CredentialsRegistry.removeTrustedServer('cesiumjs.org');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org:81/index.html')).toBe(true);
        CredentialsRegistry.removeTrustedServer('cesiumjs.org:81');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org:81/index.html')).toBe(false);
    });

    it('clear', function() {
        CredentialsRegistry.addTrustedServer('cesiumjs.org');
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org/index.html')).toBe(true);
        CredentialsRegistry.clear();
        expect(CredentialsRegistry.isTrusted('http://cesiumjs.org/index.html')).toBe(false);
    });
});
