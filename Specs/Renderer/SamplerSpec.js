/*global defineSuite*/
defineSuite([
        'Specs/createContext',
        'Specs/destroyContext'
    ], 'Renderer/Sampler', function(
        createContext,
        destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('throws when creating a sampler with invalid wrapS', function() {
        expect(function() {
            context.createSampler({
                wrapS : 'invalid wrap'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid wrapT', function() {
        expect(function() {
            context.createSampler({
                wrapT : 'invalid wrap'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid minificationFilter', function() {
        expect(function() {
            context.createSampler({
                minificationFilter : 'invalid filter'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid magnificationFilter', function() {
        expect(function() {
            context.createSampler({
                magnificationFilter : 'invalid filter'
            });
        }).toThrowDeveloperError();
    });

    it('throws when creating a sampler with invalid maximumAnisotropy', function() {
        expect(function() {
            context.createSampler({
                maximumAnisotropy : 0.0
            });
        }).toThrowDeveloperError();
    });

}, 'WebGL');
