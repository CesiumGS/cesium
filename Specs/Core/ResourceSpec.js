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
        expect(resource.proxy).toBe(proxy);
        expect(resource.retryCallback).toBe(retryFunc);
        expect(resource.retryAttempts).toEqual(4);
        expect(resource._retryCount).toEqual(0);
        expect(resource.request).toBe(request);
    });

    it('Constructor sets correct properties', function() {
        var url = 'http://invalid.domain.com/tileset';
        var resource = new Resource(url);
        expect(resource.url).toEqual(url);
        expect(resource.queryParameters).toEqual({});
        expect(resource.templateValues).toEqual({});
        expect(resource.headers).toEqual({});
        expect(resource.proxy).toBeUndefined();
        expect(resource.retryCallback).toBeUndefined();
        expect(resource.retryAttempts).toEqual(0);
        expect(resource.request).toBeDefined();
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

    it('multiple values for query parameters are allowed', function() {
        var resource = new Resource('http://test.com/tileset/endpoint?a=1&a=2&b=3&a=4');
        expect(resource.queryParameters.a).toEqual(['1', '2', '4']);
        expect(resource.queryParameters.b).toEqual('3');

        expect(resource.url).toEqual('http://test.com/tileset/endpoint?a=1&a=2&a=4&b=3');
    });

    it('multiple values for query parameters works with getDerivedResource without preserverQueryParameters', function() {
        var resource = new Resource('http://test.com/tileset/endpoint?a=1&a=2&b=3&a=4');
        expect(resource.queryParameters.a).toEqual(['1', '2', '4']);
        expect(resource.queryParameters.b).toEqual('3');

        expect(resource.url).toEqual('http://test.com/tileset/endpoint?a=1&a=2&a=4&b=3');

        var derived = resource.getDerivedResource({
            url: 'other_endpoint?a=5&b=6&a=7'
        });

        expect(derived.queryParameters.a).toEqual(['5', '7']);
        expect(derived.queryParameters.b).toEqual('6');

        expect(derived.url).toEqual('http://test.com/tileset/other_endpoint?a=5&a=7&b=6');
    });

    it('multiple values for query parameters works with getDerivedResource with preserveQueryParameters', function() {
        var resource = new Resource('http://test.com/tileset/endpoint?a=1&a=2&b=3&a=4');
        expect(resource.queryParameters.a).toEqual(['1', '2', '4']);
        expect(resource.queryParameters.b).toEqual('3');

        expect(resource.url).toEqual('http://test.com/tileset/endpoint?a=1&a=2&a=4&b=3');

        var derived = resource.getDerivedResource({
            url: 'other_endpoint?a=5&b=6&a=7',
            preserveQueryParameters: true
        });

        expect(derived.queryParameters.a).toEqual(['5', '7', '1', '2', '4']);
        expect(derived.queryParameters.b).toEqual(['6', '3']);

        expect(derived.url).toEqual('http://test.com/tileset/other_endpoint?a=5&a=7&a=1&a=2&a=4&b=6&b=3');
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
            proxy: proxy,
            retryCallback: retryFunc,
            retryAttempts: 4,
            request: request
        });

        expect(resource.getUrlComponent(false, false)).toEqual('http://test.com/tileset/tileset.json');
        expect(resource.getUrlComponent(true, false)).toEqual('http://test.com/tileset/tileset.json?key1=value1&key2=value2&key=value&foo=bar');
        expect(resource.getUrlComponent(false, true)).toEqual(proxy.getURL('http://test.com/tileset/tileset.json'));
        expect(resource.getUrlComponent(true, true)).toEqual(proxy.getURL('http://test.com/tileset/tileset.json?key1=value1&key2=value2&key=value&foo=bar'));
        expect(resource.url).toEqual(proxy.getURL('http://test.com/tileset/tileset.json?key1=value1&key2=value2&key=value&foo=bar'));
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

    it('setQueryParameters with useAsDefault set to true', function() {
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

        resource.setQueryParameters({
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

    it('setQueryParameters with useAsDefault set to false', function() {
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

        resource.setQueryParameters({
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

    it('appendQueryParameters works with non-arrays', function() {
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

        resource.appendQueryParameters({
            x: 3,
            y: 4,
            z: 0
        });

        expect(resource.queryParameters).toEqual({
            x: [3, 1],
            y: [4, 2],
            z: 0
        });
    });

    it('appendQueryParameters works with arrays/non-arrays', function() {
        var resource = new Resource({
            url: 'http://test.com/terrain',
            queryParameters: {
                x: [1, 2],
                y: 2,
                z: [-1, -2]
            }
        });

        expect(resource.queryParameters).toEqual({
            x: [1, 2],
            y: 2,
            z: [-1, -2]
        });

        resource.appendQueryParameters({
            x: 3,
            y: [4, 5],
            z: [-3, -4]
        });

        expect(resource.queryParameters).toEqual({
            x: [3, 1, 2],
            y: [4, 5, 2],
            z: [-3, -4, -1, -2]
        });
    });


    it('setTemplateValues with useAsDefault set to true', function() {
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

        resource.setTemplateValues({
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

    it('setTemplateValues with useAsDefault set to false', function() {
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

        resource.setTemplateValues({
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

    it('isDataUri returns correct values', function() {
        var dataResource = new Resource({
            url: 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3'
        });

        expect(dataResource.isDataUri).toBe(true);

        var resource = new Resource({
            url: 'http://invalid.uri/tileset'
        });

        expect(resource.isDataUri).toBe(false);
    });

    it('isBlobUri returns correct values', function() {
        var dataResource = new Resource({
            url: 'blob:d3958f5c-0777-0845-9dcf-2cb28783acaf'
        });

        expect(dataResource.isBlobUri).toBe(true);

        var resource = new Resource({
            url: 'http://invalid.uri/tileset'
        });

        expect(resource.isBlobUri).toBe(false);
    });

    it('post calls with correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResponseType = 'json';
        var expectedData = {
            stuff: 'myStuff'
        };
        var expectedHeaders = {
            'X-My-Header': 'My-Value'
        };
        var expectedResult = {
            status: 'success'
        };
        var expectedMimeType = 'application/test-data';
        var resource = new Resource({
            url: expectedUrl,
            headers: expectedHeaders
        });

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(responseType).toEqual(expectedResponseType);
            expect(method).toEqual('POST');
            expect(data).toEqual(expectedData);
            expect(headers['X-My-Header']).toEqual('My-Value');
            expect(headers['X-My-Other-Header']).toEqual('My-Other-Value');
            expect(overrideMimeType).toBe(expectedMimeType);
            deferred.resolve(expectedResult);
        });

        return resource.post(expectedData, {
            responseType: expectedResponseType,
            headers: {
                'X-My-Other-Header': 'My-Other-Value'
            },
            overrideMimeType: expectedMimeType
        })
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('static post calls with correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResponseType = 'json';
        var expectedData = {
            stuff: 'myStuff'
        };
        var expectedHeaders = {
            'X-My-Header': 'My-Value'
        };
        var expectedResult = {
            status: 'success'
        };
        var expectedMimeType = 'application/test-data';

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(responseType).toEqual(expectedResponseType);
            expect(method).toEqual('POST');
            expect(data).toEqual(expectedData);
            expect(headers).toEqual(expectedHeaders);
            expect(overrideMimeType).toBe(expectedMimeType);
            deferred.resolve(expectedResult);
        });

        return Resource.post({
            url: expectedUrl,
            data: expectedData,
            responseType: expectedResponseType,
            headers: expectedHeaders,
            overrideMimeType: expectedMimeType
        })
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('put calls with correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResponseType = 'json';
        var expectedData = {
            stuff: 'myStuff'
        };
        var expectedHeaders = {
            'X-My-Header': 'My-Value'
        };
        var expectedResult = {
            status: 'success'
        };
        var expectedMimeType = 'application/test-data';
        var resource = new Resource({
            url: expectedUrl,
            headers: expectedHeaders
        });

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(responseType).toEqual(expectedResponseType);
            expect(method).toEqual('PUT');
            expect(data).toEqual(expectedData);
            expect(headers['X-My-Header']).toEqual('My-Value');
            expect(headers['X-My-Other-Header']).toEqual('My-Other-Value');
            expect(overrideMimeType).toBe(expectedMimeType);
            deferred.resolve(expectedResult);
        });

        return resource.put(expectedData, {
            responseType: expectedResponseType,
            headers: {
                'X-My-Other-Header': 'My-Other-Value'
            },
            overrideMimeType: expectedMimeType
        })
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('static put calls with correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResponseType = 'json';
        var expectedData = {
            stuff: 'myStuff'
        };
        var expectedHeaders = {
            'X-My-Header': 'My-Value'
        };
        var expectedResult = {
            status: 'success'
        };
        var expectedMimeType = 'application/test-data';

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(responseType).toEqual(expectedResponseType);
            expect(method).toEqual('PUT');
            expect(data).toEqual(expectedData);
            expect(headers).toEqual(expectedHeaders);
            expect(overrideMimeType).toBe(expectedMimeType);
            deferred.resolve(expectedResult);
        });

        return Resource.put({
            url: expectedUrl,
            data: expectedData,
            responseType: expectedResponseType,
            headers: expectedHeaders,
            overrideMimeType: expectedMimeType
        })
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('patch calls with correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResponseType = 'json';
        var expectedData = {
            stuff: 'myStuff'
        };
        var expectedHeaders = {
            'X-My-Header': 'My-Value'
        };
        var expectedResult = {
            status: 'success'
        };
        var expectedMimeType = 'application/test-data';
        var resource = new Resource({
            url: expectedUrl,
            headers: expectedHeaders
        });

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(responseType).toEqual(expectedResponseType);
            expect(method).toEqual('PATCH');
            expect(data).toEqual(expectedData);
            expect(headers['X-My-Header']).toEqual('My-Value');
            expect(headers['X-My-Other-Header']).toEqual('My-Other-Value');
            expect(overrideMimeType).toBe(expectedMimeType);
            deferred.resolve(expectedResult);
        });

        return resource.patch(expectedData, {
            responseType: expectedResponseType,
            headers: {
                'X-My-Other-Header': 'My-Other-Value'
            },
            overrideMimeType: expectedMimeType
        })
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('static patch calls with correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResponseType = 'json';
        var expectedData = {
            stuff: 'myStuff'
        };
        var expectedHeaders = {
            'X-My-Header': 'My-Value'
        };
        var expectedResult = {
            status: 'success'
        };
        var expectedMimeType = 'application/test-data';

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(responseType).toEqual(expectedResponseType);
            expect(method).toEqual('PATCH');
            expect(data).toEqual(expectedData);
            expect(headers).toEqual(expectedHeaders);
            expect(overrideMimeType).toBe(expectedMimeType);
            deferred.resolve(expectedResult);
        });

        return Resource.patch({
            url: expectedUrl,
            data: expectedData,
            responseType: expectedResponseType,
            headers: expectedHeaders,
            overrideMimeType: expectedMimeType
        })
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('static fetchArrayBuffer calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetchArrayBuffer').and.returnValue(when.resolve());
        return Resource.fetchArrayBuffer(url)
            .then(function() {
                expect(Resource.prototype.fetchArrayBuffer).toHaveBeenCalled();
            });
    });

    it('static fetchBlob calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetchBlob').and.returnValue(when.resolve());
        return Resource.fetchBlob(url)
            .then(function() {
                expect(Resource.prototype.fetchBlob).toHaveBeenCalled();
            });
    });

    it('static fetchImage calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetchImage').and.returnValue(when.resolve());
        return Resource.fetchImage(url)
            .then(function() {
                expect(Resource.prototype.fetchImage).toHaveBeenCalled();
            });
    });

    it('static fetchText calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetchText').and.returnValue(when.resolve());
        return Resource.fetchText(url)
            .then(function() {
                expect(Resource.prototype.fetchText).toHaveBeenCalled();
            });
    });

    it('static fetchJson calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetchJson').and.returnValue(when.resolve());
        return Resource.fetchJson(url)
            .then(function() {
                expect(Resource.prototype.fetchJson).toHaveBeenCalled();
            });
    });

    it('static fetchXML calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetchXML').and.returnValue(when.resolve());
        return Resource.fetchXML(url)
            .then(function() {
                expect(Resource.prototype.fetchXML).toHaveBeenCalled();
            });
    });

    it('static fetchJsonp calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetchJsonp').and.returnValue(when.resolve());
        return Resource.fetchJsonp(url)
            .then(function() {
                expect(Resource.prototype.fetchJsonp).toHaveBeenCalled();
            });
    });

    it('static fetch calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'fetch').and.returnValue(when.resolve());
        return Resource.fetch(url)
            .then(function() {
                expect(Resource.prototype.fetch).toHaveBeenCalled();
            });
    });

    it('fetch calls correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResult = {
            status: 'success'
        };

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(method).toEqual('GET');
            deferred.resolve(expectedResult);
        });

        var resource = new Resource({url: expectedUrl});
        return resource.fetch()
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('static delete calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'delete').and.returnValue(when.resolve());
        return Resource.delete(url)
            .then(function() {
                expect(Resource.prototype.delete).toHaveBeenCalled();
            });
    });

    it('delete calls correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResult = {
            status: 'success'
        };

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(method).toEqual('DELETE');
            deferred.resolve(expectedResult);
        });

        var resource = new Resource({url: expectedUrl});
        return resource.delete()
            .then(function(result) {
                expect(result).toEqual(expectedResult);
            });
    });

    it('static head calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'head').and.returnValue(when.resolve({}));
        return Resource.head(url)
            .then(function() {
                expect(Resource.prototype.head).toHaveBeenCalled();
            });
    });

    it('head calls correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResult = {
            'accept-ranges': 'bytes',
            'access-control-allow-headers' : 'Origin, X-Requested-With, Content-Type, Accept',
            'access-control-allow-origin' : '*',
            'cache-control': 'public, max-age=0',
            'connection' : 'keep-alive',
            'content-length' : '883',
            'content-type' : 'image/png',
            'date' : 'Tue, 13 Feb 2018 03:38:55 GMT',
            'etag' : 'W/"373-15e34d146a1"',
            'vary' : 'Accept-Encoding',
            'x-powered-vy' : 'Express'
        };
        var headerString = '';
        for (var key in expectedResult) {
            if (expectedResult.hasOwnProperty(key)) {
                headerString += key + ': ' + expectedResult[key] + '\r\n';
            }
        }
        var fakeXHR = {
            status: 200,
            send : function() {
                this.onload();
            },
            open : function() {},
            getAllResponseHeaders : function() {
                return headerString;
            }
        };
        spyOn(window, 'XMLHttpRequest').and.returnValue(fakeXHR);

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(method).toEqual('HEAD');
            Resource._DefaultImplementations.loadWithXhr(url, responseType, method, data, headers, deferred, overrideMimeType);
        });

        var resource = new Resource({url: expectedUrl});
        return resource.head()
            .then(function(result) {
                expect(result.date).toEqual(expectedResult.date);
                expect(result['last-modified']).toEqual(expectedResult['last-modified']);
                expect(result['x-powered-by']).toEqual(expectedResult['x-powered-by']);
                expect(result.etag).toEqual(expectedResult.etag);
                expect(result['content-type']).toEqual(expectedResult['content-type']);
                expect(result['access-control-allow-origin']).toEqual(expectedResult['access-control-allow-origin']);
                expect(result['cache-control']).toEqual(expectedResult['cache-control']);
                expect(result['accept-ranges']).toEqual(expectedResult['accept-ranges']);
                expect(result['access-control-allow-headers']).toEqual(expectedResult['access-control-allow-headers']);
                expect(result['content-length']).toEqual(expectedResult['content-length']);
            });
    });

    it('static options calls correct method', function() {
        var url = 'http://test.com/data';
        spyOn(Resource.prototype, 'options').and.returnValue(when.resolve({}));
        return Resource.options(url)
            .then(function() {
                expect(Resource.prototype.options).toHaveBeenCalled();
            });
    });

    it('options calls correct method', function() {
        var expectedUrl = 'http://test.com/endpoint';
        var expectedResult = {
            'access-control-allow-headers' : 'Origin, X-Requested-With, Content-Type, Accept',
            'access-control-allow-methods' : 'GET, PUT, POST, DELETE, OPTIONS',
            'access-control-allow-origin' : '*',
            'connection' : 'keep-alive',
            'content-length' : '2',
            'content-type' : 'text/plain; charset=utf-8',
            'date' : 'Tue, 13 Feb 2018 03:38:55 GMT',
            'etag' : 'W/"2-nOO9QiTIwXgNtWtBJezz8kv3SLc"',
            'vary' : 'Accept-Encoding',
            'x-powered-vy' : 'Express'
        };
        var headerString = '';
        for (var key in expectedResult) {
            if (expectedResult.hasOwnProperty(key)) {
                headerString += key + ': ' + expectedResult[key] + '\r\n';
            }
        }
        var fakeXHR = {
            status: 200,
            send : function() {
                this.onload();
            },
            open : function() {},
            getAllResponseHeaders : function() {
                return headerString;
            }
        };
        spyOn(window, 'XMLHttpRequest').and.returnValue(fakeXHR);

        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(method).toEqual('OPTIONS');
            Resource._DefaultImplementations.loadWithXhr(url, responseType, method, data, headers, deferred, overrideMimeType);
        });

        var resource = new Resource({url: expectedUrl});
        return resource.options()
            .then(function(result) {
                expect(result.date).toEqual(expectedResult.date);
                expect(result['x-powered-by']).toEqual(expectedResult['x-powered-by']);
                expect(result.etag).toEqual(expectedResult.etag);
                expect(result['content-type']).toEqual(expectedResult['content-type']);
                expect(result['access-control-allow-origin']).toEqual(expectedResult['access-control-allow-origin']);
                expect(result['access-control-allow-methods']).toEqual(expectedResult['access-control-allow-methods']);
                expect(result['access-control-allow-headers']).toEqual(expectedResult['access-control-allow-headers']);
                expect(result['content-length']).toEqual(expectedResult['content-length']);
            });
    });
});
