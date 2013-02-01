define([
	"doh",
	"dojox/mvc/StatefulModel"
], function(doh, StatefulModel){
	// Refers to:
	//		http://bugs.dojotoolkit.org/ticket/15009
	//		http://bugs.dojotoolkit.org/ticket/15012

	doh.register("dojox.mvc.tests.StatefulModelOptions", [
		function createStatefulModel(){
			var model = new StatefulModel({data: {
				prop1 : "String",
				prop2 : 10,
				prop3 : void 0,
				prop4 : null
			}});
			doh.is("String", model.prop1.get("value"), "prop1 should be String");
			doh.is(10, model.prop2.get("value"), "prop2 should be 10");
			doh.is(void 0, model.prop3.get("value"), "prop3 should be undefined");
			doh.is(null, model.prop4.get("value"), "prop4 should be null");
		}
	]);
});
