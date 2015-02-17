/*global defineSuite*/
defineSuite([
        'Core/objectToQuery',
        'Core/queryToObject'
    ], function(
        objectToQuery,
        queryToObject) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('can encode data', function() {
        var obj = {
            key1 : 'some value',
            key2 : 'a/b'
        };

        var str = objectToQuery(obj);
        expect(str).toEqual('key1=some%20value&key2=a%2Fb');
    });

    it('can encode arrays of data', function() {
        var obj = {
            key : ['a', 'b']
        };

        var str = objectToQuery(obj);
        expect(str).toEqual('key=a&key=b');
    });

    it('runs example code from the documentation', function() {
        var str = objectToQuery({
            key1 : 'some value',
            key2 : 'a/b',
            key3 : ['x', 'y']
        });
        expect(str).toEqual('key1=some%20value&key2=a%2Fb&key3=x&key3=y');
    });

    it('can round-trip', function() {
        var obj = {
            foo : ['bar', 'bar2'],
            bit : 'byte'
        };

        var obj2 = queryToObject(objectToQuery(obj));

        expect(obj2).toEqual(obj);
    });

    it('can encode blank', function() {
        expect(objectToQuery({})).toEqual('');
    });

    it('requires obj', function() {
        expect(function() {
            objectToQuery();
        }).toThrowDeveloperError();
    });
});