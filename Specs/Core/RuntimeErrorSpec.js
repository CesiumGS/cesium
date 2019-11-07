import { RuntimeError } from '../../Source/Cesium.js';

describe('Core/RuntimeError', function() {

    var name = 'RuntimeError';
    var testMessage = 'Testing';

    var e;
    beforeEach(function() {
        e = new RuntimeError(testMessage);
    });

    it('has a name property', function() {
        expect(e.name).toEqual(name);
    });

    it('has a message property', function() {
        expect(e.message).toEqual(testMessage);
    });

    it('has a stack property', function() {
        if (window.specsUsingRelease) {
            expect(e.stack).toContain('Specs.js');
        } else {
            expect(e.stack).toContain('RuntimeErrorSpec.js');
        }
    });

    it('has a working toString', function() {
        var str = new RuntimeError(testMessage).toString();

        expect(str).toContain(name + ': ' + testMessage);

        if (window.specsUsingRelease) {
            expect(str).toContain('Specs.js');
        } else {
            expect(str).toContain('Core/RuntimeErrorSpec.js');
        }
    });
});
