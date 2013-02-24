define(["doh", "dojo/_base/declare", "../TreeMap", "dojo/store/JsonRest", "dojo/when"],
	function(doh, declare, TreeMap, JsonRest, when){
	doh.register("dojox.treemap.tests.Store", [
		function test_Error(t){
			var treeMap = new TreeMap();
			var d = when(treeMap.set("store", new JsonRest({ target: "/" }), function(){
				t.f(true, "ok fct must not have been called");
			}, function(){
				t.t(true, "failure fct must have been called");
			}));
			treeMap.startup();
		}
	]);
});
