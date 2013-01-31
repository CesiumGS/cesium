define(["../main", "doh/main", "../Stateful", "../_base/declare", "../Deferred", "../json"], 
function(dojo, doh, Stateful, declare, Deferred, JSON){

doh.register("tests.Stateful", [
	function getSetWatch(t){
		var s = new dojo.Stateful({
			foo: 3
		});
		doh.is(s.get("foo"), 3);
		var watching = s.watch("foo", function(name, oldValue, value){
			doh.is("foo", name);
			doh.is(3, oldValue);
			doh.is(4, value);
			doh.is(4, s.get("foo"));
		});
		s.set("foo", 4);
		doh.is(4, s.get("foo"));
		watching.unwatch();
		s.set("foo", 5);
		doh.is(5, s.get("foo"));
	},
	function removeWatchHandle(t){
		var s = new dojo.Stateful({
				foo: 3
			}),
			watched = false;

		var watching = s.watch("foo", function(){
			t.f(watched);
			watched = true;
		});
		s.set("foo", 4);
		watching.remove();
		s.set("foo", 5);
	},
	function removeWatchHandleTwice(t){
		var s = new dojo.Stateful({
				foo: 3
			}),
			assertions = 0;

		var watching = s.watch("foo", function(){
			assertions++;
		});
		var watching2 = s.watch("foo", function(){
			assertions++;
		});
		s.set("foo", 4);
		watching.remove();
		watching.remove();
		s.set("foo", 5);
		
		t.t(assertions === 3);
	},
	function setHash(t){
		var s = new dojo.Stateful(), 
			fooCount = 0, 
			handle = s.watch('foo', function () { 
				fooCount++; 
			}); 
		s.set({
			foo:3,
			bar: 5
		});
		doh.is(3, s.get("foo"));
		doh.is(5, s.get("bar"));
		doh.is(1, fooCount);
		var s2 = new dojo.Stateful();
		s2.set(s);
		doh.is(3, s2.get("foo"));
		doh.is(5, s2.get("bar"));
		// s watchers should not be copied to s2 
		doh.is(1, fooCount); 
		handle.unwatch(); 
	},
	function wildcard(t){
		var s = new dojo.Stateful();
		s.set({
			foo:3,
			bar: 5
		});
		var wildcard = 0;
		var foo = 0;
		s.watch(function(){
			wildcard++;
		});
		s.watch("foo", function(){
			foo++;
		});
		s.set("foo", 4);
		s.set("bar", 6);
		doh.is(2, wildcard);
		doh.is(1, foo);
	},
	function accessors(t){
		var StatefulClass1 = declare([Stateful],{
			foo: "",
			bar: 0,
			baz: "",
			
			_fooSetter: function(value){
				this.foo = value;
			},
			_fooGetter: function(){
				return "bar";
			},
			
			_barSetter: function(value){
				this.bar = value;
			}
		});
		
		var attr1 = new StatefulClass1();
		attr1.set("foo", "nothing");
		attr1.set("bar", 2);
		attr1.set("baz", "bar");
		
		t.is(attr1.foo, "nothing", "attribute set properly");
		t.is(attr1.get("foo"), "bar", "getter working properly");
		t.is(attr1.bar, 2, "attribute set properly");
		t.is(attr1.get("bar"), 2, "getter working properly");
		t.is(attr1.get("baz"), "bar", "getter working properly");
		t.is(attr1.baz, "bar", "properly set properly");
	},
	function paramHandling(t){
		var StatefulClass2 = declare([Stateful], {
			foo: null,
			bar: 5,
			
			_fooSetter: function(value){
				this.foo = value;
			},
			_barSetter: function(value){
				this.bar = value;
			}
		});
		
		var attr2 = new StatefulClass2({
			foo: function(){
				return "baz";
			},
			bar: 4
		});
		
		t.is(typeof attr2.foo, "function", "function attribute set");
		t.is(attr2.foo(), "baz", "function has proper return value");
		t.is(attr2.get("bar"), 4, "attribute has proper value");
	},
	function deferredSetting(t){
		var td = new doh.Deferred();
		var StatefulClass3 = declare([Stateful], {
			foo: null,
			
			_fooSetter: function(value){
				var d = new Deferred();
				var self = this;
				setTimeout(function(){
					self.foo = value;
					d.resolve(value);
				}, 50);
				return d;
			}
		});
		
		var attr3 = new StatefulClass3();
		attr3.watch("foo", function(name, oldValue, value){
			t.is(name, "foo", "right attribute");
			t.f(oldValue, "no value previously");
			t.is(value, 3, "new value set");
			td.callback(true);
		});
		attr3.set("foo", 3);
		
		return td;
	},
	function changeAttrValue(t){
		var output = [];
		var StatefulClass4 = declare([Stateful], {
			foo: null,
			bar: null,
			
			_fooSetter: function(value){
				this._changeAttrValue("bar", value);
				this.foo = value;
			},
			_barSetter: function(value){
				this._changeAttrValue("foo", value);
				this.bar = value;
			}
		});
		
		var attr4 = new StatefulClass4();
		attr4.watch("foo", function(name, oldValue, value){
			output.push(name, oldValue, value);
		});
		attr4.watch("bar", function(name, oldValue, value){
			output.push(name, oldValue, value);
		});
		attr4.set("foo", 3);
		t.is(attr4.get("bar"), 3, "value set properly");
		attr4.set("bar", 4);
		t.is(attr4.get("foo"), 4, "value set properly");
		t.is(output, ["bar", null, 3, "foo", null, 3, "foo", 3, 4, "bar", 3, 4]);
	},
	function serialize(t){
		var StatefulClass5 = declare([Stateful], {
			foo: null,
			_fooSetter: function(value){
				this.foo = value + "baz";
			}
		});
		
		var obj = new StatefulClass5({
			foo: "bar"
		});
		
		t.is(JSON.stringify(obj), '{"foo":"barbaz"}', "object serializes properly");
	}
]);

});
