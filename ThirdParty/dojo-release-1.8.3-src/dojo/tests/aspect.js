dojo.provide("dojo.tests.aspect");

var aspect = dojo.require("dojo.aspect");

doh.register("tests.aspect",
	[
		function before(t){
			var order = [];
			var obj = {
				method: function(a){
					order.push(a);
				}
			};
			var signal = aspect.before(obj, "method", function(a){
				order.push(a);
				return [a+1];
			});
			obj.method(0);
			obj.method(2);
			var signal2 = aspect.before(obj, "method", function(a){
				order.push(a);
				return [a+1];
			});
			obj.method(4);
			signal.remove();
			obj.method(7);
			signal2.remove();
			obj.method(9);
			t.is(order, [0,1,2,3,4,5,6,7,8,9]);
		},

		function after(t){
			var order = [];
			var obj = {
				method: function(a){
					order.push(a);
					return a+1;
				}
			};
			var signal = aspect.after(obj, "method", function(a){
				order.push(0);
				return a+1;
			});
			obj.method(0); // 0, 0
			var signal2 = aspect.after(obj, "method", function(a){
				order.push(a);
			});
			obj.method(3); // 3, 0, 5
			var signal3 = aspect.after(obj, "method", function(a){
				order.push(3);
			}, true);
			obj.method(3); // 3, 0, 5, 3
			signal2.remove();
			obj.method(6); // 6, 0, 3
			signal3.remove();
			var signal4 = aspect.after(obj, "method", function(a){
				order.push(4);
			}, true);
			signal.remove();
			obj.method(7); // 7, 4
			signal4.remove();
			var signal5 = aspect.after(obj, "method", function(a){
				order.push(a);
				aspect.after(obj, "method", function(a){
					order.push(a);
				});
				aspect.after(obj, "method", function(a){
					order.push(a);
				}).remove();
				return a+1;
			});
			var signal6 = aspect.after(obj, "method", function(a){
				order.push(a);
				return a+2;
			});
			obj.method(8); // 8, 9, 10
			obj.method(8); // 8, 9, 10, 12
			t.is([0, 0, 3, 0, 5, 3, 0, 5, 3, 6, 0, 3, 7, 4, 8, 9, 10, 8, 9, 10, 12], order);
			obj = {method: function(){}};
			aspect.after(obj, "method", function(){
				return false;
			}, true);
			t.t(obj.method() === false);
		},
		function around(t){
			var order = [];
			var obj = {
				method: function(a){
					order.push(a);
					return a+1;
				}
			};
			var beforeSignal = aspect.before(obj, "method", function(a){
				order.push(a);
			});
			var signal = aspect.around(obj, "method", function(original){
				return function(a){
					a= a + 1;
					a = original(a);
					order.push(a);
					return a+1;
				};
			});
			order.push(obj.method(0));
			obj.method(4);
			t.is(order, [0,1,2,3,4,5,6]);
		},
		function delegation(t){
			var order = [];
			var proto = {
				foo: function(x){
					order.push(x);
					return x;
				},
				bar: function(){
				}
			};
			aspect.after(proto, "foo", function(x){
				order.push(x + 1);
				return x;
			});
			aspect.after(proto, "bar", function(x){
				t.t(this.isInstance);
			});
			proto.foo(0);
			function Class(){
			}
			Class.prototype = proto;
			var instance = new Class();
			instance.isInstance = true;
			aspect.after(instance, "foo", function(x){
				order.push(x + 2);
				return x;
			});
			instance.bar();
			instance.foo(2);
			proto.foo(5);
			t.is(order, [0,1,2,3,4,5,6]);
		}
	]
);
