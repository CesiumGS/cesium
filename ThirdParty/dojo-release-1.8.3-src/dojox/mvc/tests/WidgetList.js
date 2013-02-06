define([
	"doh",
	"dojo/_base/array",
	"dojo/_base/config",
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_Container",
	"dijit/form/TextBox",
	"dojox/mvc/at",
	"dojox/mvc/getStateful",
	"dojox/mvc/WidgetList",
	"dojo/text!dojox/mvc/tests/test_WidgetList_WidgetListInTemplate.html",
	"dojo/text!dojox/mvc/tests/test_WidgetList_childTemplate.html",
	"dojo/text!dojox/mvc/tests/test_WidgetList_childBindings.json"
], function(doh, array, config, declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _Container, _TextBox, at, getStateful, WidgetList, template, childTemplate, childBindings){
	var a = getStateful([
		{
			Serial: "A111",
			First: "Anne",
			Last: "Ackerman",
			Location: "NY",
			Office: "1S76",
			Email: "a.a@test.com",
			Tel: "123-764-8237",
			Fax: "123-764-8228"
		},
		{
			Serial: "B111",
			First: "Ben",
			Last: "Beckham",
			Location: "NY",
			Office: "5N47",
			Email: "b.b@test.com",
			Tel: "123-764-8599",
			Fax: "123-764-8600"
		},
		{
			Serial: "C111",
			First: "Chad",
			Last: "Chapman",
			Location: "CA",
			Office: "1278",
			Email: "c.c@test.com",
			Tel: "408-764-8237",
			Fax: "408-764-8228"
		}
	]), b = getStateful([
		{
			Serial: "D111",
			First: "David",
			Last: "Durham",
			Location: "NJ",
			Office: "C12",
			Email: "d.d@test.com",
			Tel: "514-764-8237",
			Fax: "514-764-8228"
		},
		{
			Serial: "E111",
			First: "Emma",
			Last: "Eklof",
			Location: "NY",
			Office: "4N76",
			Email: "e.e@test.com",
			Tel: "123-764-1234",
			Fax: "123-764-4321"
		}
	]);

	var wl0 = new WidgetList({
		children: getStateful(a),
		childParams: {
			startup: function(){
				this.labelNode.set("value", at("rel:", "Serial"));
				this.inputNode.set("value", at("rel:", "First"));
				this.inherited("startup", arguments);
			}
		},
		templateString: childTemplate
	});
	wl0.startup();

	var wl1 = new WidgetList({
		children: getStateful(a),
		childBindings: eval("(" + childBindings + ")"),
		templateString: childTemplate
	});
	wl1.startup();

	doh.register("dojox.mvc.tests.WidgetList", [
		function programmaticBinding(){
			var children = wl0.getChildren();
			doh.is("A111", children[0].labelNode.value, "The label of index #0 should be: A111");
			doh.is("Anne", children[0].inputNode.value, "The input of index #0 should be: Anne");
			doh.is("B111", children[1].labelNode.value, "The label of index #1 should be: B111");
			doh.is("Ben", children[1].inputNode.value, "The input of index #1 should be: Ben");
			doh.is("C111", children[2].labelNode.value, "The label of index #2 should be: C111");
			doh.is("Chad", children[2].inputNode.value, "The input of index #2 should be: Chad");

			wl0.set("children", b);
			children = wl0.getChildren();
			doh.is("D111", children[0].labelNode.value, "The label of index #0 should be: D111");
			doh.is("David", children[0].inputNode.value, "The input of index #0 should be: David");
			doh.is("E111", children[1].labelNode.value, "The label of index #1 should be: E111");
			doh.is("Emma", children[1].inputNode.value, "The input of index #1 should be: Emma");

		},
		function declarativeBinding(){
			var children = wl1.getChildren();
			doh.is("A111", children[0].labelNode.value, "The label of index #0 should be: A111");
			doh.is("Anne", children[0].inputNode.value, "The input of index #0 should be: Anne");
			doh.is("B111", children[1].labelNode.value, "The label of index #1 should be: B111");
			doh.is("Ben", children[1].inputNode.value, "The input of index #1 should be: Ben");
			doh.is("C111", children[2].labelNode.value, "The label of index #2 should be: C111");
			doh.is("Chad", children[2].inputNode.value, "The input of index #2 should be: Chad");

			wl1.set("children", b);
			children = wl1.getChildren();
			doh.is("D111", children[0].labelNode.value, "The label of index #0 should be: D111");
			doh.is("David", children[0].inputNode.value, "The input of index #0 should be: David");
			doh.is("E111", children[1].labelNode.value, "The label of index #1 should be: E111");
			doh.is("Emma", children[1].inputNode.value, "The input of index #1 should be: Emma");
		},
		function removeAddElement(){
			var c = getStateful(a.slice(0));
			wl0.set("children", c);
			wl1.set("children", c);

			c.splice(1, 1);
			var children = wl0.getChildren();
			doh.is("C111", children[1].labelNode.value, "The label of index #1 should be: C111");
			doh.is("Chad", children[1].inputNode.value, "The input of index #1 should be: Chad");
			children = wl1.getChildren();
			doh.is("C111", children[1].labelNode.value, "The label of index #1 should be: C111");
			doh.is("Chad", children[1].inputNode.value, "The input of index #1 should be: Chad");

			c.splice(1, 0, b[0], b[1]);
			children = wl0.getChildren();
			doh.is("D111", children[1].labelNode.value, "The label of index #1 should be: D111");
			doh.is("David", children[1].inputNode.value, "The input of index #1 should be: David");
			doh.is("E111", children[2].labelNode.value, "The label of index #2 should be: E111");
			doh.is("Emma", children[2].inputNode.value, "The input of index #2 should be: Emma");
			children = wl1.getChildren();
			doh.is("D111", children[1].labelNode.value, "The label of index #1 should be: D111");
			doh.is("David", children[1].inputNode.value, "The input of index #1 should be: David");
			doh.is("E111", children[2].labelNode.value, "The label of index #2 should be: E111");
			doh.is("Emma", children[2].inputNode.value, "The input of index #2 should be: Emma");
		},
		function replaceElement(){
			wl0.set("children", a);
			wl1.set("children", a);
			a.set(1, b[1]);

			var children = wl0.getChildren();
			doh.is("E111", children[1].labelNode.value, "The label of index #1 should be: E111");
			doh.is("Emma", children[1].inputNode.value, "The input of index #1 should be: Emma");
			children = wl1.getChildren();
			doh.is("E111", children[1].labelNode.value, "The label of index #1 should be: E111");
			doh.is("Emma", children[1].inputNode.value, "The input of index #1 should be: Emma");
		},
		function wrongChildren(){
			wl0.set("children", null);
			var children = wl0.getChildren();
			doh.is(0, children.length, "The widget list should be empty");
			wl0.set("children", true);
			children = wl0.getChildren();
			doh.is(0, children.length, "The widget list should be empty");
			wl0.set("children", 1);
			children = wl0.getChildren();
			doh.is(0, children.length, "The widget list should be empty");
			wl0.set("children", "foo");
			children = wl0.getChildren();
			doh.is(0, children.length, "The widget list should be empty");
		},
		function objectInChildType(){
			var data = [{idx: 0}, {idx: 1}, {idx: 2}, {idx: 3}];

			declare("My.Widget", _WidgetBase, {
				isMyWidget: true
			});
			declare("My.Mixin", null, {
				isMyMixin: true
			});

			var w = new (declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {templateString: template}))({childData: data});
			w.startup();

			var simpleChildren = w.simpleWidgetList.getChildren(),
			 simpleChildrenWithRegularDijit = w.simpleWidgetListWithRegularDijit.getChildren(),
			 simpleChildrenWithRegularDijitInMixin = w.simpleWidgetListWithRegularDijitInMixin.getChildren()

			doh.t(array.every(simpleChildren, function(child){ return child.isMyWidget && child.isMyMixin && !child.addChild && !child._setValueAttr; }), "simpleChildren should be created by My.Widget and My.Mixin");
			doh.t(array.every(simpleChildrenWithRegularDijit, function(child){ return !child.isMyWidget && child.isMyMixin && !child.addChild && child._setValueAttr; }), "simpleChildrenWithRegularDijit should be created by dijit/form/TextBox and My.Mixin");
			doh.t(array.every(simpleChildrenWithRegularDijitInMixin, function(child){ return child.isMyWidget && child.isMyMixin && child.addChild && !child._setValueAttr; }), "simpleChildrenWithRegularDijitInMixin should be created by My.Widget, My.Mixin and dijit/_Container");
		}
	]);
});
