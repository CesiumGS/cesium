/*global defineSuite*/
defineSuite([
        'Renderer/Sampler',
        'Renderer/TextureMinificationFilter',
        'Renderer/TextureWrap',
        'Specs/createContext'
    ], function(
        Sampler,
        TextureMinificationFilter,
        TextureWrap,
        createContext) {
    'use strict';

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('has expected default values', function() {
        var sampler = new Sampler();
        expect(sampler.wrapS).toEqual(TextureWrap.CLAMP_TO_EDGE);
        expect(sampler.wrapT).toEqual(TextureWrap.CLAMP_TO_EDGE);
        expect(sampler.minificationFilter).toEqual(TextureMinificationFilter.LINEAR);
        expect(sampler.magnificationFilter).toEqual(TextureMinificationFilter.LINEAR);
        expect(sampler.maximumAnisotropy).toEqual(1.0);
    });

    it('throws when creating a sampler with invalid wrapS', function() {
        expect(function() {
            return new Sampler({
                wrapS : 'invalid wrap'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid wrapT', function() {
        expect(function() {
            return new Sampler({
                wrapT : 'invalid wrap'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid minificationFilter', function() {
        expect(function() {
            return new Sampler({
                minificationFilter : 'invalid filter'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid magnificationFilter', function() {
        expect(function() {
            return new Sampler({
                magnificationFilter : 'invalid filter'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid maximumAnisotropy', function() {
        expect(function() {
            return new Sampler({
                maximumAnisotropy : 0.0
            });
        }).toThrowDeveloperError();
    });

}, 'WebGL');
