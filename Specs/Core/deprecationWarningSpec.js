import { deprecationWarning } from '../../Source/Cesium.js';

describe('Core/deprecationWarning', function() {

    it('logs a warning', function() {
        spyOn(console, 'warn');

        deprecationWarning('deprecation-identifier', 'message');
        deprecationWarning('deprecation-identifier', 'message');
        deprecationWarning('another deprecation-identifier', 'another message');

        expect(console.warn.calls.count()).toEqual(2);
        expect(console.warn.calls.argsFor(0)[0]).toBe('message');
        expect(console.warn.calls.argsFor(1)[0]).toBe('another message');
    });

    it('throws without identifier', function() {
        expect(function() {
            deprecationWarning();
        }).toThrowDeveloperError();
    });

    it('throws without message', function() {
        expect(function() {
            deprecationWarning('identifier');
        }).toThrowDeveloperError();
    });
});
