define("dojox/rpc/Client", ["dojo", "dojox"], function(dojo, dojox) {

	dojo.getObject("rpc.Client", true, dojox);

	// Provide extra headers for robust client and server communication

	dojo._defaultXhr = dojo.xhr;
	dojo.xhr = function(method,args){
		var headers = args.headers = args.headers || {};
		// set the client id, this can be used by servers to maintain state information with the
		// a specific client. Many servers rely on sessions for this, but sessions are shared
		// between tabs/windows, so this is not appropriate for application state, it
		// really only useful for storing user authentication
		headers["Client-Id"] = dojox.rpc.Client.clientId;
		// set the sequence id. HTTP is non-deterministic, message can arrive at the server
		// out of order. In complex Ajax applications, it may be more to ensure that messages
		// can be properly sequenced deterministically. This applies a sequency id to each
		// XHR request so that the server can order them.
		headers["Seq-Id"] = dojox._reqSeqId = (dojox._reqSeqId||0)+1;
		return dojo._defaultXhr.apply(dojo,arguments);
	}

	// initiate the client id to a good random number
	dojox.rpc.Client.clientId = (Math.random() + '').substring(2,14) + (new Date().getTime() + '').substring(8,13);

	return dojox.rpc.Client;

});
