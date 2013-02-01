define(["doh", "dojox/app/main", "dojox/json/ref", "dojo/text!./error1.json", "dojo/text!./error2.json",
	"dojo/text!./error3.json", "dojo/topic"],
	function(doh, Application, json, config1, config2, config3, topic){
	doh.register("dojox.app.tests.doh.error", [
		{
			timeout: 4000,
			name: "error1",
			runTest: function(t){
				var dohDeferred = new doh.Deferred();
				// stack events that are pushed
				var events = [];
				this._topic = topic.subscribe("/app/status", function(evt){
					events.push(evt);
				});
				Application(json.fromJson(config1));
				// we need to check that before timeout we _never_ entered the START (2) state
				setTimeout(dohDeferred.getTestCallback(function(){
					t.assertEqual([1], events);
					dohDeferred.callback(true);
				}), 3000);
				return dohDeferred;
			},
			tearDown: function(){
				this._topic.remove();
				// maybe dojox/app should do that?
				delete testApp;
			}
		},
		{
			timeout: 4000,
			name: "error2",
			runTest: function(t){
				var dohDeferred = new doh.Deferred();
				// stack events that are pushed
				var events = [];
				this._topic = topic.subscribe("/app/status", function(evt){
					events.push(evt);
				});
				// we need to check that before timeout we _never_ entered the START (2) state
				setTimeout(dohDeferred.getTestCallback(function(){
					t.assertEqual([1], events);
					dohDeferred.callback(true);
				}), 3000);
				Application(json.fromJson(config2));
				return dohDeferred;
			},
			tearDown: function(){
				this._topic.remove();
				// maybe dojox/app should do that?
				delete testApp;
			}
		},
		{
			timeout: 4000,
			name: "error3",
			runTest: function(t){
				var dohDeferred = new doh.Deferred();
				// stack events that are pushed
				var events = [];
				this._topic = topic.subscribe("/app/status", function(evt){
					events.push(evt);
				});
				// we need to check that before timeout we _never_ entered the START (2) state
				setTimeout(dohDeferred.getTestCallback(function(){
					t.assertEqual([1], events);
					dohDeferred.callback(true);
				}), 3000);
				Application(json.fromJson(config3));
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
