/*global defineSuite*/
defineSuite([
        'Core/throttleRequestByServer',
        'ThirdParty/when'
    ], function(
        throttleRequestByServer,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var originalMaximumRequestsPerServer;

    beforeEach(function() {
        originalMaximumRequestsPerServer = throttleRequestByServer.maximumRequestsPerServer;
    });

    afterEach(function() {
        throttleRequestByServer.maximumRequestsPerServer = originalMaximumRequestsPerServer;
    });

    it('honors maximumRequestsPerServer', function() {
        throttleRequestByServer.maximumRequestsPerServer = 2;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var promise1 = throttleRequestByServer('http://foo.com/1', requestFunction);
        var promise2 = throttleRequestByServer('http://foo.com/2', requestFunction);
        var promise3 = throttleRequestByServer('http://foo.com/3', requestFunction);

        expect(deferreds.length).toBe(2);
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).not.toBeDefined();

        deferreds[0].resolve();

        var promise4 = throttleRequestByServer('http://foo.com/3', requestFunction);
        expect(deferreds.length).toBe(3);
        expect(promise4).toBeDefined();

        var promise5 = throttleRequestByServer('http://foo.com/4', requestFunction);
        expect(deferreds.length).toBe(3);
        expect(promise5).not.toBeDefined();

        throttleRequestByServer.maximumRequestsPerServer = 3;
        var promise6 = throttleRequestByServer('http://foo.com/4', requestFunction);
        expect(deferreds.length).toBe(4);
        expect(promise6).toBeDefined();

        deferreds[1].resolve();
        deferreds[2].resolve();
        deferreds[3].resolve();
    });
});
