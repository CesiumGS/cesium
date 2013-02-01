define(["doh", "dojox/app/main", "dojox/json/ref", "dojo/text!./config.json", "dojo/topic"],
	function(doh, Application, json, config, topic){
	doh.register("dojox.app.tests.doh.lifecycle", [
		{
			timeout: 2000,
			name: "lifecyle",
			runTest: function(t){
				var dohDeferred = new doh.Deferred();
				// stack events that are pushed
				var events = [];
				dohDeferred.addCallback(function(){
					t.assertEqual([1, 2], events);
				});
				this._topic = topic.subscribe("/app/status", function(evt){
					events.push(evt);
					if(evt == 2){
						// testApp needs to be available at this point
						t.assertNotEqual(null, testApp);
						// test lifecycle methods are available
						t.assertNotEqual(null, testApp.setStatus);
						t.assertNotEqual(null, testApp.getStatus);
						t.assertNotEqual(null, testApp.lifecycle);
						dohDeferred.callback(true);
					}
				});
				Application(json.fromJson(config));
				return dohDeferred;
			},
			tearDown: function(){
				this._topic.remove();
				// maybe dojox/app should do that?
				delete testApp;
			}
		}
	]);
});
