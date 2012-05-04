define(["../main", "doh", "../Stateful"], function(dojo, doh){

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
	function setHash(t){
		var s = new dojo.Stateful();
		s.set({
			foo:3,
			bar: 5
		});
		doh.is(3, s.get("foo"));
		doh.is(5, s.get("bar"));
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
	}
]);

});