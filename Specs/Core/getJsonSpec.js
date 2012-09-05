/*global defineSuite*/
defineSuite([
         'Core/getJson'
     ], function(
         getJson) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('getJson throws with empty argument.', function() {
        expect(function() {
            getJson();
        }).toThrow();
    });

    it('getJson sets headers and returns data.', function() {
        var xhr = {
                headers:[],
                values:[],
                response:"{\"name\":\"value\"}",
                send:function(){
                    this.onload();
                },
                open:function(type, url, async){},
                setRequestHeader:function(header, value){
                    this.headers.push(header);
                    this.values.push(value);
                }
        };

        spyOn(window, 'XMLHttpRequest').andReturn(xhr);
        getJson("test").then(function(data){
            expect(data).toEqual({name:"value"});
        });
        expect(xhr.responseType).toEqual('text');
        expect(xhr.headers.length).toEqual(2);
        expect(xhr.values.length).toEqual(2);
        expect(xhr.values[0]).toEqual('application/json');
        expect(xhr.headers[0]).toEqual('Accept');
        expect(xhr.values[1]).toEqual('no-cache');
        expect(xhr.headers[1]).toEqual('Cache-Control');
    });

});