dojo.provide("dojox.cometd.HttpChannels");
 
dojo.require("dojox.io.httpParse");
dojo.require("dojox.cometd.RestChannels");
// Note that cometd _base is _not_ required, this can run standalone, but ifyou want
// cometd functionality, you must explicitly load/require it elsewhere, and cometd._base
// MUST be loaded prior to HttpChannels ifyou use it.

// summary:
// 		HttpChannels - An HTTP Based approach to Comet transport with full HTTP messaging
// 		semantics including REST. HttpChannels is exactly the same as RestChannels, loading HttpChannels simply ensures that http parsing
//		capabilities are present for application/http messages

// description:
// 		This can be used:
// 		1. As a cometd transport
// 		2. As an enhancement for the REST RPC service, to enable "live" data (real-time updates directly alter the data in indexes)
// 		2a. With the JsonRestStore (which is driven by the REST RPC service), so this dojo.data has real-time data. Updates can be heard through the dojo.data notification API.
// 		3. As a standalone transport. To use it as a standalone transport looks like this:
// 	|		dojox.cometd.HttpChannels.open();
// 	|		dojox.cometd.HttpChannels.get("/myResource",{callback:function(){
// 	|			// this is called when the resource is first retrieved and any time the
// 	|			// resource is changed in the future. This provides a means for retrieving a
// 	|			// resource and subscribing to it in a single request
// 	|		});
// 	|	dojox.cometd.HttpChannels.subscribe("/anotherResource",{callback:function(){
// 	|		// this is called when the resource is changed in the future
// 	|	});
// 		Channels HTTP can be configured to a different delays:
// 	|	dojox.cometd.HttpChannels.autoReconnectTime = 60000; // reconnect after one minute
//
dojox.cometd.HttpChannels = dojox.cometd.RestChannels;
