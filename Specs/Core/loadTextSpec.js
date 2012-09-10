/*global defineSuite*/
defineSuite([
         'Core/loadText'
     ], function(
             loadText) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var xhr;

    beforeAll(function() {
        xhr = {
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
    });

    afterAll(function() {
        xhr = undefined;
    });

    it('loadText throws with empty argument.', function() {
        expect(function() {
            loadText();
        }).toThrow();
    });

    it('loadText default values', function() {
        spyOn(window, 'XMLHttpRequest').andReturn(xhr);
        loadText("testuri");
        expect(xhr.headers.length).toEqual(0);
        expect(xhr.values.length).toEqual(0);
    });

    it('loadText with header values', function() {
        spyOn(window, 'XMLHttpRequest').andReturn(xhr);
        var headers = {'Accept':'application/json','Cache-Control':'no-cache'};
        loadText("testuri", headers).then(function(value) {
            var result = JSON.parse(value);
            expect(result).toEqual({name:"value"});
        });
        expect(xhr.headers.length).toEqual(2);
        expect(xhr.values.length).toEqual(2);
        expect(xhr.values[0]).toEqual('application/json');
        expect(xhr.headers[0]).toEqual('Accept');
        expect(xhr.values[1]).toEqual('no-cache');
        expect(xhr.headers[1]).toEqual('Cache-Control');
    });

    it('loadText with header values throws error', function() {
        var xhr2 = {
                headers:[],
                values:[],
                response:"{\"name\":\"value\"}",
                send:function(){
                    this.onerror("failed");
                },
                open:function(type, url, async){},
                setRequestHeader:function(header, value){
                    this.headers.push(header);
                    this.values.push(value);
                }
        };
        spyOn(window, 'XMLHttpRequest').andReturn(xhr2);
        var headers = {'Accept':'application/json','Cache-Control':'no-cache'};
        loadText("testuri", headers).then(function(){
            expect(false).toBeTruthy();
        }, function(failureMessage){
            expect(failureMessage).toEqual("failed");
        });
        expect(xhr2.headers.length).toEqual(2);
        expect(xhr2.values.length).toEqual(2);
        expect(xhr2.values[0]).toEqual('application/json');
        expect(xhr2.headers[0]).toEqual('Accept');
        expect(xhr2.values[1]).toEqual('no-cache');
        expect(xhr2.headers[1]).toEqual('Cache-Control');
    });
});