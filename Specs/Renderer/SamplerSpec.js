/*global defineSuite*/
defineSuite([
        'Renderer/Sampler',
        'Specs/createContext'
    ], 'Renderer/Sampler', function(
        Sampler,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
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
