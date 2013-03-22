define(["../main", "doh/main", "../AdapterRegistry"], function(dojo, doh){

doh.register("tests.AdapterRegistry",
	[
		function ctor(t){
			var taa = new dojo.AdapterRegistry();
			t.is(0, taa.pairs.length);
			t.f(taa.returnWrappers);

			var taa = new dojo.AdapterRegistry(true);
			t.t(taa.returnWrappers);
		},

		function register(t){
			var taa = new dojo.AdapterRegistry();
			taa.register("blah",
				function(str){ return str == "blah"; },
				function(){ return "blah"; }
			);
			t.is(1, taa.pairs.length);
			t.is("blah", taa.pairs[0][0]);

			taa.register("thinger");
			taa.register("prepend", null, null, true, true);
			t.is("prepend", taa.pairs[0][0]);
			t.t(taa.pairs[0][3]);
		},

		/*
		function match(t){
		},
		*/

		function noMatch(t){
			var taa = new dojo.AdapterRegistry();
			var threw = false;
			try{
				taa.match("blah");
			}catch(e){
				threw = true;
			}
			t.t(threw);
		},

		function returnWrappers(t){
			var taa = new dojo.AdapterRegistry();
			taa.register("blah",
				function(str){ return str == "blah"; },
				function(){ return "blah"; }
			);
			t.is("blah", taa.match("blah"));

			taa.returnWrappers = true;
			t.is("blah", taa.match("blah")());
		},

		function unregister(t){
			var taa = new dojo.AdapterRegistry();
			taa.register("blah",
				function(str){ return str == "blah"; },
				function(){ return "blah"; }
			);
			taa.register("thinger");
			taa.register("prepend", null, null, true, true);
			taa.unregister("prepend");
			t.is(2, taa.pairs.length);
			t.is("blah", taa.pairs[0][0]);
		}
	]
);

});