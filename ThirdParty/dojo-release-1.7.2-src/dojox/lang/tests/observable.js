dojo.provide("dojox.lang.tests.observable");
dojo.require("dojox.lang.observable");

(function(){
	tests.register("dojox.lang.tests.observable", [
		function propertyAccessMakeObservable(t){
			console.log("start");
			var testStrs = [];
			var observable = new dojox.lang.makeObservable(
				function(obj,i){
					testStrs.push("onRead " + i);
					return obj[i];
				},
				function(obj,i,value){
					testStrs.push("onWrite " + i);
					obj[i] = value;
				},
				function(scope,obj,i,args){
					testStrs.push("onInvoke " + i);
					return obj[i].apply(scope,args);
				}
			);
			var obj = {foo:"bar",test:function(){
					return this.foo;
				}
			};
			var newObj = observable(obj);
			testStrs.push("returned " + newObj.test());
			newObj.foo = "new";
			testStrs.push(newObj.foo);
			t.assertEqual("onInvoke test,onRead foo,returned bar,onWrite foo,onRead foo,new",testStrs.join(','));
		},
		function propertyAccessObservable(t){
			var testStrs = [];
			var obj = {foo:"bar",test:function(){
				return this.foo;
			}};
			var newObj = dojox.lang.observable(obj,function(obj,i){
					testStrs.push("onRead " + i);
					return obj[i];
				},function(obj,i,value){
					testStrs.push("onWrite " + i);
					obj[i] = value;
				},function(scope,obj,i,args){
					testStrs.push("onInvoke " + i);
					return obj[i].apply(scope,args);
				}
			);
			testStrs.push("returned " + newObj.test());
			newObj.foo = "new";
			testStrs.push(newObj.foo);
			t.assertEqual("onInvoke test,onRead foo,returned bar,onWrite foo,onRead foo,new",testStrs.join(','));
		},
		function readonlyProxy(t){
			console.log("start");
			var testStrs = [];
			var obj = {foo:"bar"};
			var newObj = dojox.lang.ReadOnlyProxy(obj);
			testStrs.push(newObj.foo);
			newObj.foo = "illegal";

			testStrs.push(newObj.foo);
			obj.foo = "new";
			testStrs.push(newObj.foo);
			t.assertEqual("bar,bar,new",testStrs.join(','));
		},
		function perf(t){
			var getter = function(obj,i){
				return obj[i];
			};
			var observable = new dojox.lang.makeObservable(
				function(obj,i){
					return obj[i];
				},
				function(obj,i,value){
					obj[i] = value;
				},
				function(scope,obj,i,args){
					return obj[i].apply(scope,args);
				}
			);
			var obj = {foo:"bar",bar:'foo'};
			var newObj = observable(obj);
			var start = new Date().getTime();
			for(var i = 0; i < 100000;i++){ // normal access
				var a = obj.foo;
				a = obj.bar;
			}
			var store = {
				getValue:function(item, property,lazyCallback){
					// summary:
					//	Gets the value of an item's 'property'
					//
					//	item: /* object */
					//	property: /* string */
					//		property to look up value for
					// lazyCallback: /* function*/
					// 		not part of the API, but if you are using lazy loading properties, you may provide a callback to resume, in order to have asynchronous loading
					var value = item[property];
					if(value instanceof dojo.Deferred){
						dojox.rpc._sync = !lazyCallback; // tell the service to operate synchronously (I have some concerns about the "thread" safety with FF3, as I think it does event stacking on sync calls)
						value.addCallback(function(returned){
								value = returned;
								if(lazyCallback){lazyCallback(value);}
								return value;
							}
						);
						delete dojox.rpc._sync; // revert to normal async behavior
					}else if(lazyCallback){lazyCallback(value);}
					return value;
				}
			};
			console.log(new Date().getTime() - start);
			start = new Date().getTime();
			for(i = 0; i < 100000;i++){// observed access
				a = store.getValue(obj,"foo");
				a = store.getValue(obj,"bar");
			}
			console.log(new Date().getTime() - start);
			start = new Date().getTime();
			for(i = 0; i < 1000000;i++){ // measure the loop time itself
			}
			console.log(new Date().getTime() - start);
		}
	]);
})();
