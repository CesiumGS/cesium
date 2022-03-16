import { DefaultProxy } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { queryToObject } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestErrorEvent } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import createCanvas from "../createCanvas.js";
import { Uri } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";
import dataUriToBuffer from "../dataUriToBuffer.js";

describe("Core/Resource", function () {
  const dataUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2Nk+M/wHwAEBgIA5agATwAAAABJRU5ErkJggg==";
  let supportsImageBitmapOptions;

  beforeAll(function () {
    return Resource.supportsImageBitmapOptions().then(function (result) {
      supportsImageBitmapOptions = result;
    });
  });

  it("Constructor sets correct properties", function () {
    const proxy = new DefaultProxy("/proxy/");
    const request = new Request();
    function retryFunc() {}

    const resource = new Resource({
      url: "http://test.com/tileset",
      queryParameters: {
        key1: "value1",
        key2: "value2",
      },
      templateValues: {
        key3: "value3",
        key4: "value4",
      },
      headers: {
        Accept: "application/test-type",
      },
      proxy: proxy,
      retryCallback: retryFunc,
      retryAttempts: 4,
      request: request,
    });

    expect(resource.getUrlComponent(false, false)).toEqual(
      "http://test.com/tileset"
    );
    expect(resource.getUrlComponent(true, false)).toEqual(
      "http://test.com/tileset?key1=value1&key2=value2"
    );
    expect(resource.getUrlComponent(false, true)).toEqual(
      proxy.getURL("http://test.com/tileset")
    );
    expect(resource.getUrlComponent(true, true)).toEqual(
      proxy.getURL("http://test.com/tileset?key1=value1&key2=value2")
    );
    expect(resource.url).toEqual(
      proxy.getURL("http://test.com/tileset?key1=value1&key2=value2")
    );
    expect(String(resource)).toEqual(
      proxy.getURL("http://test.com/tileset?key1=value1&key2=value2")
    );
    expect(resource.queryParameters).toEqual({
      key1: "value1",
      key2: "value2",
    });
    expect(resource.templateValues).toEqual({
      key3: "value3",
      key4: "value4",
    });
    expect(resource.headers).toEqual({
      Accept: "application/test-type",
    });
    expect(resource.proxy).toBe(proxy);
    expect(resource.retryCallback).toBe(retryFunc);
    expect(resource.retryAttempts).toEqual(4);
    expect(resource._retryCount).toEqual(0);
    expect(resource.request).toBe(request);
  });

  it("Constructor sets correct properties", function () {
    const url = "http://invalid.domain.com/tileset";
    const resource = new Resource(url);
    expect(resource.url).toEqual(url);
    expect(String(resource)).toEqual(url);
    expect(resource.queryParameters).toEqual({});
    expect(resource.templateValues).toEqual({});
    expect(resource.headers).toEqual({});
    expect(resource.proxy).toBeUndefined();
    expect(resource.retryCallback).toBeUndefined();
    expect(resource.retryAttempts).toEqual(0);
    expect(resource.request).toBeDefined();
  });

  it("_makeRequest returns undefined if the request is throttled", function () {
    const oldMaximumRequests = RequestScheduler.maximumRequests;
    RequestScheduler.maximumRequests = 0;

    const resource = new Resource({
      url: "http://example.invalid/testuri",
      request: new Request({
        throttle: true,
      }),
    });
    const promise = resource._makeRequest({ method: "GET" });
    expect(promise).toBeUndefined();

    RequestScheduler.maximumRequests = oldMaximumRequests;
  });

  it("appendForwardSlash appends a /", function () {
    const resource = new Resource({
      url: "http://test.com/tileset",
    });
    expect(resource.url).toEqual("http://test.com/tileset");
    resource.appendForwardSlash();
    expect(resource.url).toEqual("http://test.com/tileset/");
  });

  it("Setting a url with a query string sets queryParameters correctly", function () {
    const resource = new Resource({
      url: "http://test.com/tileset?foo=bar&baz=foo",
    });
    expect(resource.getUrlComponent()).toEqual("http://test.com/tileset");
    expect(resource.getUrlComponent(true)).toEqual(
      "http://test.com/tileset?foo=bar&baz=foo"
    );
    expect(resource.queryParameters).toEqual({
      foo: "bar",
      baz: "foo",
    });
  });

  it("createIfNeeded returns undefined, if parameter is undefined", function () {
    expect(Resource.createIfNeeded()).toBeUndefined();
  });

  it("createIfNeeded returns Resource, if parameter is a Resource", function () {
    const resource = new Resource({
      url: "http://test.com/tileset",
    });
    expect(Resource.createIfNeeded(resource)).toEqual(resource);
  });

  it("createIfNeeded returns Resource, if parameter is a String", function () {
    const resource = Resource.createIfNeeded("http://test.com/tileset");
    expect(resource.url).toEqual("http://test.com/tileset");
  });

  it("multiple values for query parameters are allowed", function () {
    const resource = new Resource(
      "http://test.com/tileset/endpoint?a=1&a=2&b=3&a=4"
    );
    expect(resource.queryParameters.a).toEqual(["1", "2", "4"]);
    expect(resource.queryParameters.b).toEqual("3");

    expect(resource.url).toEqual(
      "http://test.com/tileset/endpoint?a=1&a=2&a=4&b=3"
    );
  });

  it("multiple values for query parameters works with getDerivedResource without preserverQueryParameters", function () {
    const resource = new Resource(
      "http://test.com/tileset/endpoint?a=1&a=2&b=3&a=4"
    );
    expect(resource.queryParameters.a).toEqual(["1", "2", "4"]);
    expect(resource.queryParameters.b).toEqual("3");

    expect(resource.url).toEqual(
      "http://test.com/tileset/endpoint?a=1&a=2&a=4&b=3"
    );

    const derived = resource.getDerivedResource({
      url: "other_endpoint?a=5&b=6&a=7",
    });

    expect(derived.queryParameters.a).toEqual(["5", "7"]);
    expect(derived.queryParameters.b).toEqual("6");

    expect(derived.url).toEqual(
      "http://test.com/tileset/other_endpoint?a=5&a=7&b=6"
    );
  });

  it("multiple values for query parameters works with getDerivedResource with preserveQueryParameters", function () {
    const resource = new Resource(
      "http://test.com/tileset/endpoint?a=1&a=2&b=3&a=4"
    );
    expect(resource.queryParameters.a).toEqual(["1", "2", "4"]);
    expect(resource.queryParameters.b).toEqual("3");

    expect(resource.url).toEqual(
      "http://test.com/tileset/endpoint?a=1&a=2&a=4&b=3"
    );

    const derived = resource.getDerivedResource({
      url: "other_endpoint?a=5&b=6&a=7",
      preserveQueryParameters: true,
    });

    expect(derived.queryParameters.a).toEqual(["5", "7", "1", "2", "4"]);
    expect(derived.queryParameters.b).toEqual(["6", "3"]);

    expect(derived.url).toEqual(
      "http://test.com/tileset/other_endpoint?a=5&a=7&a=1&a=2&a=4&b=6&b=3"
    );
  });

  it("replaces templateValues in the url", function () {
    const resource = new Resource({
      url: "http://test.com/tileset/{foo}/{bar}",
      templateValues: {
        foo: "test1",
        bar: "test2",
      },
    });

    expect(resource.url).toEqual("http://test.com/tileset/test1/test2");
  });

  it("replaces numeric templateValues", function () {
    const resource = new Resource({
      url: "http://test.com/tileset/{0}/{1}",
      templateValues: {
        0: "test1",
        1: "test2",
      },
    });

    expect(resource.url).toEqual("http://test.com/tileset/test1/test2");
  });

  it("leaves templateValues unchanged that are not provided", function () {
    const resource = new Resource({
      url: "http://test.com/tileset/{foo}/{bar}",
    });

    expect(resource.url).toEqual("http://test.com/tileset/{foo}/{bar}");
  });

  it("url encodes replacement templateValues in the url", function () {
    const resource = new Resource({
      url: "http://test.com/tileset/{foo}/{bar}",
      templateValues: {
        foo: "a/b",
        bar: "x$y#",
      },
    });

    expect(resource.url).toEqual("http://test.com/tileset/a%2Fb/x%24y%23");
  });

  it("getDerivedResource sets correct properties", function () {
    const proxy = new DefaultProxy("/proxy/");
    const request = new Request();
    function retryFunc() {}

    const parent = new Resource({
      url: "http://test.com/tileset?key=value",
      queryParameters: {
        foo: "bar",
      },
      templateValues: {
        key5: "value5",
        key6: "value6",
      },
    });
    parent.appendForwardSlash();

    const resource = parent.getDerivedResource({
      url: "tileset.json",
      queryParameters: {
        key1: "value1",
        key2: "value2",
      },
      templateValues: {
        key3: "value3",
        key4: "value4",
      },
      headers: {
        Accept: "application/test-type",
      },
      proxy: proxy,
      retryCallback: retryFunc,
      retryAttempts: 4,
      request: request,
    });

    expect(resource.getUrlComponent(false, false)).toEqual(
      "http://test.com/tileset/tileset.json"
    );
    expect(resource.getUrlComponent(true, false)).toEqual(
      "http://test.com/tileset/tileset.json?key1=value1&key2=value2&key=value&foo=bar"
    );
    expect(resource.getUrlComponent(false, true)).toEqual(
      proxy.getURL("http://test.com/tileset/tileset.json")
    );
    expect(resource.getUrlComponent(true, true)).toEqual(
      proxy.getURL(
        "http://test.com/tileset/tileset.json?key1=value1&key2=value2&key=value&foo=bar"
      )
    );
    expect(resource.url).toEqual(
      proxy.getURL(
        "http://test.com/tileset/tileset.json?key1=value1&key2=value2&key=value&foo=bar"
      )
    );
    expect(resource.queryParameters).toEqual({
      foo: "bar",
      key: "value",
      key1: "value1",
      key2: "value2",
    });
    expect(resource.templateValues).toEqual({
      key5: "value5",
      key6: "value6",
      key3: "value3",
      key4: "value4",
    });
    expect(resource.headers).toEqual({
      Accept: "application/test-type",
    });
    expect(resource.proxy).toBe(proxy);
    expect(resource.retryCallback).toBe(retryFunc);
    expect(resource.retryAttempts).toEqual(4);
    expect(resource._retryCount).toEqual(0);
    expect(resource.request).toBe(request);
  });

  it("getDerivedResource works with directory parent resource", function () {
    const parent = new Resource({
      url: "http://test.com/tileset/",
    });

    expect(parent.url).toEqual("http://test.com/tileset/");

    const resource = parent.getDerivedResource({
      url: "tileset.json",
    });

    expect(resource.url).toEqual("http://test.com/tileset/tileset.json");
  });

  it("getDerivedResource works with file parent resource", function () {
    const parent = new Resource({
      url: "http://test.com/tileset/tileset.json",
    });

    expect(parent.url).toEqual("http://test.com/tileset/tileset.json");

    const resource = parent.getDerivedResource({
      url: "0/0/0.b3dm",
    });

    expect(resource.url).toEqual("http://test.com/tileset/0/0/0.b3dm");
  });

  it("getDerivedResource works with only template values", function () {
    const parent = new Resource({
      url: "http://test.com/terrain/{z}/{x}/{y}.terrain",
    });

    expect(parent.url).toEqual("http://test.com/terrain/{z}/{x}/{y}.terrain");

    const resource = parent.getDerivedResource({
      templateValues: {
        x: 1,
        y: 2,
        z: 0,
      },
    });

    expect(resource.url).toEqual("http://test.com/terrain/0/1/2.terrain");
  });

  it("getDerivedResource works with only query parameters", function () {
    const parent = new Resource({
      url: "http://test.com/terrain",
    });

    expect(parent.url).toEqual("http://test.com/terrain");

    const resource = parent.getDerivedResource({
      queryParameters: {
        x: 1,
        y: 2,
        z: 0,
      },
    });

    expect(resource.url).toEqual("http://test.com/terrain?x=1&y=2&z=0");
  });

  it("setQueryParameters with useAsDefault set to true", function () {
    const resource = new Resource({
      url: "http://test.com/terrain",
      queryParameters: {
        x: 1,
        y: 2,
      },
    });

    expect(resource.queryParameters).toEqual({
      x: 1,
      y: 2,
    });

    resource.setQueryParameters(
      {
        x: 3,
        y: 4,
        z: 0,
      },
      true
    );

    expect(resource.queryParameters).toEqual({
      x: 1,
      y: 2,
      z: 0,
    });
  });

  it("setQueryParameters with useAsDefault set to false", function () {
    const resource = new Resource({
      url: "http://test.com/terrain",
      queryParameters: {
        x: 1,
        y: 2,
      },
    });

    expect(resource.queryParameters).toEqual({
      x: 1,
      y: 2,
    });

    resource.setQueryParameters(
      {
        x: 3,
        y: 4,
        z: 0,
      },
      false
    );

    expect(resource.queryParameters).toEqual({
      x: 3,
      y: 4,
      z: 0,
    });
  });

  it("appendQueryParameters works with non-arrays", function () {
    const resource = new Resource({
      url: "http://test.com/terrain",
      queryParameters: {
        x: 1,
        y: 2,
      },
    });

    expect(resource.queryParameters).toEqual({
      x: 1,
      y: 2,
    });

    resource.appendQueryParameters({
      x: 3,
      y: 4,
      z: 0,
    });

    expect(resource.queryParameters).toEqual({
      x: [3, 1],
      y: [4, 2],
      z: 0,
    });
  });

  it("appendQueryParameters works with arrays/non-arrays", function () {
    const resource = new Resource({
      url: "http://test.com/terrain",
      queryParameters: {
        x: [1, 2],
        y: 2,
        z: [-1, -2],
      },
    });

    expect(resource.queryParameters).toEqual({
      x: [1, 2],
      y: 2,
      z: [-1, -2],
    });

    resource.appendQueryParameters({
      x: 3,
      y: [4, 5],
      z: [-3, -4],
    });

    expect(resource.queryParameters).toEqual({
      x: [3, 1, 2],
      y: [4, 5, 2],
      z: [-3, -4, -1, -2],
    });
  });

  it("setTemplateValues with useAsDefault set to true", function () {
    const resource = new Resource({
      url: "http://test.com/terrain/{z}/{x}/{y}.terrain",
      templateValues: {
        x: 1,
        y: 2,
        map: "my map",
      },
    });

    expect(resource.templateValues).toEqual({
      x: 1,
      y: 2,
      map: "my map",
    });

    resource.setTemplateValues(
      {
        x: 3,
        y: 4,
        z: 0,
        style: "my style",
      },
      true
    );

    expect(resource.templateValues).toEqual({
      x: 1,
      y: 2,
      map: "my map",
      z: 0,
      style: "my style",
    });
  });

  it("setTemplateValues with useAsDefault set to false", function () {
    const resource = new Resource({
      url: "http://test.com/terrain/{z}/{x}/{y}.terrain",
      templateValues: {
        x: 1,
        y: 2,
        map: "my map",
      },
    });

    expect(resource.templateValues).toEqual({
      x: 1,
      y: 2,
      map: "my map",
    });

    resource.setTemplateValues(
      {
        x: 3,
        y: 4,
        z: 0,
        style: "my style",
      },
      false
    );

    expect(resource.templateValues).toEqual({
      x: 3,
      y: 4,
      map: "my map",
      z: 0,
      style: "my style",
    });
  });

  it("retryOnFail doesn't exceed retryAttempts", function () {
    const cb = jasmine.createSpy("retry").and.returnValue(true);
    const resource = new Resource({
      url: "http://test.com/terrain",
      retryCallback: cb,
      retryAttempts: 3,
    });

    const promises = [];
    for (let i = 0; i < 6; ++i) {
      promises.push(resource.retryOnError());
    }

    when.all(promises).then(function (result) {
      expect(result).toEqual([true, true, true, false, false, false]);
      expect(cb.calls.count()).toEqual(3);
      expect(resource._retryCount).toEqual(3);
    });
  });

  it("retryOnFail returns value from callback", function () {
    let result = true;
    const cb = jasmine.createSpy("retry").and.callFake(function () {
      result = !result;
      return result;
    });

    const resource = new Resource({
      url: "http://test.com/terrain",
      retryCallback: cb,
      retryAttempts: 4,
    });

    const promises = [];
    for (let i = 0; i < 6; ++i) {
      promises.push(resource.retryOnError());
    }

    when.all(promises).then(function (result) {
      expect(result).toEqual([false, true, false, true, false, false]);
      expect(cb.calls.count()).toEqual(4);
      expect(resource._retryCount).toEqual(4);
    });
  });

  it("isDataUri returns correct values", function () {
    const dataResource = new Resource({
      url: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3",
    });

    expect(dataResource.isDataUri).toBe(true);

    const resource = new Resource({
      url: "http://invalid.uri/tileset",
    });

    expect(resource.isDataUri).toBe(false);
  });

  it("isBlobUri returns correct values", function () {
    const dataResource = new Resource({
      url: "blob:d3958f5c-0777-0845-9dcf-2cb28783acaf",
    });

    expect(dataResource.isBlobUri).toBe(true);

    const resource = new Resource({
      url: "http://invalid.uri/tileset",
    });

    expect(resource.isBlobUri).toBe(false);
  });

  it("post calls with correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResponseType = "json";
    const expectedData = {
      stuff: "myStuff",
    };
    const expectedHeaders = {
      "X-My-Header": "My-Value",
    };
    const expectedResult = {
      status: "success",
    };
    const expectedMimeType = "application/test-data";
    const resource = new Resource({
      url: expectedUrl,
      headers: expectedHeaders,
    });

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(responseType).toEqual(expectedResponseType);
      expect(method).toEqual("POST");
      expect(data).toEqual(expectedData);
      expect(headers["X-My-Header"]).toEqual("My-Value");
      expect(headers["X-My-Other-Header"]).toEqual("My-Other-Value");
      expect(overrideMimeType).toBe(expectedMimeType);
      deferred.resolve(expectedResult);
    });

    return resource
      .post(expectedData, {
        responseType: expectedResponseType,
        headers: {
          "X-My-Other-Header": "My-Other-Value",
        },
        overrideMimeType: expectedMimeType,
      })
      .then(function (result) {
        expect(result).toEqual(expectedResult);
      });
  });

  it("static post calls with correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResponseType = "json";
    const expectedData = {
      stuff: "myStuff",
    };
    const expectedHeaders = {
      "X-My-Header": "My-Value",
    };
    const expectedResult = {
      status: "success",
    };
    const expectedMimeType = "application/test-data";

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(responseType).toEqual(expectedResponseType);
      expect(method).toEqual("POST");
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
      overrideMimeType: expectedMimeType,
    }).then(function (result) {
      expect(result).toEqual(expectedResult);
    });
  });

  it("put calls with correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResponseType = "json";
    const expectedData = {
      stuff: "myStuff",
    };
    const expectedHeaders = {
      "X-My-Header": "My-Value",
    };
    const expectedResult = {
      status: "success",
    };
    const expectedMimeType = "application/test-data";
    const resource = new Resource({
      url: expectedUrl,
      headers: expectedHeaders,
    });

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(responseType).toEqual(expectedResponseType);
      expect(method).toEqual("PUT");
      expect(data).toEqual(expectedData);
      expect(headers["X-My-Header"]).toEqual("My-Value");
      expect(headers["X-My-Other-Header"]).toEqual("My-Other-Value");
      expect(overrideMimeType).toBe(expectedMimeType);
      deferred.resolve(expectedResult);
    });

    return resource
      .put(expectedData, {
        responseType: expectedResponseType,
        headers: {
          "X-My-Other-Header": "My-Other-Value",
        },
        overrideMimeType: expectedMimeType,
      })
      .then(function (result) {
        expect(result).toEqual(expectedResult);
      });
  });

  it("static put calls with correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResponseType = "json";
    const expectedData = {
      stuff: "myStuff",
    };
    const expectedHeaders = {
      "X-My-Header": "My-Value",
    };
    const expectedResult = {
      status: "success",
    };
    const expectedMimeType = "application/test-data";

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(responseType).toEqual(expectedResponseType);
      expect(method).toEqual("PUT");
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
      overrideMimeType: expectedMimeType,
    }).then(function (result) {
      expect(result).toEqual(expectedResult);
    });
  });

  it("patch calls with correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResponseType = "json";
    const expectedData = {
      stuff: "myStuff",
    };
    const expectedHeaders = {
      "X-My-Header": "My-Value",
    };
    const expectedResult = {
      status: "success",
    };
    const expectedMimeType = "application/test-data";
    const resource = new Resource({
      url: expectedUrl,
      headers: expectedHeaders,
    });

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(responseType).toEqual(expectedResponseType);
      expect(method).toEqual("PATCH");
      expect(data).toEqual(expectedData);
      expect(headers["X-My-Header"]).toEqual("My-Value");
      expect(headers["X-My-Other-Header"]).toEqual("My-Other-Value");
      expect(overrideMimeType).toBe(expectedMimeType);
      deferred.resolve(expectedResult);
    });

    return resource
      .patch(expectedData, {
        responseType: expectedResponseType,
        headers: {
          "X-My-Other-Header": "My-Other-Value",
        },
        overrideMimeType: expectedMimeType,
      })
      .then(function (result) {
        expect(result).toEqual(expectedResult);
      });
  });

  it("static patch calls with correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResponseType = "json";
    const expectedData = {
      stuff: "myStuff",
    };
    const expectedHeaders = {
      "X-My-Header": "My-Value",
    };
    const expectedResult = {
      status: "success",
    };
    const expectedMimeType = "application/test-data";

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(responseType).toEqual(expectedResponseType);
      expect(method).toEqual("PATCH");
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
      overrideMimeType: expectedMimeType,
    }).then(function (result) {
      expect(result).toEqual(expectedResult);
    });
  });

  it("static fetchArrayBuffer calls correct method", function () {
    const url = "http://test.com/data";
    const expectedResult = when.resolve();
    spyOn(Resource.prototype, "fetchArrayBuffer").and.returnValue(
      expectedResult
    );
    const result = Resource.fetchArrayBuffer(url);
    expect(result).toBe(expectedResult);
    return Resource.fetchArrayBuffer(url).then(function () {
      expect(Resource.prototype.fetchArrayBuffer).toHaveBeenCalled();
    });
  });

  it("fetchArrayBuffer calls fetch with expected parameters", function () {
    const url = "http://test.com/data";
    const expectedResult = when.resolve();
    spyOn(Resource.prototype, "fetch").and.returnValue(expectedResult);
    const result = Resource.fetchArrayBuffer(url);
    expect(result).toBe(expectedResult);
    return result.then(function () {
      expect(Resource.prototype.fetch).toHaveBeenCalledWith({
        responseType: "arraybuffer",
      });
    });
  });

  it("static fetchBlob calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "fetchBlob").and.returnValue(when.resolve());
    return Resource.fetchBlob(url).then(function () {
      expect(Resource.prototype.fetchBlob).toHaveBeenCalled();
    });
  });

  it("fetchBlob calls fetch with expected parameters", function () {
    const url = "http://test.com/data";
    const expectedResult = when.resolve();
    spyOn(Resource.prototype, "fetch").and.returnValue(expectedResult);
    const result = Resource.fetchBlob(url);
    expect(result).toBe(expectedResult);
    return result.then(function () {
      expect(Resource.prototype.fetch).toHaveBeenCalledWith({
        responseType: "blob",
      });
    });
  });

  it("fetchArrayBuffer calls fetch with expected parameters", function () {
    const url = "http://test.com/data";
    const expectedResult = when.resolve();
    spyOn(Resource.prototype, "fetch").and.returnValue(expectedResult);
    const result = Resource.fetchArrayBuffer(url);
    expect(result).toBe(expectedResult);
    return result.then(function () {
      expect(Resource.prototype.fetch).toHaveBeenCalledWith({
        responseType: "arraybuffer",
      });
    });
  });

  it("static fetchImage calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "fetchImage").and.returnValue(when.resolve());
    return Resource.fetchImage(url).then(function () {
      expect(Resource.prototype.fetchImage).toHaveBeenCalled();
    });
  });

  it("static fetchText calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "fetchText").and.returnValue(when.resolve());
    return Resource.fetchText(url).then(function () {
      expect(Resource.prototype.fetchText).toHaveBeenCalled();
    });
  });

  it("fetchText calls fetch with expected parameters", function () {
    const url = "http://test.com/data";
    const expectedResult = when.resolve();
    spyOn(Resource.prototype, "fetch").and.returnValue(expectedResult);
    const result = Resource.fetchText(url);
    expect(result).toBe(expectedResult);
    return result.then(function () {
      expect(Resource.prototype.fetch).toHaveBeenCalledWith({
        responseType: "text",
      });
    });
  });

  it("static fetchJson calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "fetchJson").and.returnValue(when.resolve());
    return Resource.fetchJson(url).then(function () {
      expect(Resource.prototype.fetchJson).toHaveBeenCalled();
    });
  });

  it("fetchJson calls fetch with expected parameters and parses result", function () {
    const expectedResult = { x: 123 };
    spyOn(Resource.prototype, "fetch").and.returnValue(
      when.resolve(JSON.stringify(expectedResult))
    );
    return Resource.fetchJson("url").then(function (result) {
      expect(result).toEqual(expectedResult);
      expect(Resource.prototype.fetch).toHaveBeenCalledWith({
        responseType: "text",
        headers: {
          Accept: "application/json,*/*;q=0.01",
        },
      });
    });
  });

  it("static fetchXML calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "fetchXML").and.returnValue(when.resolve());
    return Resource.fetchXML(url).then(function () {
      expect(Resource.prototype.fetchXML).toHaveBeenCalled();
    });
  });

  it("fetchXML calls fetch with expected parameters", function () {
    const url = "http://test.com/data";
    const expectedResult = when.resolve();
    spyOn(Resource.prototype, "fetch").and.returnValue(expectedResult);
    const result = Resource.fetchXML(url);
    expect(result).toBe(expectedResult);
    return result.then(function () {
      expect(Resource.prototype.fetch).toHaveBeenCalledWith({
        responseType: "document",
        overrideMimeType: "text/xml",
      });
    });
  });

  it("static fetchJsonp calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "fetchJsonp").and.returnValue(when.resolve());
    return Resource.fetchJsonp(url).then(function () {
      expect(Resource.prototype.fetchJsonp).toHaveBeenCalled();
    });
  });

  it("static fetch calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "fetch").and.returnValue(when.resolve());
    return Resource.fetch(url).then(function () {
      expect(Resource.prototype.fetch).toHaveBeenCalled();
    });
  });

  it("fetch calls correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResult = {
      status: "success",
    };

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(method).toEqual("GET");
      deferred.resolve(expectedResult);
    });

    const resource = new Resource({ url: expectedUrl });
    return resource.fetch().then(function (result) {
      expect(result).toEqual(expectedResult);
    });
  });

  it("static delete calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "delete").and.returnValue(when.resolve());
    return Resource.delete(url).then(function () {
      expect(Resource.prototype.delete).toHaveBeenCalled();
    });
  });

  it("delete calls correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResult = {
      status: "success",
    };

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(method).toEqual("DELETE");
      deferred.resolve(expectedResult);
    });

    const resource = new Resource({ url: expectedUrl });
    return resource.delete().then(function (result) {
      expect(result).toEqual(expectedResult);
    });
  });

  it("static head calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "head").and.returnValue(when.resolve({}));
    return Resource.head(url).then(function () {
      expect(Resource.prototype.head).toHaveBeenCalled();
    });
  });

  it("head calls correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResult = {
      "accept-ranges": "bytes",
      "access-control-allow-headers":
        "Origin, X-Requested-With, Content-Type, Accept",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=0",
      connection: "keep-alive",
      "content-length": "883",
      "content-type": "image/png",
      date: "Tue, 13 Feb 2018 03:38:55 GMT",
      etag: 'W/"373-15e34d146a1"',
      vary: "Accept-Encoding",
      "x-powered-vy": "Express",
    };
    let headerString = "";
    for (const key in expectedResult) {
      if (expectedResult.hasOwnProperty(key)) {
        headerString += `${key}: ${expectedResult[key]}\r\n`;
      }
    }
    const fakeXHR = {
      status: 200,
      send: function () {
        this.onload();
      },
      open: function () {},
      getAllResponseHeaders: function () {
        return headerString;
      },
    };
    spyOn(window, "XMLHttpRequest").and.returnValue(fakeXHR);

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(method).toEqual("HEAD");
      Resource._DefaultImplementations.loadWithXhr(
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      );
    });

    const resource = new Resource({ url: expectedUrl });
    return resource.head().then(function (result) {
      expect(result.date).toEqual(expectedResult.date);
      expect(result["last-modified"]).toEqual(expectedResult["last-modified"]);
      expect(result["x-powered-by"]).toEqual(expectedResult["x-powered-by"]);
      expect(result.etag).toEqual(expectedResult.etag);
      expect(result["content-type"]).toEqual(expectedResult["content-type"]);
      expect(result["access-control-allow-origin"]).toEqual(
        expectedResult["access-control-allow-origin"]
      );
      expect(result["cache-control"]).toEqual(expectedResult["cache-control"]);
      expect(result["accept-ranges"]).toEqual(expectedResult["accept-ranges"]);
      expect(result["access-control-allow-headers"]).toEqual(
        expectedResult["access-control-allow-headers"]
      );
      expect(result["content-length"]).toEqual(
        expectedResult["content-length"]
      );
    });
  });

  it("static options calls correct method", function () {
    const url = "http://test.com/data";
    spyOn(Resource.prototype, "options").and.returnValue(when.resolve({}));
    return Resource.options(url).then(function () {
      expect(Resource.prototype.options).toHaveBeenCalled();
    });
  });

  it("options calls correct method", function () {
    const expectedUrl = "http://test.com/endpoint";
    const expectedResult = {
      "access-control-allow-headers":
        "Origin, X-Requested-With, Content-Type, Accept",
      "access-control-allow-methods": "GET, PUT, POST, DELETE, OPTIONS",
      "access-control-allow-origin": "*",
      connection: "keep-alive",
      "content-length": "2",
      "content-type": "text/plain; charset=utf-8",
      date: "Tue, 13 Feb 2018 03:38:55 GMT",
      etag: 'W/"2-nOO9QiTIwXgNtWtBJezz8kv3SLc"',
      vary: "Accept-Encoding",
      "x-powered-vy": "Express",
    };
    let headerString = "";
    for (const key in expectedResult) {
      if (expectedResult.hasOwnProperty(key)) {
        headerString += `${key}: ${expectedResult[key]}\r\n`;
      }
    }
    const fakeXHR = {
      status: 200,
      send: function () {
        this.onload();
      },
      open: function () {},
      getAllResponseHeaders: function () {
        return headerString;
      },
    };
    spyOn(window, "XMLHttpRequest").and.returnValue(fakeXHR);

    spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      expect(url).toEqual(expectedUrl);
      expect(method).toEqual("OPTIONS");
      Resource._DefaultImplementations.loadWithXhr(
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      );
    });

    const resource = new Resource({ url: expectedUrl });
    return resource.options().then(function (result) {
      expect(result.date).toEqual(expectedResult.date);
      expect(result["x-powered-by"]).toEqual(expectedResult["x-powered-by"]);
      expect(result.etag).toEqual(expectedResult.etag);
      expect(result["content-type"]).toEqual(expectedResult["content-type"]);
      expect(result["access-control-allow-origin"]).toEqual(
        expectedResult["access-control-allow-origin"]
      );
      expect(result["access-control-allow-methods"]).toEqual(
        expectedResult["access-control-allow-methods"]
      );
      expect(result["access-control-allow-headers"]).toEqual(
        expectedResult["access-control-allow-headers"]
      );
      expect(result["content-length"]).toEqual(
        expectedResult["content-length"]
      );
    });
  });

  it("can load an SVG", function () {
    return Resource.fetchImage("./Data/Images/Red16x16.svg").then(function (
      loadedImage
    ) {
      expect(loadedImage.width).toEqual(16);
      expect(loadedImage.height).toEqual(16);
    });
  });

  it("can load a dimensionless SVG", function () {
    return Resource.fetchImage("./Data/Images/Blue.svg").then(function (
      loadedImage
    ) {
      expect(loadedImage.width).toBeGreaterThan(0);
      expect(loadedImage.height).toBeGreaterThan(0);
    });
  });

  it("can load an image preferring blob", function () {
    return Resource.fetchImage("./Data/Images/Green.png", true).then(function (
      loadedImage
    ) {
      expect(loadedImage.width).toEqual(1);
      expect(loadedImage.height).toEqual(1);
    });
  });

  it("can load an image from a data URI", function () {
    return Resource.fetchImage(dataUri).then(function (loadedImage) {
      expect(loadedImage.width).toEqual(1);
      expect(loadedImage.height).toEqual(1);
    });
  });

  describe("fetchImage with ImageBitmap", function () {
    let canvas;
    beforeAll(function () {
      canvas = createCanvas(1, 2);
    });

    afterAll(function () {
      document.body.removeChild(canvas);
    });

    function getColorAtPixel(image, x, y) {
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, image.width, image.height);
      const imageData = context.getImageData(0, 0, 1, 1);
      return [
        imageData.data[0],
        imageData.data[1],
        imageData.data[2],
        imageData.data[3],
      ];
    }

    it("can call supportsImageBitmapOptions", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.supportsImageBitmapOptions().then(function (result) {
        expect(typeof result).toEqual("boolean");
      });
    });

    it("can load and decode an image", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "./Data/Images/Green.png",
        preferImageBitmap: true,
      }).then(function (loadedImage) {
        expect(loadedImage.width).toEqual(1);
        expect(loadedImage.height).toEqual(1);
        expect(loadedImage).toBeInstanceOf(ImageBitmap);
      });
    });

    it("correctly flips image when ImageBitmapOptions are supported", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "./Data/Images/BlueOverRed.png",
        flipY: true,
        preferImageBitmap: true,
      }).then(function (loadedImage) {
        expect(getColorAtPixel(loadedImage, 0, 0)).toEqual([255, 0, 0, 255]);
      });
    });

    it("correctly loads image without flip when ImageBitmapOptions are supported", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "./Data/Images/BlueOverRed.png",
        flipY: false,
        preferImageBitmap: true,
      }).then(function (loadedImage) {
        expect(getColorAtPixel(loadedImage, 0, 0)).toEqual([0, 0, 255, 255]);
      });
    });

    it("correctly ignores gamma color profile when ImageBitmapOptions are supported", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "./Data/Images/Gamma.png",
        flipY: false,
        skipColorSpaceConversion: true,
        preferImageBitmap: true,
      }).then(function (loadedImage) {
        expect(getColorAtPixel(loadedImage, 0, 0)).toEqual([0, 136, 0, 255]);
      });
    });

    it("correctly allows gamma color profile when ImageBitmapOptions are supported", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "./Data/Images/Gamma.png",
        flipY: false,
        skipColorSpaceConversion: false,
        preferImageBitmap: true,
      }).then(function (loadedImage) {
        expect(getColorAtPixel(loadedImage, 0, 0)).toEqual([0, 59, 0, 255]);
      });
    });

    it("correctly ignores custom color profile when ImageBitmapOptions are supported", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "./Data/Images/CustomColorProfile.png",
        flipY: false,
        skipColorSpaceConversion: true,
        preferImageBitmap: true,
      }).then(function (loadedImage) {
        expect(getColorAtPixel(loadedImage, 0, 0)).toEqual([0, 136, 0, 255]);
      });
    });

    it("correctly allows custom color profile when ImageBitmapOptions are supported", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "./Data/Images/CustomColorProfile.png",
        flipY: false,
        skipColorSpaceConversion: false,
        preferImageBitmap: true,
      }).then(function (loadedImage) {
        expect(getColorAtPixel(loadedImage, 0, 0)).toEqual([193, 0, 0, 255]);
      });
    });

    it("does not use ImageBitmap when ImageBitmapOptions are not supported", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      spyOn(Resource, "supportsImageBitmapOptions").and.returnValue(
        when.resolve(false)
      );
      spyOn(window, "createImageBitmap").and.callThrough();

      return Resource.fetchImage({
        url: "./Data/Images/Green.png",
        preferImageBitmap: true,
      }).then(function () {
        expect(window.createImageBitmap).not.toHaveBeenCalledWith();
      });
    });

    it("rejects the promise when the image errors", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      return Resource.fetchImage({
        url: "http://example.invalid/testuri.png",
        preferImageBitmap: true,
      })
        .then(function () {
          fail("expected promise to reject");
        })
        .otherwise(function (error) {
          expect(error).toBeInstanceOf(RequestErrorEvent);
        });
    });

    it("rejects the promise with extra error information when image errors and options.preferBlob is true", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      // Force the fetching of a bad blob that is not an image to trigger the error
      spyOn(Resource.prototype, "fetch").and.returnValue(
        when.resolve(new Blob([new Uint8Array([])], { type: "text/plain" }))
      );

      return Resource.fetchImage({
        url: "http://example.invalid/testuri.png",
        preferImageBitmap: true,
        preferBlob: true,
      })
        .then(function () {
          fail("expected promise to reject");
        })
        .otherwise(function (error) {
          expect(error.blob).toBeInstanceOf(Blob);
        });
    });
  });

  describe("fetchImage without ImageBitmap", function () {
    beforeAll(function () {
      // Force it to use the Image constructor since these specs all test
      // specific functionality of this code path. For example, the crossOrigin
      // restriction does not apply to images loaded with ImageBitmap.
      spyOn(Resource, "supportsImageBitmapOptions").and.returnValue(
        when.resolve(false)
      );
    });

    it("can load an image", function () {
      return Resource.fetchImage("./Data/Images/Green.png").then(function (
        loadedImage
      ) {
        expect(loadedImage.width).toEqual(1);
        expect(loadedImage.height).toEqual(1);
      });
    });

    it("sets the crossOrigin property for cross-origin images", function () {
      const fakeImage = {};
      const imageConstructorSpy = spyOn(window, "Image").and.returnValue(
        fakeImage
      );

      Resource.fetchImage("http://example.invalid/someImage.png");
      expect(imageConstructorSpy).toHaveBeenCalled();
      expect(fakeImage.crossOrigin).toEqual("");
    });

    it("does not set the crossOrigin property for non-cross-origin images", function () {
      const fakeImage = {};
      const imageConstructorSpy = spyOn(window, "Image").and.returnValue(
        fakeImage
      );

      Resource.fetchImage("./someImage.png");
      expect(imageConstructorSpy).toHaveBeenCalled();
      expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it("does not set the crossOrigin property for data URIs", function () {
      const fakeImage = {};
      const imageConstructorSpy = spyOn(window, "Image").and.returnValue(
        fakeImage
      );

      Resource.fetchImage(dataUri);
      expect(imageConstructorSpy).toHaveBeenCalled();
      expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it("resolves the promise when the image loads", function () {
      const fakeImage = {};
      spyOn(window, "Image").and.returnValue(fakeImage);

      let success = false;
      let failure = false;
      let loadedImage;

      when(
        Resource.fetchImage(dataUri),
        function (image) {
          success = true;
          loadedImage = image;
        },
        function () {
          failure = true;
        }
      );

      // neither callback has fired yet
      expect(success).toEqual(false);
      expect(failure).toEqual(false);

      fakeImage.onload();
      expect(success).toEqual(true);
      expect(failure).toEqual(false);
      expect(loadedImage).toBe(fakeImage);
    });

    it("rejects the promise when the image errors", function () {
      const fakeImage = {};
      spyOn(window, "Image").and.returnValue(fakeImage);

      let success = false;
      let failure = false;
      let loadedImage;

      when(
        Resource.fetchImage(dataUri),
        function (image) {
          success = true;
          loadedImage = image;
        },
        function () {
          failure = true;
        }
      );

      // neither callback has fired yet
      expect(success).toEqual(false);
      expect(failure).toEqual(false);

      fakeImage.onerror();
      expect(success).toEqual(false);
      expect(failure).toEqual(true);
      expect(loadedImage).toBeUndefined();
    });

    it("Calls loadWithXhr with blob response type if headers is set", function () {
      const expectedUrl = "http://example.invalid/testuri.png";
      const expectedHeaders = {
        "X-my-header": "my-value",
      };
      spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        expect(url).toEqual(expectedUrl);
        expect(headers).toEqual(expectedHeaders);
        expect(responseType).toEqual("blob");

        const binary = dataUriToBuffer(dataUri);

        deferred.resolve(new Blob([binary], { type: "image/png" }));
      });

      const testResource = new Resource({
        url: expectedUrl,
        headers: expectedHeaders,
      });
      const promise = testResource.fetchImage();
      expect(promise).toBeDefined();

      return promise.then(function (image) {
        expect(image).toBeDefined();
      });
    });

    it("Doesn't call loadWithXhr with blob response type if headers is set but is a data URI", function () {
      spyOn(Resource._Implementations, "loadWithXhr").and.callFake(function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        deferred.reject("this shouldn't happen");
      });

      spyOn(Resource._Implementations, "createImage")
        .and.callFake(function (url, crossOrigin, deferred) {
          expect(url).toEqual(dataUri);
        })
        .and.callThrough();

      const testResource = new Resource({
        url: dataUri,
        headers: {
          "X-my-header": "my-value",
        },
      });
      const promise = testResource.fetchImage();
      expect(promise).toBeDefined();

      return promise.then(function (image) {
        expect(image).toBeDefined();
      });
    });

    describe("retries when Resource has the callback set", function () {
      it("rejects after too many retries", function () {
        const fakeImage = {};
        spyOn(window, "Image").and.returnValue(fakeImage);

        const cb = jasmine.createSpy("retry").and.returnValue(true);

        const resource = new Resource({
          url: "http://example.invalid/image.png",
          retryCallback: cb,
          retryAttempts: 1,
        });

        const promise = resource.fetchImage();

        expect(promise).toBeDefined();

        let success = false;
        let failure = false;
        promise
          .then(function () {
            success = true;
          })
          .otherwise(function () {
            failure = true;
          });

        expect(success).toBe(false);
        expect(failure).toBe(false);

        fakeImage.onerror("some error"); // This should retry
        expect(success).toBe(false);
        expect(failure).toBe(false);

        expect(cb.calls.count()).toEqual(1);
        const receivedResource = cb.calls.argsFor(0)[0];
        expect(receivedResource.url).toEqual(resource.url);
        expect(receivedResource._retryCount).toEqual(1);
        expect(cb.calls.argsFor(0)[1]).toEqual("some error");

        fakeImage.onerror(); // This fails because we only retry once
        expect(success).toBe(false);
        expect(failure).toBe(true);
      });

      it("rejects after callback returns false", function () {
        const fakeImage = {};
        spyOn(window, "Image").and.returnValue(fakeImage);

        const cb = jasmine.createSpy("retry").and.returnValue(false);

        const resource = new Resource({
          url: "http://example.invalid/image.png",
          retryCallback: cb,
          retryAttempts: 2,
        });

        const promise = resource.fetchImage();

        expect(promise).toBeDefined();

        let success = false;
        let failure = false;
        promise
          .then(function (value) {
            success = true;
          })
          .otherwise(function (error) {
            failure = true;
          });

        expect(success).toBe(false);
        expect(failure).toBe(false);

        fakeImage.onerror("some error"); // This fails because the callback returns false
        expect(success).toBe(false);
        expect(failure).toBe(true);

        expect(cb.calls.count()).toEqual(1);
        const receivedResource = cb.calls.argsFor(0)[0];
        expect(receivedResource.url).toEqual(resource.url);
        expect(receivedResource._retryCount).toEqual(1);
        expect(cb.calls.argsFor(0)[1]).toEqual("some error");
      });

      it("resolves after retry", function () {
        const fakeImage = {};
        spyOn(window, "Image").and.returnValue(fakeImage);

        const cb = jasmine.createSpy("retry").and.returnValue(true);

        const resource = new Resource({
          url: "http://example.invalid/image.png",
          retryCallback: cb,
          retryAttempts: 1,
        });

        const promise = resource.fetchImage();

        expect(promise).toBeDefined();

        let success = false;
        let failure = false;
        promise
          .then(function (value) {
            success = true;
          })
          .otherwise(function (error) {
            failure = true;
          });

        expect(success).toBe(false);
        expect(failure).toBe(false);

        fakeImage.onerror("some error"); // This should retry
        expect(success).toBe(false);
        expect(failure).toBe(false);

        expect(cb.calls.count()).toEqual(1);
        const receivedResource = cb.calls.argsFor(0)[0];
        expect(receivedResource.url).toEqual(resource.url);
        expect(receivedResource._retryCount).toEqual(1);
        expect(cb.calls.argsFor(0)[1]).toEqual("some error");

        fakeImage.onload();
        expect(success).toBe(true);
        expect(failure).toBe(false);
      });
    });
  });

  describe("loadWithXhr", function () {
    const loadWithXhr = function (options) {
      const resource = new Resource(options);
      return resource._makeRequest({
        responseType: options.responseType,
        overrideMimeType: options.overrideMimeType,
        method: defaultValue(options.method, "GET"),
        data: options.data,
      });
    };

    describe("data URI loading", function () {
      it("can load URI escaped text with default response type", function () {
        return loadWithXhr({
          url: "data:,Hello%2C%20World!",
        }).then(function (result) {
          expect(result).toEqual("Hello, World!");
        });
      });

      it("can load URI escaped text with responseType=text", function () {
        return loadWithXhr({
          url: "data:,Hello%2C%20World!",
          responseType: "text",
        }).then(function (result) {
          expect(result).toEqual("Hello, World!");
        });
      });

      it("can load Base64 encoded text with default response type", function () {
        return loadWithXhr({
          url: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==",
        }).then(function (result) {
          expect(result).toEqual("Hello, World!");
        });
      });

      it("can load Base64 encoded text with responseType=text", function () {
        return loadWithXhr({
          url: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==",
          responseType: "text",
        }).then(function (result) {
          expect(result).toEqual("Hello, World!");
        });
      });

      it("can load Base64 & URI encoded text with default responseType", function () {
        return loadWithXhr({
          url: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D",
        }).then(function (result) {
          expect(result).toEqual("Hello, World!");
        });
      });

      it("can load Base64 & URI encoded text with responseType=text", function () {
        return loadWithXhr({
          url: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D",
          responseType: "text",
        }).then(function (result) {
          expect(result).toEqual("Hello, World!");
        });
      });

      it("can load URI escaped HTML as text with default responseType", function () {
        return loadWithXhr({
          url: "data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E",
        }).then(function (result) {
          expect(result).toEqual("<h1>Hello, World!</h1>");
        });
      });

      it("can load URI escaped HTML as text with responseType=text", function () {
        return loadWithXhr({
          url: "data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E",
          responseType: "text",
        }).then(function (result) {
          expect(result).toEqual("<h1>Hello, World!</h1>");
        });
      });

      it("can load URI escaped text as JSON", function () {
        return loadWithXhr({
          url: "data:application/json,%7B%22key%22%3A%22value%22%7D",
          responseType: "json",
        }).then(function (result) {
          expect(result.key).toEqual("value");
        });
      });

      it("can load Base64 encoded text as JSON", function () {
        return loadWithXhr({
          url: "data:application/json;base64,eyJrZXkiOiJ2YWx1ZSJ9",
          responseType: "json",
        }).then(function (result) {
          expect(result.key).toEqual("value");
        });
      });

      it("can load URI escaped HTML as document", function () {
        return loadWithXhr({
          url: "data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E",
          responseType: "document",
        }).then(function (result) {
          expect(result.querySelector("h1")).not.toBeNull();
        });
      });

      const tile =
        "data:;base64,rZ+P95jW+j0AAABAplRYwQAAAAAAAAAAFwEcw/RY1UUqDN/so3WJQETWnpq/aabA19EOeYzEh8D+6WPqtldYQYlaPeMGcRRAO+KDbxWIcsMAAAAAAAAAANsAAAD+N/03/mf/UQDq/f/+T/8foDBgL/8TACwAWP8H/xf/H/8b/yMAGP8r/wv/H/8P/w8ACP8PAEj/F/8TADwAIAAg/w8AMAAg/wcAGP8v/xf/J4gPIBOnIv8P/wf/FwAo/xfkM+MXACwACAAAAAgAGAAA/w//B/8P/wf/D/8XmgmZGf8XAAgAEBYZFQkAGAAQABj/DwAQAAgAEAAA/w8ACP8P/w8AIP8v2QD9DScR/w8AGAAQABAACAAQABwABAAIAAAAAAAI/xf/HwAQ/y8ADP8j/wf/D/8HRAlDEQAAABAAIP8fADAAFP8P/xP/H/8H5wf4Ag8TAAAABAAEAAD/D/8HAAAAAAAANhLKBf8HABAAIAAA/y95GHoIAAD/D/8DAAz/BwAAAAD/DwAAAAAAAAAAABD/Gz4Vwhb/G/8XAKz9t/4XAAj/D/0P/g8AAP0PAAAAAP4P/Q8AAAAAAAD+//8TABT/PwBA/y8AGP8n/w8AKAAYABAAAAAAAAAAAP8PABD/DwAQAAD/DwAIAAgAAP8PABD9//4P/Q/+H/8P/Q/+EwAYAAz/H/8PABj9H/43ABAACP1PAADWBdUF/gMADv0R/g8AEP8LdwCHBwAI/wsACP8HAAAACAAMAAQACP8DAAwACP8P/wcAIP8PABAACAAE/xsAAP8HABj/H/8HABT/CwAQABAAAL4WFwSlAv8PABAAAAAIAAh0A4wEAAD/B/8P/w8AAAAQAAgAEAAQ/wcAAAAI9wQHCwAAABAAAAgI+Af/BwAA/wcAEAAA/xf/BwAYAAAAGAAAAAD/DwAQuw/4AMQO/w8AGAAAAAAAEP8HAAT/E/8HABAAIFESUgoACP8D/wsAFP8T/w//D/8H1hvVA/8PACAADAAEAAgABAAQ/xMACP8HYREzDGkK/w8AHP8j/w8AAAAY/w8AMP8P5hoaHf8PACD/BwAQAAQ5HjoS/yf/HwAU/xv/B/8P/w8AEP8PACAAEAAgAAj/G7ItTh7/CwAIAAQACP8f/w//D/8P/w//DwAQ/w//DwAAAEAAEAAQABAAEP8TAAT/B/8H/wcACP8HABj/JwAIAAD/D/8P/w//D/8PAAD/DwAA/w8AAP8PAAD/D/8H/wcAQAAA/w8AAAAA/w8ABAAAABT/JwAIAAD/BwAYABD/D/83ABBwbM1nul3BXggB7QCqADoARH8JagIPNQkNGk5YCQunTVhLcUvMAAsBWAAbAKkArQCgAckA0AAXABwAGwCCAL4AHgqlCgIWfxVhAGAA3wByAKTgYdIxDm8AIwAxAIYAQwAYqNmncha+DYckCgDaADcAiwCuAs4GFAUvBlcI0vb59iAAYQAHAHbgr986A34DMgGBCbIAOABKAH4AlwDMABUB4QC4AdkBDm0OV83CDQCdAPsAPgAuAdwA6AAzAD4W3QmLC+Rs3WzvANwAgQPOCxEAuwomAFUAXoP9gygAKiIvEVYKWQUlFJsAWgQUBrYPnGdRNw9MQgAVAGAAlAA4AHMAkgAXASYApJgDkeZO+VX8BVQRkxb8w2vEpQB0AEcAHgCOAIAAWwCgAFMACQApAE0AKAA5AHTgz99zAD4AtABVAK4ApwCfAD8ApgAeAGMAagBYAD8AwwBMACAAEwBkAAgBLQCKZhlmQgA+AJxXuxLVRE8ATQCAAfIkBxvDA6kIEQA5AAIAPgA1ACwAEAAcADIAFwCSALkAIgGlAZwAnADrAJkAKQAJAMYAcwAaAG0ADwAFALcBuACSAQAAAAAAAAAAAwAAAAMAAwAAAAMABAACAAAABgAAAAAABQAIAAEAAgAIAAAABwABAAkABwAAAAAAAAADAAoACAABAAoAAgAEAAoACAAAAAAACgAAAAQAAQALAAIAAQAAAAUAAQAAAAYABgABAAgAAAAJAAAAAQAKAAMACgACAAkACwAJAAAACgADAAEAAQAOAAwAAAAPAAIADwABAAAAAQAAABEAEAARAAEAFAAQAAAAAQARAAIAAgADAAAAAwABAAAABAABAAMAAAAGAAcABgABAAAABAAHAAAAAQAIAAIAAAAKAAsACgABAAQACwANAAEAAAAOAA0AAQACAA4AAAAAAA8AEQACAA8ADwABAAMAEgACABEAEgATAAAAAQADABMAFAAAAAIAAQAVABYAFgAXAAEAAgABAAAAAgAAAAIAAQADABkABAACAAAAAQAHAAUABwABAAAABwAIAAEACQAHAAAAAAAJAAAACgAAAAQAAgALAAUACwADAAEAAAAPAA4AAQAOAAUADwABABIAAgAAAAIAEwACAAEABgADAAIAEwAAABMAFAACAAEAAgAAAAAAAgAEAAYAAwAEAAEACAACAAYACAAHAAAACQAAAAQAAgABAAoAAAAKAAAACwAOAAAABQAMAAMAAgAMAAEADwAQAAAAAgAQAAEAAAACABIAEgAUAAEAAAADAAIAAAAEAAIABAABAAUABQABAAYAAAAIAAcABwACAAEACAAAAAAAAwACAAoAAQAMAAoAAAAMAA0AAQANAAIAAAANAAAAAAASAA8AAwABAA8ADwAEAAIAEQASAAEAAAASAAAAEwACABUAAwABABMAAAAEAAYAAQACAAQAAAAAAAgACAABAAMABwACAAgAAgAHAAAAAQAIAAoACgAAAAIADAABAAsADQABAAwADQAOAAAAAgAOAAAAAQAPAAAAAwABABAAEgAAABIABAASAAEAEwAAAAIAFQABABQAAQAAAAMAAwAAAAcABAACAAEAAQAFAAcABQAAAAAABwAAAAkAAQAIAAIAAwAIAAAAAQAJAAUAAgAAAAsACwABAAAADAABAA4ADwAOAAEAAAASABAAAgABABAAAQARABIAAAASAAIAEgABAAAAFQATAAEAAAAEAAAABgAHAAUAAQAFAAcABQACAAQABwAAAAIACAAKAAEACgAAAAIAAQALAAAAAQAMAA0ADgABAA0AAAACAA8AAQAPAAAADQABABAAEQASAA0AEgABAA0AAQASAAAAAgABAAAAAQAEAAMAAAAFAAAAAAAHAAMAAQAIAAcAAgAHAAQACAAAAAoAAQAJAAAACgADAAEACwAAAA0ADAADAAAAAQACAA0ADwAOAAIAAgAQAA8AAgAAABEAEwARAAAAAQASAAIAAQAAABUAFAAVAAEAAQAAABUAFQABACkAAgAAAAAAAgAEAAUAAwAEAAAAAQAFAAIABwAAAAcABwABAAQAAAAAAAoAAwAKAAEACgAMAAIAAAANAAwADQABAAMAAAACAA0ADQAQAAEAAAAAAAQABgAEAAEAAwACAAQAAQAFAAYABQAAAAAABwADAAIABwAAAAoAAQAIAAIAAAAOAAsACwACAAEADQAOAAEAAAAAAA8ADwABAA4AAgAPAAAAAQAQAAQAAAATABAAEAADAAEAPAA7ABMAAQA8ABMAPAABAAAAAQACAAAAAwAFAAEABQAGAAAAAAAHAAIAAwAHAAEACAAAAAAACAACAAoAAQAEAAoACAAMAAAAAQADAAkADAANAAkADgABAA0ADwAAAA8AAgAPAAAAAQAQAAIAAAASAAAAEwAUAAEABAATAAIAFAAVAAEAAQAVAAAAAwACAAEAAQAAAAQAAQAGAAQAAAAHAAAACAACAAcAAQAIAAMAAAAKAAgACAADAAEADAAKAAEADAAAAAwAAgAAAA4AAgAOAAEAAAARAA4ADgADAAEAAAAAABMAAwACABMAEwABABIAAAAVABMAAQATAAIAAgAAAAAABAABAAMABQACAAQABgAIAAUAAAADAAYABgAJAAEAAAACAAoACQABAAoAAAAKAAAAAwALAAAAAQAMAAMAAgAMAA4ADgAQAAIAAAADABEAEQAQAAEAAAAAABIAFAACABIAAwASAAEAFAAVAAIAAgAAAAIAAwAWAAAAAAADAAUAAgABAAUAAAAFAAQABQABAAcAAAAKAAgACAACAAEACgABAAsACwABAAAACgAMAAEACgAAAAAAAQAPAAwAAwACAAwAAAAQAAIAEAABABEAAQATABEAAQAAAAAAAAAEAAIAAAAXAAUABQACAAEABAAFAAYABgAHAAQAAAAIAAkACQAAAAIACwABAAoACwAMAAEAAQAMAAAAEAABAA0AEAAOAAAAAgARAAEAAAAQABEAAQARAAAAAgABAAAAAgATAAAAAwAAAAMABAAAAAAABgAEAAIAAQADAAYABABCAAAAQwAFAAAABAAGAAIAAQAGABkABAAAAAQAVQAFAAMABQBVAAEAAAAHAAUABQACAAEABwABAAAAAgADAFoAAgAAAAIAAQADAFsAWwAEAFkAWQAEAFcABABYAFcAWAAGAEkABgBIAEkAMwBIAAUAHQAzAAUAWwBaAAEAAQBaAAAAAABcAF4AXAABAAIAAAACAGAAXwBgAAIAAAAAAAMAAgADAGIAYgB0AAIAAAACAAMAdQABAAMAAgABAAAAAgAAAAIAAwB3AHgAAQADAAAAAQAEAHkAAAADAAIAAwABAAAAewCPAAMAAwCPAAIAAAADAAAAkQCSAAQABAACAAMAAQAEAJIAAQAAAAMAkwCmAAIApgABAAIApgClAAEAIQAAACEAIQABAAAAAQA4ACIAAAACAAMAOQACADgAOAACAAAAAAACAAQABAADAAEAAwAAAAIAAAAEAAMAAwACAAEABAABAAAAPQAFAD8AAQAAAAYAQAAGAAEAAAAEAAAABAAFAAAABgAHAAIAAQAGAAMABwAAAAMAAQAEAAMAvQC+AAQABAABAL0ABAC+AAIAvgAGAAIAAAAGAAcAAQAHALsAuwAHAL8ABgABAAAABwBaAEYAWgAHAAEAAQACAAAAvgADAL0AAQADAL4AAgBcAFsAAQCZAAIAAgCZAFwArACZAAEAvgCsAAEAXACZAJgAwAAAAMMAwQAFAAAAAgDCAAEA2AACANYAxAACANgAEQAAAAEAnwCoANUA2QAFANoAzgDLAMkApwCmAKMAqgCsAK0AqwACAAAAAQAEABEAAAAEAK4ADAAkAMYAxQDIAMIAwQC/ALsAugC5ALIAsAC8AL0AAgAAAJ8ArgA=";

      it("can load Base64 encoded data as arraybuffer", function () {
        return loadWithXhr({
          url: tile,
          responseType: "arraybuffer",
        }).then(function (result) {
          expect(result.byteLength).toEqual(3914);
        });
      });

      const image =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAEISURBVEhLvVXBDYQwDOuojHKj8LhBbpTbpBCEkZsmIVTXq1RVQGrHiWlLmTTqPiZBlyLgy/KSZQ5JSHDQ/mCYCsC8106kDU0AdwRnvYZArWRcAl0dcYJq1hWCb3hBrumbDAVMwAC82WoRvgMnVMDBnB0nYZFTbE6BBvdUGqVqCbjBIk3PyFFR/NU7EKzru+qZsau3ryPwwCRLKYOzutZuCL6fUmWeJGzNzL/RxAMrUmASSCkkAayk2IxPlwhAAYGpsiHQjbLccfdOY5gKkCXAMi7SscAwbQpAnKyctWyUZ6z8ja3OGMepwD8asz+9FnSvbhU8uVOHFIwQsI3/p0CfhuqCSQuxLqsN6mu8SS+N42MAAAAASUVORK5CYII=";

      it("can load Base64 encoded data as blob", function () {
        return loadWithXhr({
          url: image,
          responseType: "blob",
        }).then(function (result) {
          expect(result.type).toEqual("image/png");

          const blobUrl = URL.createObjectURL(result);

          return Resource.fetchImage(blobUrl).then(function (image) {
            expect(image.width).toEqual(24);
            expect(image.height).toEqual(24);
          });
        });
      });

      xit("can support 2xx HTTP status (other than 200)", function () {
        return loadWithXhr({
          method: "POST",
          url: "http://jsonplaceholder.typicode.com/posts",
          data: {
            title: "foo",
            body: "bar",
            userId: 1,
          },
        }).then(function (result) {
          expect(JSON.parse(result).id).toEqual(101);
        });
      });
    });

    describe("URL loading using XHR", function () {
      describe("returns a promise that rejects when the request", function () {
        it("results in an HTTP status code greater than or equal to 300", function () {
          return loadWithXhr({
            url: "http://example.invalid",
          })
            .then(function () {
              fail("expected promise to reject");
            })
            .otherwise(function (err) {
              expect(err).toBeInstanceOf(RequestErrorEvent);
            });
        });

        it("loads an invalid JSON string response with a json responseType", function () {
          return loadWithXhr({
            url: "Data/htmlString.txt",
            responseType: "json",
          })
            .then(function () {
              fail("expected promise to reject");
            })
            .otherwise(function (err) {
              expect(err).toBeDefined();
              expect(err).toBeInstanceOf(Error);
            });
        });
      });

      describe("returns a promise that resolves when the request loads", function () {
        it("a non-null response with default responseType", function () {
          return loadWithXhr({
            url: "Data/Models/Box/ReadMe.txt",
          }).then(function (result) {
            expect(result).toBe(
              "CesiumBoxTest-NoTechnique.gltf is a modified glTF that has techniques, shaders & programs removed."
            );
          });
        });

        it("a non-null response with a browser-supported responseType", function () {
          return loadWithXhr({
            url: "Data/Models/Box/ReadMe.txt",
            responseType: "text",
          }).then(function (result) {
            expect(result).toBe(
              "CesiumBoxTest-NoTechnique.gltf is a modified glTF that has techniques, shaders & programs removed."
            );
          });
        });

        it("a valid JSON string response as JSON with a json responseType", function () {
          return loadWithXhr({
            url: "Data/jsonString.txt",
            responseType: "json",
          }).then(function (result) {
            expect(result).toEqual(
              jasmine.objectContaining({ hello: "world" })
            );
          });
        });
      });
    });

    describe("URL loading using mocked XHR", function () {
      let fakeXHR;

      beforeEach(function () {
        fakeXHR = jasmine.createSpyObj("XMLHttpRequest", [
          "send",
          "open",
          "setRequestHeader",
          "abort",
          "getAllResponseHeaders",
        ]);
        fakeXHR.simulateError = function () {
          fakeXHR.response = "";
          if (typeof fakeXHR.onerror === "function") {
            fakeXHR.onerror();
          }
        };
        fakeXHR.simulateHttpResponse = function (statusCode, response) {
          fakeXHR.status = statusCode;
          fakeXHR.response = response;
          if (typeof fakeXHR.onload === "function") {
            fakeXHR.onload();
          }
        };
        fakeXHR.simulateResponseXMLLoad = function (responseXML) {
          fakeXHR.status = 200;
          fakeXHR.responseXML = responseXML;
          if (typeof fakeXHR.onload === "function") {
            fakeXHR.onload();
          }
        };
        fakeXHR.simulateResponseTextLoad = function (responseText) {
          fakeXHR.simulateHttpResponse(200, responseText);
        };

        spyOn(window, "XMLHttpRequest").and.returnValue(fakeXHR);
      });

      describe("returns a promise that rejects when the request", function () {
        it("errors", function () {
          const promise = loadWithXhr({
            url: "http://example.invalid",
          });

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          fakeXHR.simulateError();
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RequestErrorEvent);
        });

        it("results in an HTTP status code less than 200", function () {
          const promise = loadWithXhr({
            url: "http://example.invalid",
          });

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          fakeXHR.simulateHttpResponse(199);
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RequestErrorEvent);
        });

        it("is an image with status code 204 with preferImageBitmap", function () {
          if (!supportsImageBitmapOptions) {
            return;
          }

          const promise = Resource.fetchImage({
            url: "./Data/Images/Green.png",
            preferImageBitmap: true,
          });

          expect(promise).toBeDefined();

          let resolved = false;
          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolved = true;
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          fakeXHR.simulateHttpResponse(204);
          expect(resolved).toBe(false);
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeDefined();
        });

        it("resolves undefined for status code 204", function () {
          const promise = loadWithXhr({
            url: "http://example.invalid",
          });

          expect(promise).toBeDefined();

          let resolved = false;
          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolved = true;
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          fakeXHR.simulateHttpResponse(204);
          expect(resolved).toBe(true);
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();
        });
      });

      describe("returns a promise that resolves when the request loads", function () {
        it("a null response with a '' responseType and non-null responseXML with child nodes", function () {
          const promise = loadWithXhr({
            url: "http://example.invalid",
            responseType: "",
          });

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          const responseXML = {
            hasChildNodes: jasmine
              .createSpy("hasChildNodes")
              .and.returnValue(true),
          };
          fakeXHR.simulateResponseXMLLoad(responseXML);
          expect(resolvedValue).toEqual(responseXML);
          expect(rejectedError).toBeUndefined();
        });

        it("a null response with a document responseType and non-null responseXML with child nodes", function () {
          const promise = loadWithXhr({
            url: "http://example.invalid",
            responseType: "document",
          });

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          const responseXML = {
            hasChildNodes: jasmine
              .createSpy("hasChildNodes")
              .and.returnValue(true),
          };
          fakeXHR.simulateResponseXMLLoad(responseXML);
          expect(resolvedValue).toEqual(responseXML);
          expect(rejectedError).toBeUndefined();
        });

        it("a null response with a '' responseType and non-null responseText", function () {
          const promise = loadWithXhr({
            url: "http://example.invalid",
            responseType: "",
          });

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          const responseText = "hello world";
          fakeXHR.simulateResponseTextLoad(responseText);
          expect(resolvedValue).toEqual(responseText);
          expect(rejectedError).toBeUndefined();
        });

        it("a null response with a text responseType and non-null responseText", function () {
          const promise = loadWithXhr({
            url: "http://example.invalid",
            responseType: "text",
          });

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          const responseText = "hello world";
          fakeXHR.simulateResponseTextLoad(responseText);
          expect(resolvedValue).toEqual(responseText);
          expect(rejectedError).toBeUndefined();
        });
      });

      describe("retries when Resource has the callback set", function () {
        it("rejects after too many retries", function () {
          const cb = jasmine.createSpy("retry").and.returnValue(true);

          const resource = new Resource({
            url: "http://example.invalid",
            retryCallback: cb,
            retryAttempts: 1,
          });

          const promise = loadWithXhr(resource);

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          fakeXHR.simulateError(); // This should retry
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          expect(cb.calls.count()).toEqual(1);
          const receivedResource = cb.calls.argsFor(0)[0];
          expect(receivedResource.url).toEqual(resource.url);
          expect(receivedResource._retryCount).toEqual(1);
          expect(cb.calls.argsFor(0)[1] instanceof RequestErrorEvent).toBe(
            true
          );

          fakeXHR.simulateError(); // This fails because we only retry once
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RequestErrorEvent);
        });

        it("rejects after callback returns false", function () {
          const cb = jasmine.createSpy("retry").and.returnValue(false);

          const resource = new Resource({
            url: "http://example.invalid",
            retryCallback: cb,
            retryAttempts: 2,
          });

          const promise = loadWithXhr(resource);

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          fakeXHR.simulateError(); // This fails because the callback returns false
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeInstanceOf(RequestErrorEvent);

          expect(cb.calls.count()).toEqual(1);
          const receivedResource = cb.calls.argsFor(0)[0];
          expect(receivedResource.url).toEqual(resource.url);
          expect(receivedResource._retryCount).toEqual(1);
          expect(cb.calls.argsFor(0)[1] instanceof RequestErrorEvent).toBe(
            true
          );
        });

        it("resolves after retry", function () {
          const cb = jasmine.createSpy("retry").and.returnValue(true);

          const resource = new Resource({
            url: "http://example.invalid",
            retryCallback: cb,
            retryAttempts: 1,
          });

          const promise = loadWithXhr(resource);

          expect(promise).toBeDefined();

          let resolvedValue;
          let rejectedError;
          promise
            .then(function (value) {
              resolvedValue = value;
            })
            .otherwise(function (error) {
              rejectedError = error;
            });

          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          fakeXHR.simulateError(); // This should retry
          expect(resolvedValue).toBeUndefined();
          expect(rejectedError).toBeUndefined();

          expect(cb.calls.count()).toEqual(1);
          const receivedResource = cb.calls.argsFor(0)[0];
          expect(receivedResource.url).toEqual(resource.url);
          expect(receivedResource._retryCount).toEqual(1);
          expect(cb.calls.argsFor(0)[1] instanceof RequestErrorEvent).toBe(
            true
          );

          fakeXHR.simulateHttpResponse(200, "OK");
          expect(resolvedValue).toBeDefined();
          expect(rejectedError).toBeUndefined();
        });
      });
    });
  });

  describe("fetchJsonp", function () {
    it("returns a promise that resolves when the request loads", function () {
      const testUrl = "http://example.invalid/testuri";
      spyOn(Resource._Implementations, "loadAndExecuteScript").and.callFake(
        function (url, name, deffered) {
          expect(url).toContain(testUrl);
          expect(name).toContain("loadJsonp");
          expect(deffered).toBeDefined();
        }
      );
      Resource.fetchJsonp(testUrl);
    });

    it("returns a promise that rejects when the request errors", function () {
      const testUrl = "http://example.invalid/testuri";
      return Resource.fetchJsonp(testUrl).otherwise(function (error) {
        expect(error).toBeDefined();
      });
    });

    it("Uses callback name specified in options", function () {
      const testUrl = "test";
      const options = {
        callbackParameterName: "testCallback",
      };
      spyOn(Resource._Implementations, "loadAndExecuteScript").and.callFake(
        function (url, functionName, deferred) {
          expect(url).toContain("callback=loadJsonp");
        }
      );
      Resource.fetchJsonp(testUrl, options);
    });

    describe("retries when Resource has the callback set", function () {
      it("rejects after too many retries", function () {
        //const cb = jasmine.createSpy('retry').and.returnValue(true);
        const cb = jasmine
          .createSpy("retry")
          .and.callFake(function (resource, error) {
            return true;
          });

        let lastDeferred;
        spyOn(Resource._Implementations, "loadAndExecuteScript").and.callFake(
          function (url, functionName, deferred) {
            lastDeferred = deferred;
          }
        );

        const resource = new Resource({
          url: "http://example.invalid",
          retryCallback: cb,
          retryAttempts: 1,
        });

        const promise = resource.fetchJsonp();

        expect(promise).toBeDefined();

        let resolvedValue;
        let rejectedError;
        promise
          .then(function (value) {
            resolvedValue = value;
          })
          .otherwise(function (error) {
            rejectedError = error;
          });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        lastDeferred.reject("some error"); // This should retry
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        expect(cb.calls.count()).toEqual(1);
        const receivedResource = cb.calls.argsFor(0)[0];
        expect(receivedResource.url).toEqual(resource.url);
        expect(receivedResource._retryCount).toEqual(1);
        expect(cb.calls.argsFor(0)[1]).toEqual("some error");

        lastDeferred.reject("another error"); // This fails because we only retry once
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toEqual("another error");
      });

      it("rejects after callback returns false", function () {
        const cb = jasmine.createSpy("retry").and.returnValue(false);

        let lastDeferred;
        spyOn(Resource._Implementations, "loadAndExecuteScript").and.callFake(
          function (url, functionName, deferred) {
            lastDeferred = deferred;
          }
        );

        const resource = new Resource({
          url: "http://example.invalid",
          retryCallback: cb,
          retryAttempts: 2,
        });

        const promise = resource.fetchJsonp();

        expect(promise).toBeDefined();

        let resolvedValue;
        let rejectedError;
        promise
          .then(function (value) {
            resolvedValue = value;
          })
          .otherwise(function (error) {
            rejectedError = error;
          });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        lastDeferred.reject("some error"); // This fails because the callback returns false
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toEqual("some error");

        expect(cb.calls.count()).toEqual(1);
        const receivedResource = cb.calls.argsFor(0)[0];
        expect(receivedResource.url).toEqual(resource.url);
        expect(receivedResource._retryCount).toEqual(1);
        expect(cb.calls.argsFor(0)[1]).toEqual("some error");
      });

      it("resolves after retry", function () {
        const cb = jasmine.createSpy("retry").and.returnValue(true);

        let lastDeferred;
        let lastUrl;
        spyOn(Resource._Implementations, "loadAndExecuteScript").and.callFake(
          function (url, functionName, deferred) {
            lastUrl = url;
            lastDeferred = deferred;
          }
        );

        const resource = new Resource({
          url: "http://example.invalid",
          retryCallback: cb,
          retryAttempts: 1,
        });

        const promise = resource.fetchJsonp();

        expect(promise).toBeDefined();

        let resolvedValue;
        let rejectedError;
        promise
          .then(function (value) {
            resolvedValue = value;
          })
          .otherwise(function (error) {
            rejectedError = error;
          });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        lastDeferred.reject("some error"); // This should retry
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        expect(cb.calls.count()).toEqual(1);
        const receivedResource = cb.calls.argsFor(0)[0];
        expect(receivedResource.url).toEqual(resource.url);
        expect(receivedResource._retryCount).toEqual(1);
        expect(cb.calls.argsFor(0)[1]).toEqual("some error");

        const uri = new Uri(lastUrl);
        const query = queryToObject(uri.query());
        window[query.callback]("something good");
        expect(resolvedValue).toEqual("something good");
        expect(rejectedError).toBeUndefined();
      });
    });
  });
});
