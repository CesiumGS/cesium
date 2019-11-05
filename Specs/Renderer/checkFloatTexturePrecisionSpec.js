import { checkFloatTexturePrecision } from '../../Source/Cesium.js';
import { PixelDatatype } from '../../Source/Cesium.js';
import createContext from '../createContext.js';

describe('Renderer/checkFloatTexturePrecision', function() {

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('returns false when float textures are not available', function() {
        expect(checkFloatTexturePrecision({ floatingPointTexture : false })).toBe(false);
    });

    it('returns false when float textures are of insufficient precision', function() {
        if (!context.floatingPointTexture) {
            return;
        }

        spyOn(checkFloatTexturePrecision, '_getFloatPixelType').and.callFake(function() {
            return PixelDatatype.HALF_FLOAT;
        });
        spyOn(checkFloatTexturePrecision, '_getArray').and.callFake(function(array) {
            return new Uint16Array(array);
        });

        expect(checkFloatTexturePrecision(context)).toBe(false);
    });
}, 'WebGL');
