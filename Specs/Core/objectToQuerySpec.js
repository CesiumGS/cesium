/*global defineSuite*/
defineSuite([
        'Core/objectToQuery',
        'Core/queryToObject'
    ], function(
        objectToQuery,
        queryToObject) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can encode data', function() {
        var obj = {
            key1 : 'some value',
            key2 : 'a/b'
        };

        var str = objectToQuery(obj);
        expect(str).toEqual('key1=some+value&key2=a%2Fb');
    });

    it('can encode arrays of data', function() {
        var obj = {
            key : ['a', 'b']
        };

        var str = objectToQuery(obj);
        expect(str).toEqual('key=a&key=b');
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
});