/*global defineSuite*/
defineSuite([
         'Core/uriQuery'
     ], function(
             uriQuery) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('queryToObject throws with empty argument.', function() {
        expect(function() {
            uriQuery.queryToObject();
        }).toThrow();
    });

    it('queryToObject parses query to object.', function() {
        var obj = uriQuery.queryToObject('http://localhost?name=Bruce&value=kicks');
        expect(obj.name).toEqual('Bruce');
        expect(obj.value).toEqual('kicks');
    });

    it('queryToObject with no query returns undefined.', function() {
        var obj = uriQuery.queryToObject('http://localhost');
        expect(obj).toEqual(undefined);
    });

    it('queryToObject with no value pair returns empty string as value.', function() {
        var obj = uriQuery.queryToObject('http://localhost?test');
        expect(obj.test).toEqual('');
    });

    it('queryToObject with invalid url returns undefined.', function() {
        var obj = uriQuery.queryToObject('http://localhost&test');
        expect(obj).toEqual(undefined);
    });

    it('objectToQuery throws with empty argument.', function() {
        expect(function() {
            uriQuery.objectToQuery();
        }).toThrow();
    });

    it('objectToQuery encodes valid json.', function() {
        var encoded = uriQuery.objectToQuery({foo: "hi there", bar: { blah: 123, quux: [1, 2, 3] }});
        var decoded = decodeURI(encoded);
        expect(decoded).toEqual("foo=hi there&bar[blah]=123&bar[quux][0]=1&bar[quux][1]=2&bar[quux][2]=3");
        expect(encoded).toEqual("foo=hi%20there&bar%5Bblah%5D=123&bar%5Bquux%5D%5B0%5D=1&bar%5Bquux%5D%5B1%5D=2&bar%5Bquux%5D%5B2%5D=3");
    });

});