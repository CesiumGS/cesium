import { decodeGoogleEarthEnterpriseData } from '../../Source/Cesium.js';
import { defaultValue } from '../../Source/Cesium.js';
import { GoogleEarthEnterpriseMetadata } from '../../Source/Cesium.js';
import { GoogleEarthEnterpriseTileInformation } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { Request } from '../../Source/Cesium.js';
import { Resource } from '../../Source/Cesium.js';
import { when } from '../../Source/Cesium.js';

describe('Core/GoogleEarthEnterpriseMetadata', function() {

    it('tileXYToQuadKey', function() {
        expect(GoogleEarthEnterpriseMetadata.tileXYToQuadKey(1, 0, 0)).toEqual('2');
        expect(GoogleEarthEnterpriseMetadata.tileXYToQuadKey(1, 2, 1)).toEqual('02');
        expect(GoogleEarthEnterpriseMetadata.tileXYToQuadKey(3, 5, 2)).toEqual('021');
        expect(GoogleEarthEnterpriseMetadata.tileXYToQuadKey(4, 7, 2)).toEqual('100');
    });

    it('quadKeyToTileXY', function() {
        expect(GoogleEarthEnterpriseMetadata.quadKeyToTileXY('2')).toEqual({
            x : 1,
            y : 0,
            level : 0
        });
        expect(GoogleEarthEnterpriseMetadata.quadKeyToTileXY('02')).toEqual({
            x : 1,
            y : 2,
            level : 1
        });
        expect(GoogleEarthEnterpriseMetadata.quadKeyToTileXY('021')).toEqual({
            x : 3,
            y : 5,
            level : 2
        });
        expect(GoogleEarthEnterpriseMetadata.quadKeyToTileXY('100')).toEqual({
            x : 4,
            y : 7,
            level : 2
        });
    });

    it('decode', function() {
        CesiumMath.setRandomNumberSeed(123123);
        var key = new Uint8Array(1025);
        var data = new Uint8Array(1025);
        for (var i = 0; i < 1025; ++i) {
            key[i] = Math.floor(CesiumMath.nextRandomNumber() * 256);
            data[i] = Math.floor(CesiumMath.nextRandomNumber() * 256);
        }

        var keyBuffer = key.buffer.slice(0, 1024); // Key length should be divisible by 4
        var dataBuffer = data.buffer.slice();
        var a = new Uint8Array(dataBuffer);
        decodeGoogleEarthEnterpriseData(keyBuffer, dataBuffer);
        expect(a).not.toEqual(data);

        // For the algorithm encode/decode are the same
        decodeGoogleEarthEnterpriseData(keyBuffer, dataBuffer);

        expect(a).toEqual(data);
    });

    it('decode requires key' , function() {
        var data = new Uint8Array(3);

        expect(function() {
            decodeGoogleEarthEnterpriseData(undefined, data.buffer);
        }).toThrowDeveloperError();
    });

    it('decode requires data' , function() {
        var key = new Uint8Array(4);

        expect(function() {
            decodeGoogleEarthEnterpriseData(key.buffer);
        }).toThrowDeveloperError();
    });

    it('decode throws if key length isn\'t greater than 0 and a multiple 4' , function() {
        var key;
        var data = new Uint8Array(3);

        key = new Uint8Array(0);
        expect(function() {
            decodeGoogleEarthEnterpriseData(key.buffer, data.buffer);
        }).toThrowRuntimeError();

        key = new Uint8Array(1);
        expect(function() {
            decodeGoogleEarthEnterpriseData(key.buffer, data.buffer);
        }).toThrowRuntimeError();

        key = new Uint8Array(2);
        expect(function() {
            decodeGoogleEarthEnterpriseData(key.buffer, data.buffer);
        }).toThrowRuntimeError();

        key = new Uint8Array(3);
        expect(function() {
            decodeGoogleEarthEnterpriseData(key.buffer, data.buffer);
        }).toThrowRuntimeError();
    });

    it('populateSubtree', function() {
        var quad = '0123';
        var index = 0;
        spyOn(GoogleEarthEnterpriseMetadata.prototype, 'getQuadTreePacket').and.callFake(function(quadKey, version, request) {
            quadKey = defaultValue(quadKey, '') + index.toString();
            this._tileInfo[quadKey] = new GoogleEarthEnterpriseTileInformation(0xFF, 1, 1, 1);
            index = (index + 1) % 4;

            return when();
        });

        var metadata = new GoogleEarthEnterpriseMetadata({
            url : 'http://test.server'
        });
        var request = new Request({
            throttle : true
        });
        return metadata.readyPromise
            .then(function() {
                var tileXY = GoogleEarthEnterpriseMetadata.quadKeyToTileXY(quad);
                return metadata.populateSubtree(tileXY.x, tileXY.y, tileXY.level, request);
            })
            .then(function() {
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket.calls.count()).toEqual(4);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('', 1);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('0', 1, request);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('01', 1, request);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('012', 1, request);

                var tileInfo = metadata._tileInfo;
                expect(tileInfo['0']).toBeDefined();
                expect(tileInfo['01']).toBeDefined();
                expect(tileInfo['012']).toBeDefined();
                expect(tileInfo['0123']).toBeDefined();
            });
    });

    it('resolves readyPromise', function() {
        var baseurl = 'http://fake.fake.invalid/';

        var req = 0;
        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(responseType).toEqual('arraybuffer');
            if (req === 0) {
                expect(url).toEqual(baseurl + 'dbRoot.v5?output=proto');
                deferred.reject(); // Reject dbRoot request and use defaults
            } else {
                expect(url).toEqual(baseurl + 'flatfile?q2-0-q.1');
                Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterprise/gee.metadata', responseType, method, data, headers, deferred);
            }
            ++req;
        });

        var provider = new GoogleEarthEnterpriseMetadata({
            url : baseurl
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);

            expect(provider.imageryPresent).toBe(true);
            expect(provider.protoImagery).toBeUndefined();
            expect(provider.terrainPresent).toBe(true);
            expect(provider.negativeAltitudeThreshold).toBe(CesiumMath.EPSILON12);
            expect(provider.negativeAltitudeExponentBias).toBe(32);
            expect(provider.providers).toEqual({});

            var tileInfo = provider._tileInfo['0'];
            expect(tileInfo).toBeDefined();
            expect(tileInfo._bits).toEqual(0x40);
            expect(tileInfo.cnodeVersion).toEqual(2);
            expect(tileInfo.imageryVersion).toEqual(1);
            expect(tileInfo.terrainVersion).toEqual(1);
            expect(tileInfo.ancestorHasTerrain).toEqual(false);
            expect(tileInfo.terrainState).toBeUndefined();
        });
    });

    it('resolves readyPromise with Resource', function() {
        var baseurl = 'http://fake.fake.invalid/';
        var resource = new Resource({
            url : baseurl
        });

        var req = 0;
        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(responseType).toEqual('arraybuffer');
            if (req === 0) {
                expect(url).toEqual(baseurl + 'dbRoot.v5?output=proto');
                deferred.reject(); // Reject dbRoot request and use defaults
            } else {
                expect(url).toEqual(baseurl + 'flatfile?q2-0-q.1');
                Resource._DefaultImplementations.loadWithXhr('Data/GoogleEarthEnterprise/gee.metadata', responseType, method, data, headers, deferred);
            }
            ++req;
        });

        var provider = new GoogleEarthEnterpriseMetadata(resource);

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);

            expect(provider.imageryPresent).toBe(true);
            expect(provider.protoImagery).toBeUndefined();
            expect(provider.terrainPresent).toBe(true);
            expect(provider.negativeAltitudeThreshold).toBe(CesiumMath.EPSILON12);
            expect(provider.negativeAltitudeExponentBias).toBe(32);
            expect(provider.providers).toEqual({});

            var tileInfo = provider._tileInfo['0'];
            expect(tileInfo).toBeDefined();
            expect(tileInfo._bits).toEqual(0x40);
            expect(tileInfo.cnodeVersion).toEqual(2);
            expect(tileInfo.imageryVersion).toEqual(1);
            expect(tileInfo.terrainVersion).toEqual(1);
            expect(tileInfo.ancestorHasTerrain).toEqual(false);
            expect(tileInfo.terrainState).toBeUndefined();
        });
    });

    it('rejects readyPromise on error', function() {
        var url = 'host.invalid/';
        var provider = new GoogleEarthEnterpriseMetadata({
            url : url
        });

        return provider.readyPromise.then(function() {
            fail('should not resolve');
        }).otherwise(function(e) {
            expect(e.message).toContain(url);
        });
    });
});
