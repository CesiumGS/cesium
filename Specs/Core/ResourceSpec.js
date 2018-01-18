defineSuite([
    'Core/Resource',
    'Core/DefaultProxy',
    'Core/Request',
    'ThirdParty/when'
], function(
    Resource,
    DefaultProxy,
    Request,
    when) {
    'use strict';

    it('Constructor sets correct properties', function() {
        var proxy = new DefaultProxy('/proxy/');
        var request = new Request();
        function retryFunc() {
        }

        var resource = new Resource({
            url: 'http://test.com/tileset',
            queryParameters: {
                key1: 'value1',
                key2: 'value2'
            },
            templateValues: {
                key3: 'value3',
                key4: 'value4'
            },
            headers: {
                Accept: 'application/test-type'
            },
            responseType: 'arraybuffer',
            method: 'POST',
            data: {
                stuff: 'more stuff'
            },
            proxy: proxy,
            retryCallback: retryFunc,
            retryAttempts: 4,
            request: request
        });

        expect(resource.getUrlComponent(false, false)).toEqual('http://test.com/tileset');
        expect(resource.getUrlComponent(true, false)).toEqual('http://test.com/tileset?key1=value1&key2=value2');
        expect(resource.getUrlComponent(false, true)).toEqual(proxy.getURL('http://test.com/tileset'));
        expect(resource.getUrlComponent(true, true)).toEqual(proxy.getURL('http://test.com/tileset?key1=value1&key2=value2'));
        expect(resource.url).toEqual(proxy.getURL('http://test.com/tileset?key1=value1&key2=value2'));
        expect(resource.queryParameters).toEqual({
            key1: 'value1',
            key2: 'value2'
        });
        expect(resource.templateValues).toEqual({
            key3: 'value3',
            key4: 'value4'
        });
        expect(resource.headers).toEqual({
            Accept: 'application/test-type'
        });
        expect(resource.responseType).toEqual('arraybuffer');
        expect(resource.method).toEqual('POST');
        expect(resource.data).toEqual({
            stuff: 'more stuff'
        });
        expect(resource.proxy).toBe(proxy);
        expect(resource.retryCallback).toBe(retryFunc);
        expect(resource.retryAttempts).toEqual(4);
        expect(resource._retryCount).toEqual(0);
        expect(resource.request).toBe(request);
    });

    it('appendForwardSlash appends a /', function() {
        var resource = new Resource({
            url: 'http://test.com/tileset'
        });
        expect(resource.url).toEqual('http://test.com/tileset');
        resource.appendForwardSlash();
        expect(resource.url).toEqual('http://test.com/tileset/');
    });

    it('Setting a url with a query string sets queryParameters correctly', function() {
        var resource = new Resource({
            url: 'http://test.com/tileset?foo=bar&baz=foo'
        });
        expect(resource.getUrlComponent()).toEqual('http://test.com/tileset');
        expect(resource.getUrlComponent(true)).toEqual('http://test.com/tileset?foo=bar&baz=foo');
        expect(resource.queryParameters).toEqual({
            foo: 'bar',
            baz: 'foo'
        });
    });

    it('createIfNeeded returns undefined, if parameter is undefined', function() {
        expect(Resource.createIfNeeded()).toBeUndefined();
    });

    it('createIfNeeded returns Resource, if parameter is a Resource', function() {
        var resource = new Resource({
            url: 'http://test.com/tileset'
        });
        expect(Resource.createIfNeeded(resource)).toEqual(resource);
    });

    it('createIfNeeded returns Resource, if parameter is a String', function() {
        var resource = Resource.createIfNeeded('http://test.com/tileset');
        expect(resource.url).toEqual('http://test.com/tileset');
    });

    it('templateValues are respected', function() {
        var resource = new Resource({
            url: 'http://test.com/tileset/{foo}/{bar}',
            templateValues: {
                foo: 'test1',
                bar: 'test2'
            }
        });

        expect(resource.url).toEqual('http://test.com/tileset/test1/test2');
    });

    it('getDerivedResource sets correct properties', function() {
        var proxy = new DefaultProxy('/proxy/');
        var request = new Request();
        function retryFunc() {
        }

        var parent = new Resource({
            url: 'http://test.com/tileset?key=value',
            queryParameters: {
                foo: 'bar'
            },
            templateValues: {
                key5: 'value5',
                key6: 'value6'
            }
        });
        parent.appendForwardSlash();

        var resource = parent.getDerivedResource({
            url: 'tileset.json',
            queryParameters: {
                key1: 'value1',
                key2: 'value2'
            },
            templateValues: {
                key3: 'value3',
                key4: 'value4'
            },
            headers: {
                Accept: 'application/test-type'
            },
            responseType: 'arraybuffer',
            method: 'POST',
            data: {
                stuff: 'more stuff'
            },
            proxy: proxy,
            retryCallback: retryFunc,
            retryAttempts: 4,
            request: request
        });

        expect(resource.getUrlComponent(false, false)).toEqual('http://test.com/tileset/tileset.json');
        expect(resource.getUrlComponent(true, false)).toEqual('http://test.com/tileset/tileset.json?key1=value1&key2=value2&foo=bar&key=value');
        expect(resource.getUrlComponent(false, true)).toEqual(proxy.getURL('http://test.com/tileset/tileset.json'));
        expect(resource.getUrlComponent(true, true)).toEqual(proxy.getURL('http://test.com/tileset/tileset.json?key1=value1&key2=value2&foo=bar&key=value'));
        expect(resource.url).toEqual(proxy.getURL('http://test.com/tileset/tileset.json?key1=value1&key2=value2&foo=bar&key=value'));
        expect(resource.queryParameters).toEqual({
            foo: 'bar',
            key: 'value',
            key1: 'value1',
            key2: 'value2'
        });
        expect(resource.templateValues).toEqual({
            key5: 'value5',
            key6: 'value6',
            key3: 'value3',
            key4: 'value4'
        });
        expect(resource.headers).toEqual({
            Accept: 'application/test-type'
        });
        expect(resource.responseType).toEqual('arraybuffer');
        expect(resource.method).toEqual('POST');
        expect(resource.data).toEqual({
            stuff: 'more stuff'
        });
        expect(resource.proxy).toBe(proxy);
        expect(resource.retryCallback).toBe(retryFunc);
        expect(resource.retryAttempts).toEqual(4);
        expect(resource._retryCount).toEqual(0);
        expect(resource.request).toBe(request);
    });

    it('getDerivedResource works with directory parent resource', function() {
        var parent = new Resource({
            url: 'http://test.com/tileset/'
        });

        expect(parent.url).toEqual('http://test.com/tileset/');

        var resource = parent.getDerivedResource({
            url: 'tileset.json'
        });

        expect(resource.url).toEqual('http://test.com/tileset/tileset.json');
    });

    it('getDerivedResource works with file parent resource', function() {
        var parent = new Resource({
            url: 'http://test.com/tileset/tileset.json'
        });

        expect(parent.url).toEqual('http://test.com/tileset/tileset.json');

        var resource = parent.getDerivedResource({
            url: '0/0/0.b3dm'
        });

        expect(resource.url).toEqual('http://test.com/tileset/0/0/0.b3dm');
    });

    it('getDerivedResource works with only template values', function() {
        var parent = new Resource({
            url: 'http://test.com/terrain/{z}/{x}/{y}.terrain'
        });

        expect(parent.url).toEqual('http://test.com/terrain/{z}/{x}/{y}.terrain');

        var resource = parent.getDerivedResource({
            templateValues: {
                x: 1,
                y: 2,
                z: 0
            }
        });

        expect(resource.url).toEqual('http://test.com/terrain/0/1/2.terrain');
    });

    it('getDerivedResource works with only query parameters', function() {
        var parent = new Resource({
            url: 'http://test.com/terrain'
        });

        expect(parent.url).toEqual('http://test.com/terrain');

        var resource = parent.getDerivedResource({
            queryParameters: {
                x: 1,
                y: 2,
                z: 0
            }
        });

        expect(resource.url).toEqual('http://test.com/terrain?x=1&y=2&z=0');
    });

    it('addQueryParameters with useAsDefault set to true', function() {
        var resource = new Resource({
            url: 'http://test.com/terrain',
            queryParameters: {
                x: 1,
                y: 2
            }
        });

        expect(resource.queryParameters).toEqual({
            x: 1,
            y: 2
        });

        resource.addQueryParameters({
            x: 3,
            y: 4,
            z: 0
        }, true);

        expect(resource.queryParameters).toEqual({
            x: 1,
            y: 2,
            z: 0
        });
    });

    it('addQueryParameters with useAsDefault set to false', function() {
        var resource = new Resource({
            url: 'http://test.com/terrain',
            queryParameters: {
                x: 1,
                y: 2
            }
        });

        expect(resource.queryParameters).toEqual({
            x: 1,
            y: 2
        });

        resource.addQueryParameters({
            x: 3,
            y: 4,
            z: 0
        }, false);

        expect(resource.queryParameters).toEqual({
            x: 3,
            y: 4,
            z: 0
        });
    });

    it('addTemplateValues with useAsDefault set to true', function() {
        var resource = new Resource({
            url: 'http://test.com/terrain/{z}/{x}/{y}.terrain',
            templateValues: {
                x: 1,
                y: 2,
                map: 'my map'
            }
        });

        expect(resource.templateValues).toEqual({
            x: 1,
            y: 2,
            map: 'my map'
        });

        resource.addTemplateValues({
            x: 3,
            y: 4,
            z: 0,
            style: 'my style'
        }, true);

        expect(resource.templateValues).toEqual({
            x: 1,
            y: 2,
            map: 'my map',
            z: 0,
            style: 'my style'
        });
    });

    it('addTemplateValues with useAsDefault set to false', function() {
        var resource = new Resource({
            url: 'http://test.com/terrain/{z}/{x}/{y}.terrain',
            templateValues: {
                x: 1,
                y: 2,
                map: 'my map'
            }
        });

        expect(resource.templateValues).toEqual({
            x: 1,
            y: 2,
            map: 'my map'
        });

        resource.addTemplateValues({
            x: 3,
            y: 4,
            z: 0,
            style: 'my style'
        }, false);

        expect(resource.templateValues).toEqual({
            x: 3,
            y: 4,
            map: 'my map',
            z: 0,
            style: 'my style'
        });
    });

    it('retryOnFail doesn\'t exceed retryAttempts', function() {
        var cb = jasmine.createSpy('retry').and.returnValue(true);
        var resource = new Resource({
            url: 'http://test.com/terrain',
            retryCallback: cb,
            retryAttempts: 3
        });

        var promises = [];
        for (var i=0;i<6;++i) {
            promises.push(resource.retryOnError());
        }

        when.all(promises)
            .then(function(result) {
                expect(result).toEqual([true, true, true, false, false, false]);
                expect(cb.calls.count()).toEqual(3);
                expect(resource._retryCount).toEqual(3);
            });
    });

    it('retryOnFail returns value from callback', function() {
        var result = true;
        var cb = jasmine.createSpy('retry').and.callFake(function() {
            result = !result;
            return result;
        });

        var resource = new Resource({
            url: 'http://test.com/terrain',
            retryCallback: cb,
            retryAttempts: 4
        });

        var promises = [];
        for (var i=0;i<6;++i) {
            promises.push(resource.retryOnError());
        }

        when.all(promises)
            .then(function(result) {
                expect(result).toEqual([false, true, false, true, false, false]);
                expect(cb.calls.count()).toEqual(4);
                expect(resource._retryCount).toEqual(4);
            });
    });
});
