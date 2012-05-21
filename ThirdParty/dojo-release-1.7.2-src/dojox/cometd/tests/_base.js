dojo.provide("dojox.cometd.tests._base");
dojo.require("dojox.cometd");

tests.register("dojox.cometd.tests._base", [

	function basicSyntaxCheck(t){
		// w00t, we made it! (FIXME: how to unit test basic functionality?)
		// FIXME: gregw? include basicSyntax tests for other transports?
		t.assertTrue(true);
	},

	function basicInitCheck(t){
		var d = dojox.cometd.init("http://www.sitepen.com:9000/cometd");
		if(d){
			t.assertTrue(true);
		}
	},

	function basicSubscribeCheck(t){
		dojox.cometd.subscribe("/basic/unit/test", function(e){
			console.log("message received", e);
		});
		t.assertTrue(true);
	},

	function basicPublishCheck(t){
		dojox.cometd.publish("/basic/unit/test", [{ message: "unit test" }]);
		t.assertTrue(true);
	}

]);
