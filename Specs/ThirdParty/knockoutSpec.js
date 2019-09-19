import { knockout } from '../../Source/Cesium.js';

describe('ThirdParty/knockout', function() {

    it('can track all properties', function() {
        var obj = {
            one : 1,
            two : undefined,
            three : knockout.observable()
        };

        expect(knockout.getObservable(obj, 'one')).toBeNull();
        expect(knockout.getObservable(obj, 'two')).toBeNull();
        expect(knockout.getObservable(obj, 'three')).toBeNull();

        knockout.track(obj);

        expect(knockout.getObservable(obj, 'one')).not.toBeNull();
        expect(knockout.getObservable(obj, 'two')).not.toBeNull();
        expect(knockout.getObservable(obj, 'three')).not.toBeNull();
    });
});
