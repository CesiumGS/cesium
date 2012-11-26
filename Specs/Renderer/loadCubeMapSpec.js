/*global defineSuite*/
defineSuite([
         'Renderer/loadCubeMap',
         'Specs/createContext',
         'Specs/destroyContext',
         'ThirdParty/when'
     ], function(
         loadCubeMap,
         createContext,
         destroyContext,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('loads a cube map', function() {
        var cm;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Green.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Green.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Green.png',
            negativeZ : './Data/Images/Blue.png'
        }), function(cubeMap) {
            cm = cubeMap;
        });

        waitsFor(function() {
            return typeof cm !== 'undefined';
        }, 'The cube map should load.', 5000);

        runs(function() {
            expect(cm.getWidth()).toEqual(1);
            expect(cm.getHeight()).toEqual(1);
            cm.destroy();
        });
    });

    it('calls error function when an image does not exist', function() {
        var exception = false;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : 'not.found'
        }), function(cubeMap) {
        }, function() {
            exception = true;
        });

        waitsFor(function() {
            return exception;
        }, 'The cube map should load.', 5000);
    });

    it('throws without a context', function() {
        expect(function() {
            loadCubeMap(undefined);
        }).toThrow();
    });

    it('throws without urls', function() {
        expect(function() {
            loadCubeMap(context);
        }).toThrow();
    });

    it('throws without all urls', function() {
        expect(function() {
            loadCubeMap(context, {
                positiveX : 'any.image',
                negativeX : 'any.image'
            });
        }).toThrow();
    });
});