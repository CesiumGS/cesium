define(["doh","dojo/_base/declare","dijit/_WidgetBase","dojox/dtl/_Templated"], function(doh, declare, _WidgetBase, _Templated) {
	var Test = declare([_WidgetBase, _Templated], {
		templateString: "<div>foo</div>"
	});
	doh.register("dojox.dtl.tests._Templated", [
		function test_create(t) {
			var ui = Test();
			t.is("foo", ui.domNode.innerHTML);
			ui.destroy();
		},
		
		function test_create_multiple(t) {
			var root = document.createElement("div");
			var ui1 = Test();
			var ui2 = Test();
			ui1.placeAt(root, "last");
			ui2.placeAt(root, "last");
			t.is("foo", ui1.domNode.innerHTML);
			t.is("foo", ui2.domNode.innerHTML);
			t.is(2, root.children.length, "root should have two children");
			ui1.destroy();
			ui2.destroy();
		}
	]);
});