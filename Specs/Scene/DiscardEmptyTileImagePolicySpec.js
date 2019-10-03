import { Resource } from '../../Source/Cesium.js';
import { DiscardEmptyTileImagePolicy } from '../../Source/Cesium.js';
import pollToPromise from '../pollToPromise.js';
import { when } from '../../Source/Cesium.js';

describe('Scene/DiscardEmptyTileImagePolicy', function() {

    afterEach(function() {
        Resource._Implementations.createImage = Resource._DefaultImplementations.createImage;
        Resource._Implementations.loadWithXhr = Resource._DefaultImplementations.loadWithXhr;
    });

    describe('shouldDiscardImage', function() {
        it('does not discard a non-empty image', function() {
            var promises = [];
            promises.push(Resource.fetchImage('Data/Images/Green4x4.png'));

            var policy = new DiscardEmptyTileImagePolicy();

            promises.push(pollToPromise(function() {
                return policy.isReady();
            }));

            return when.all(promises, function(results) {
                var greenImage = results[0];

                expect(policy.shouldDiscardImage(greenImage)).toEqual(false);
            });
        });

        it('discards an empty image', function() {
            var promises = [];
            promises.push(when.resolve(DiscardEmptyTileImagePolicy.EMPTY_IMAGE));

            var policy = new DiscardEmptyTileImagePolicy();

            promises.push(pollToPromise(function() {
                return policy.isReady();
            }));

            return when.all(promises, function(results) {
                var emptyImage = results[0];

                expect(policy.shouldDiscardImage(emptyImage)).toEqual(true);
            });
        });

    });
});
