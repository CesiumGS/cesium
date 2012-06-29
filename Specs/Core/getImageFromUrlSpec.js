/*global defineSuite*/
defineSuite(['Core/getImageFromUrl'
            ], function(
             getImageFromUrl) {
    "use strict";
    /*global it, expect, waitsFor*/

    it('getImageFromUrl works', function() {
        var result;
        var shouldNotBeCalled = false;

        function onLoad(image) {
            result = image;
        }

        function onError(image) {
            shouldNotBeCalled = true;
        }

        function onAbort(image) {
            shouldNotBeCalled = true;
        }

        getImageFromUrl('./Data/Images/Green.png', onLoad, onError, onAbort);
        waitsFor(function() {
            var loaded = typeof result !== 'undefined';
            if (loaded) {
                var endOfString = 'Data/Images/Green.png';
                expect(result.src.indexOf(endOfString, result.src.length - endOfString.length)).toNotEqual(-1);
                expect(shouldNotBeCalled).toEqual(false);
            }
            return loaded;
        }, 'Load file(s) for getImageFromUrl test.', 3000);
    });

    it('throw with non-string url', function() {
        expect(function() {
            getImageFromUrl({}, function() {
            });
        }).toThrow();
    });

    it('throw with undefined url', function() {
        expect(function() {
            getImageFromUrl(undefined, function() {
            });
        }).toThrow();
    });

    it('throw with null url', function() {
        expect(function() {
            getImageFromUrl(null, function() {
            });
        }).toThrow();
    });

    it('throw with non-function callback', function() {
        expect(function() {
            getImageFromUrl('./Data/Images/Green.png', 'notAFunction');
        }).toThrow();
    });

    it('throw with undefined callback', function() {
        expect(function() {
            getImageFromUrl('./Data/Images/Green.png', undefined);
        }).toThrow();
    });

    it('throw with null callback', function() {
        expect(function() {
            getImageFromUrl('./Data/Images/Green.png', null);
        }).toThrow();
    });

    it('call onError on error', function() {
        var errorParameter;
        var shouldNotBeCalled = false;
        var image = getImageFromUrl('DoesNotExist', function(image) {
        }, function(image) {
            errorParameter = image;
        }, function(image) {
            shouldNotBeCalled = true;
        });

        waitsFor(function() {
            var loaded = typeof errorParameter !== 'undefined';
            if (loaded) {
                expect(errorParameter).toEqual(image);
                expect(shouldNotBeCalled).toEqual(false);
            }
            return loaded;
        }, 'Load file(s) for getImageFromUrl test.', 3000);
    });
});