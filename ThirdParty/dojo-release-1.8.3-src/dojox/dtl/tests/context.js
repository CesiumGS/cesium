dojo.provide("dojox.dtl.tests.context");

dojo.require("dojox.dtl");
dojo.require("dojox.dtl.Context");

doh.register("dojox.dtl.context",
	[
		function test_context_creation(t){
			var context = new dojox.dtl.Context({ foo: "foo", bar: "bar" });
			t.is("foo", context.foo);
			t.is("bar", context.bar);
		},
		function test_context_push(t){
			var context = new dojox.dtl.Context({ foo: "foo", bar: "bar" });
			context = context.push();
			var found = false;
			for(var key in context){
				if(key == "foo" || key == "bar"){
					found = true;
				}
			}
			t.t(found);
		},
		function test_context_getter(t){
			var context = new dojox.dtl.Context({foo: "foo", bar: "bar", get: function(key){ return key + "TEST"; }});
			var tpl = new dojox.dtl.Template("{{ foo }}-{{ bar }}");
			t.is("fooTEST-barTEST", tpl.render(context));
		},
		function test_context_pop(t){
			var context = new dojox.dtl.Context({ foo: "foo", bar: "bar" });
			context = context.push();
			t.f(context.hasOwnProperty("foo"));
			t.f(context.hasOwnProperty("bar"));
			context = context.pop();
			t.is("foo", context.foo);
			t.is("bar", context.bar);
		},
		function test_context_overpop(t){
			var context = new dojox.dtl.Context();
			try{
				context = context.pop();
				t.t(false);
			}catch(e){
				t.is("pop() called on empty Context", e.message);
			}
		},
		function test_context_filter(t){
			var context = new dojox.dtl.Context({ foo: "one", bar: "two", baz: "three" });
			var filtered = context.filter("foo", "bar");
			t.is(filtered.foo, "one");
			t.is(filtered.bar, "two");
			t.f(filtered.baz);

			filtered = context.filter({ bar: true, baz: true });
			t.f(filtered.foo);
			t.is(filtered.bar, "two");
			t.is(filtered.baz, "three");

			filtered = context.filter(new dojox.dtl.Context({ foo: true, baz: true }));
			t.is(filtered.foo, "one");
			t.f(filtered.bar);
			t.is(filtered.baz, "three");
		},
		function test_context_extend(t){
			var context = new dojox.dtl.Context({ foo: "one" });
			var extended = context.extend({ bar: "two", baz: "three" });
			t.is(extended.foo, "one");
			t.is(extended.bar, "two");
			t.is(extended.baz, "three");

			extended = context.extend({ barr: "two", bazz: "three" });
			t.is(extended.foo, "one");
			t.f(extended.bar);
			t.f(extended.baz);
			t.is(extended.barr, "two");
			t.is(extended.bazz, "three");

			t.f(context.bar)
			t.f(context.baz);
			t.f(context.barr);
			t.f(context.bazz);
		}
	]
);