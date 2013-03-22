var timeoutInterval = 1500;

var FIXEDSPLITER_CLASSNAME = "mblFixedSplitter";
var FIXEDSPLITERPANE_CLASSNAME1 = "mblContainer";
var FIXEDSPLITERPANE_CLASSNAME2 = "mblFixedSplitterV";
var FIXEDSPLITERPANE_CLASSNAME3 = "mblFixedSplitterH";

var HEIGHT_RATIO1 = 0.2;
var HEIGHT_RATIO2 = 1 - HEIGHT_RATIO1;
var WIDTH_RATIO1 = 0.2;
var WIDTH_RATIO2 = 1 - WIDTH_RATIO1;
var WIDGET_PROPS = [{style:{width:"100%", height:"100%"}, orientation:"V"},
					{style:{backgroundColor:"yellow", height:"20%"}},
					{style:{width:"100%", height:"100%"}, orientation:"H"},
					{style:{backgroundColor:"pink", width:"20%"}},
					{style:{backgroundColor:"cyan"}}];
var WIDGET_INNERHTML = [{},
						{innerHTML:"pane #1"},
						{},
						{innerHTML:"pane #2"},
						{innerHTML:"pane #3"}];
var WIDGET_IDS = [{id:"dojox_mobile_FixedSplitter_0"},
				  {id:"dojox_mobile_Container_0"},
				  {id:"dojox_mobile_FixedSplitter_1"},
				  {id:"dojox_mobile_Container_1"},
				  {id:"dojox_mobile_Container_2"}];

require([
	"dojo/_base/connect",
	"dojo/_base/lang", // dojo.mixin
	"dojo/dom-construct", // dojo.place
	"dojo/dom-class", // dojo.hasClass
	"dojo/dom-geometry",
	"dojo/window", // dojo.window.getBox
	"dojo/ready", // dojo.ready
	"dijit/registry",  // dijit.byId
	"doh/runner",	//doh functions
	"dojox/mobile/FixedSplitter",
	"dojox/mobile/Container",
	"dojox/mobile/parser"		// This mobile app uses declarative programming with fast mobile parser
], function(connect, lang, domConst, domClass, domGeometry, window, ready, registry, runner, FixedSplitter, Container){
	function _createFixedSplitterDeclaratively(widgetId) {
		return registry.byId(widgetId);
	}
	function _createFixedSplitterProgrammatically(placeHolderId){
		// Create FixedSplitter
		var widget1 = new FixedSplitter(lang.mixin(WIDGET_IDS[0], WIDGET_PROPS[0], WIDGET_INNERHTML[0]));
		runner.assertNotEqual(null, widget1);
		domConst.place(widget1.domNode, placeHolderId, "replace");
		widget1.startup();

		var pane1 = new Container(lang.mixin(WIDGET_IDS[1], WIDGET_PROPS[1], WIDGET_INNERHTML[1]));
		var widget2 = new FixedSplitter(lang.mixin(WIDGET_IDS[2], WIDGET_PROPS[2], WIDGET_INNERHTML[2]));
		var pane2 = new Container(lang.mixin(WIDGET_IDS[3], WIDGET_PROPS[3], WIDGET_INNERHTML[3]));
		var pane3 = new Container(lang.mixin(WIDGET_IDS[4], WIDGET_PROPS[4], WIDGET_INNERHTML[4]));

		widget1.addChild(pane1);
		widget1.addChild(widget2);
		widget2.addChild(pane2);
		widget2.addChild(pane3);

		return widget1;
	}
	function _createFixedSplitterProgrammaticallyWithSourceNodeReference(){
		// Create FixedSplitter
		var widget1 = new FixedSplitter(WIDGET_PROPS[0], WIDGET_IDS[0].id);
		runner.assertNotEqual(null, widget1);

		var pane1 = new Container(WIDGET_PROPS[1], WIDGET_IDS[1].id);
		var widget2 = new FixedSplitter(WIDGET_PROPS[2], WIDGET_IDS[2].id);
		var pane2 = new Container(WIDGET_PROPS[3], WIDGET_IDS[3].id);
		var pane3 = new Container(WIDGET_PROPS[4], WIDGET_IDS[4].id);
		widget1.startup();

		return widget1;
	}
	function _assertCorrectFixedSplitter(widget, height, width, className){
		_assertCorrectFixedSplitterHW(widget, height, width);
		runner.assertTrue(domClass.contains(widget.domNode, FIXEDSPLITER_CLASSNAME), FIXEDSPLITER_CLASSNAME);
		if(className){
			runner.assertTrue(domClass.contains(widget.domNode, className),  "expected: " + className + " but got " + widget.domNode.className);
		}
	}
	function _assertCorrectContainer(widget, height, width, className){
		_assertCorrectFixedSplitterHW(widget, height, width);
		runner.assertTrue(domClass.contains(widget.domNode, FIXEDSPLITERPANE_CLASSNAME1), FIXEDSPLITERPANE_CLASSNAME1);
		if(className){
			runner.assertTrue(domClass.contains(widget.domNode, className), className);
		}
	}
	function _assertCorrectFixedSplitterHW(widget, height, width){
		runner.assertNotEqual(null, widget, "FixedSplitter: Did not instantiate.");
		runner.assertTrue( (height - 2) < widget.domNode.offsetHeight && widget.domNode.offsetHeight < (height + 2), "expected: " +height + "+-2 but got " + widget.domNode.offsetHeight + "height: id = " + widget.domNode.id);
		runner.assertTrue( (width - 2) < widget.domNode.offsetWidth && widget.domNode.offsetWidth < (width + 2), "expected: " +width + "+-2 but got " + widget.domNode.offsetWidth + "offsetWidth: id = " + widget.domNode.id);
	}
	ready(function(){
		if(WIDGET_PROGRAMMATICALLY === 1){
			_createFixedSplitterProgrammatically("FixedSplitterPlace");
		}else if(WIDGET_PROGRAMMATICALLY === 2){
			_createFixedSplitterProgrammaticallyWithSourceNodeReference();
		}

		runner.register("dojox.mobile.test.doh.FixedSplitter", [
			{
				name: "FixedSplitter Verification",
				timeout: 4000,
				runTest: function(){
					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						var box = window.getBox();
						
						var widget1 = registry.byId("dojox_mobile_FixedSplitter_0");
						var widget2 = registry.byId("dojox_mobile_Container_0");
						var widget3 = registry.byId("dojox_mobile_FixedSplitter_1");
						var widget4 = registry.byId("dojox_mobile_Container_1");
						var widget5 = registry.byId("dojox_mobile_Container_2");

						var box2 = domGeometry.getMarginBox(widget1.domNode);

						runner.assertEqual(box.h, widget2.domNode.offsetHeight + widget5.domNode.offsetHeight);
						runner.assertEqual(box.w, widget4.domNode.offsetWidth + widget5.domNode.offsetWidth);

						_assertCorrectFixedSplitter(widget1, 0, box2.w);
						_assertCorrectContainer(widget2, Math.round(box.h * HEIGHT_RATIO1), box.w);
						_assertCorrectFixedSplitter(widget3, Math.round(box.h * HEIGHT_RATIO2), box.w, FIXEDSPLITERPANE_CLASSNAME3);
						_assertCorrectContainer(widget4, Math.round(box.h * HEIGHT_RATIO2), Math.round(box.w * WIDTH_RATIO1));
						_assertCorrectContainer(widget5, Math.round(box.h * HEIGHT_RATIO2), Math.round(box.w * WIDTH_RATIO2));
					}), timeoutInterval);
					return d;
				}
			}
		]);
		runner.run();
	});
})

