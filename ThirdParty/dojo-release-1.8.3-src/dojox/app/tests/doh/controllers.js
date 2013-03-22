define(["doh", "dojox/app/main", "dojox/json/ref", "dojo/text!./config.json", "dojo/topic",
  "dojox/app/controllers/Load", "dojox/app/controllers/Transition", "dojox/app/controllers/Layout",
  "dojox/app/controllers/History"],
	function(doh, Application, json, config, topic, Load, Transition, Layout, History){
	doh.register("dojox.app.tests.doh.controllers", [
		{
			timeout: 2000,
			name: "controllers",
			runTest: function(t){
				var dohDeferred = new doh.Deferred();
				this._topic = topic.subscribe("/app/status", function(evt){
					if(evt == 2){
						// test controllers
						t.assertEqual(4, testApp.controllers.length);
						t.assertTrue(testApp.controllers[0] instanceof Load);
						t.assertTrue(testApp.controllers[1] instanceof Transition);
						t.assertTrue(testApp.controllers[2] instanceof Layout);
						t.assertTrue(testApp.controllers[3] instanceof History);
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
