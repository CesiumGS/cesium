dojo.provide("dojo.tests._base.Deferred");

var delay = function(ms){
	var d = new dojo.Deferred();
	ms = ms || 20;
	if(this.setTimeout){
		setTimeout(function(){
			d.progress(0.5);
		},ms/2);
		setTimeout(function(){
			d.resolve();
		},ms);
	}else{
		d.progress(0.5);
		d.resolve();
	}
	return d.promise;
};
doh.register("tests._base.Deferred",
	[

		function callback(t){
			var nd = new dojo.Deferred();
			var cnt = 0;
			nd.addCallback(function(res){
				doh.debug("debug from dojo.Deferred callback");
				return res;
			});
			nd.addCallback(function(res){
				// t.debug("val:", res);
				cnt+=res;
				return cnt;
			});
			nd.callback(5);
			// t.debug("cnt:", cnt);
			t.assertEqual(cnt, 5);
		},

		function callback_extra_args(t){
			var nd = new dojo.Deferred();
			var cnt = 0;
			nd.addCallback(dojo.global, function(base, res){ cnt+=base; cnt+=res; return cnt; }, 30);
			nd.callback(5);
			t.assertEqual(cnt, 35);
		},

		function errback(t){
			var nd = new dojo.Deferred();
			var cnt = 0;
			nd.addErrback(function(val){
				return ++cnt;
			});
			nd.errback();
			t.assertEqual(cnt, 1);
		},

		function callbackTwice(t){
			var nd = new dojo.Deferred();
			var cnt = 0;
			nd.addCallback(function(res){
				return ++cnt;
			});
			nd.callback();
			t.assertEqual(cnt, 1);
			var thrown = false;
			try{
				nd.callback();
			}catch(e){
				thrown = true;
			}
			t.assertTrue(thrown);
		},

		function addBoth(t){
			var nd = new dojo.Deferred();
			var cnt = 0;
			nd.addBoth(function(res){
				return ++cnt;
			});
			nd.callback();
			t.assertEqual(cnt, 1);

			// nd.callback();
			// t.debug(cnt);
			// t.assertEqual(cnt, 1);
		},

		function callbackNested(t){
			var nd = new dojo.Deferred();
			var nestedReturn = "yellow";
			nd.addCallback(function(res){
				nd.addCallback(function(res2){
					nestedReturn = res2;
				});
				return "blue";
			});
			nd.callback("red");
			t.assertEqual("blue", nestedReturn);
		},
		function simpleThen(t){
			var td = new doh.Deferred();
			delay().then(function(){
				td.callback(true);
			});
			return td;
		},
		function thenChaining(t){
			var td = new doh.Deferred();
			var p = delay();
			var p2 = p.then(function(){
				return 1;
			});
			p3 = p2.then(function(){
				return 2;
			});
			p3.then(function(){
				p2.then(function(v){
					t.assertEqual(v, 1);
					p3.then(function(v){
						t.assertEqual(v, 2);
						td.callback(true);
					});
				});
			});
			return td;
		},
		function simpleWhen(t){
			var td = new doh.Deferred();
			dojo.when(delay(), function(){
				td.callback(true);
			});
			return td;
		},
		function progress(t){
			if(dojo.isBrowser){
				var td = new doh.Deferred();
				var percentDone;
				dojo.when(delay(), function(){
					t.is(percentDone, 0.5);
					td.callback(true);
				},function(){},
				function(completed){
					percentDone = completed;
				});
				return td;
			}
			return null;
		},
		function cancelThenDerivative(t){
			var def = new dojo.Deferred();
			var def2 = def.then();
			try{
				def2.cancel();
				t.t(true); // Didn't throw an error
			}catch(e){
				t.t(false);
			}
		},
		function cancelPromiseValue(t){
			var cancelledDef;
			var def = new dojo.Deferred(function(_def){ cancelledDef = _def; });
			def.promise.cancel();
			t.is(def, cancelledDef);
		},
		function errorResult(t){
			var def = new dojo.Deferred();
			var result = new Error("rejected");
			def.reject(result);
			t.is(def.fired, 1);
			t.is(def.results[1], result);
		},
		function globalLeak(t){
			var def = new dojo.Deferred();
			def.then(function(){ return def; });
			def.resolve(true);
			t.is(dojo.global.results, undefined, "results is leaking into global");
			t.is(dojo.global.fired, undefined, "fired is leaking into global");
		},
		function backAndForthProcess(t){
			var def = new dojo.Deferred();
			var retval = "fail";

			def.addErrback(function(){
				return "ignore error and throw this good string";
			}).addCallback(function(){
				throw new Error("error1");
			}).addErrback(function(){
				return "ignore second error and make it good again";
			}).addCallback(function(){
				retval = "succeed";
			});

			def.errback("");

			t.assertEqual("succeed", retval);
		},
		function backAndForthProcessThen(t){
			var def = new dojo.Deferred;
			var retval = "fail";

			def.then(null, function(){
				return "ignore error and throw this good string";
			}).then(function(){
				throw "error1";
			}).then(null, function(){
				return "ignore second error and make it good again";
			}).then(function(){
				retval = "succeed";
			});

			def.reject("");

			t.assertEqual("succeed", retval);
		},
		function returnErrorObject(t){
			var def = new dojo.Deferred();
			var retval = "fail";

			def.addCallback(function(){
				return new Error("returning an error should work same as throwing");
			}).addErrback(function(){
				retval = "succeed";
			});

			def.callback();

			t.assertEqual("succeed", retval);
		},
		function returnErrorObjectThen(t){
			var def = new dojo.Deferred();
			var retval = "fail";

			def.then(function(){
				return new Error("returning an error should NOT work same as throwing");
			}).then(function(){
				retval = "succeed";
			});

			def.resolve();

			t.assertEqual("succeed", retval);
		},
		function errbackWithPromise(t){
			var def = new dojo.Deferred();
			var retval;

			def.addCallbacks(function(){}, function(err){
				return err;
			});
			def.promise.then(
					function(){ retval = "fail"; },
					function(){ retval = "succeed"; });
			def.errback(new Error);

			t.assertEqual("succeed", retval);
		},
		function testDojoPromiseProgressBasic(t){
			var a = new dojo.Deferred();
			var b = new dojo.Deferred();
			var called = false;
			
			a.then(function(){
				b.then(function(){
					if (!called){
						console.log("Boo. ProgressBasic not called");
					}
				}, function(){
					console.log("Unexpected");
				}, function(){
					called = true; 
					console.log("Yay. ProgressBasic called");
				});
			});
			
			a.resolve();
			b.progress();
			b.resolve();
			t.t(called);
		},
		
		function testDojoPromiseProgressChain(t){
			var a = new dojo.Deferred();
			var b = new dojo.Deferred();
			var called = false;
			
			a.then(function(){
				return b;
			}).then(function(){
				if (!called){
					console.log("Boo. ProgressChain not called");
				}
			}, function(){
				console.log("Unexpected");
			}, function(){
				called = true; 
				console.log("Yay. ProgressChain called");
			});
			
			a.resolve();
			b.progress();
			b.resolve();
			t.t(called);
		}
 ]
);
