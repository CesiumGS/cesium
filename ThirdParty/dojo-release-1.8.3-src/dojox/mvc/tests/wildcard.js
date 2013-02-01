define([
	"doh",
	"dojo/Stateful",
	"dijit/form/TextBox",
	"dojox/mvc/at"
], function(doh, Stateful, TextBox, at){
	doh.register("dojox.mvc.tests.wildcard", [
		function wildcard(){
			var m0 = new Stateful({"placeHolder": "placeHolder0", "value": "Value0"}),
			 m1 = new Stateful({"placeHolder": "placeHolder1", "value": "Value1"}),
			 w = new TextBox({
				"*": at(m1, "*"),
				"placeHolder": at(m0, "placeHolder")
			}, document.createElement("div"));

			w.startup();

			doh.is("Value1", w.textbox.value, "Widget's value should come from m1");
		}
	]);
});
