dojo.provide("dojox.rpc.tests.Wikipedia");
dojo.require("dojo.io.script");
dojo.require("dojox.rpc.Service");

dojox.rpc.tests.wikipediaService = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.SMDLibrary", "wikipedia.smd"));

dojox.rpc.tests.wikipediaService.TEST_METHOD_TIMEOUT = 8000;

dojox.rpc.tests.wikipediaService._query = function(q){
	return function(m){
		var d = new doh.Deferred();

		if (q.parameters && q.parameters.action && q.expectedResult) {
			var wp = dojox.rpc.tests.wikipediaService.query(q.parameters);
			wp.addCallback(this, function(result){
				console.log(result);
				if (result[q.expectedResult]){
					d.callback(true);
				}else{
					d.errback(new Error("Unexpected Return Value: ", result));
				}
			});
		}

		return d;
	}
};

doh.register("dojox.rpc.tests.wikipedia",
	[
		{
			name: "#1, Wikipedia::parse",
			timeout: dojox.rpc.tests.wikipediaService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.wikipediaService._query({
				parameters: {
					action: "parse",
					page: "Dojo Toolkit"
				},
				expectedResult: "parse"
			})
		},
		{
			name: "#2, Wikipedia::search",
			timeout: dojox.rpc.tests.wikipediaService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.wikipediaService._query({
				parameters: {
					action: "query",
					list: "search",
					srwhat: "text",
					srsearch: "Dojo Toolkit"
				},
				expectedResult: "query"
			})
		}
]);
