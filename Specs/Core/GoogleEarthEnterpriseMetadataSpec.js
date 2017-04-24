/*global defineSuite*/
defineSuite([
    'Core/GoogleEarthEnterpriseMetadata',
    'Core/DefaultProxy',
    'Core/defaultValue',
    'Core/loadWithXhr',
    'Core/Math',
    'ThirdParty/when'
], function(
    GoogleEarthEnterpriseMetadata,
    DefaultProxy,
    defaultValue,
    loadWithXhr,
    CesiumMath,
    when) {
    'use strict';

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
        var data = new Uint8Array(1025);
        for (var i = 0; i < 1025; ++i) {
            data[i] = Math.floor(CesiumMath.nextRandomNumber() * 256);
        }

        var buffer = data.buffer.slice();
        var a = new Uint8Array(buffer);
        GoogleEarthEnterpriseMetadata.decode(buffer);
        expect(a).not.toEqual(data);

        // For the algorithm encode/decode are the same
        GoogleEarthEnterpriseMetadata.decode(buffer);
        expect(a).toEqual(data);
    });

    it('populateSubtree', function() {
        var quad = '0123';
        var index = 0;
        spyOn(GoogleEarthEnterpriseMetadata.prototype, 'getQuadTreePacket').and.callFake(function(quadKey, version) {
            quadKey = defaultValue(quadKey, '') + index.toString();
            this._tileInfo[quadKey] = new GoogleEarthEnterpriseMetadata.TileInformation(0xFF, 1, 1, 1);
            index = (index + 1) % 4;

            return when();
        });

        var metadata = new GoogleEarthEnterpriseMetadata({
            url : 'http://test.server'
        });
        return metadata.readyPromise
            .then(function() {
                var tileXY = GoogleEarthEnterpriseMetadata.quadKeyToTileXY(quad);
                return metadata.populateSubtree(tileXY.x, tileXY.y, tileXY.level);
            })
            .then(function() {
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket.calls.count()).toEqual(4);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('', 1, false);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('0', 1, true);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('01', 1, true);
                expect(GoogleEarthEnterpriseMetadata.prototype.getQuadTreePacket).toHaveBeenCalledWith('012', 1, true);

                var tileInfo = metadata._tileInfo;
                expect(tileInfo['0']).toBeDefined();
                expect(tileInfo['01']).toBeDefined();
                expect(tileInfo['012']).toBeDefined();
                expect(tileInfo['0123']).toBeDefined();
            });
    });

    it('resolves readyPromise', function() {
        var baseurl = 'http://fake.fake.invalid/';

        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(baseurl + 'flatfile?q2-0-q.1');
            expect(responseType).toEqual('arraybuffer');
            loadWithXhr.defaultLoad('Data/GoogleEarthEnterprise/gee.metadata', responseType, method, data, headers, deferred);
        });

        var provider = new GoogleEarthEnterpriseMetadata({
            url : baseurl
        });

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);

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

    it('routes requests through a proxy if one is specified', function() {
        var proxy = new DefaultProxy('/proxy/');
        var baseurl = 'http://fake.fake.invalid/';

        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(proxy.getURL(baseurl + 'flatfile?q2-0-q.1'));
            expect(responseType).toEqual('arraybuffer');
            loadWithXhr.defaultLoad('Data/GoogleEarthEnterprise/gee.metadata', responseType, method, data, headers, deferred);
        });

        var provider = new GoogleEarthEnterpriseMetadata({
            url : baseurl,
            proxy : proxy
        });

        expect(provider.url).toEqual(baseurl);
        expect(provider.proxy).toEqual(proxy);

        return provider.readyPromise.then(function(result) {
            expect(result).toBe(true);

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
});
