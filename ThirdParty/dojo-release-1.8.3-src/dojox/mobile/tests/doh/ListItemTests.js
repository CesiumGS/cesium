var WIDGET_CLASSNAME1 = "mblListItem";
var WIDGET_ANCHOR_CLASSNAME1 = "mblListItemAnchor";
var WIDGET_ANCHOR_CLASSNAME2 = "mblListItemAnchorNoIcon";
var WIDGET_ICON_CLASSNAME1 = "mblListItemIcon";
var WIDGET_RIGHTICON_CLASSNAME1 = "mblListItemRightIcon";
var WIDGET_DOMBUTTON_ARROW = "mblDomButtonArrow";
var WIDGET_DOMBUTTON_BLUEPLUS = "mblDomButtonBluePlus";
var WIDGET_DOMBUTTON_CHECKBOX_ON = "mblDomButtonCheckboxOn";

require([
	"dojo/_base/connect",
	"dojo/dom-class", // dojo.hasClass
	"dojo/ready", // dojo.ready
	"dijit/registry",  // dijit.byId
	"dojo/string", // dojo.trim
	"doh/runner",	//doh functions
	"dojox/mobile/ListItem",
	"dojox/mobile/RoundRectList",
	"dojox/mobile/EdgeToEdgeList",
	"dojox/mobile",				// This is a mobile app.
	"dojox/mobile/View",		// This mobile app uses mobile view
	"dojox/mobile/compat",		// This mobile app supports running on desktop browsers
	"dojox/mobile/parser"		// This mobile app uses declarative programming with fast mobile parser
], function(connect, domClass, ready, registry, string, runner, ListItem){


	function _createListItemDeclaratively(widgetId) {
		return registry.byId(widgetId);
	};

	function _createListItemProgrammatically(parentId, widgetId){
		// Create SwapView
		parentWidget = registry.byId(parentId);;
		runner.assertNotEqual(null, parentWidget, "No parentWidget id=" + parentId);
		var r;
		r = new ListItem({id:widgetId[0], icon:"../images/i-icon-1.png", rightText:"Off", moveTo:"bar", label:"u1space"});
		parentWidget.addChild(r);
		r = new ListItem({id:widgetId[1], label:"u2space"});
		parentWidget.addChild(r);
		r = new ListItem({id:widgetId[2], rightIcon:"mblDomButtonBluePlus", label:"Wi-Fi"});
		parentWidget.addChild(r);
		r = new ListItem({id:widgetId[3], rightIcon:"mblDomButtonCheckboxOn", label:"VPN"});
		parentWidget.addChild(r);
		r = new ListItem({id:widgetId[4], variableHeight:"true", style:"font-size:10px", label:'<div>1. <a href="#" class="lnk">Dojo: Traditional Karate-do Spirit</a><br>Sarah Connor Hardcover<br>Eligible for FREE Super Saver Shipping<br><font color="red">$14.50 (50%)</font> In Stock<br># (531)</div>'});
		parentWidget.addChild(r);
		
		return parentWidget;
	};

	function _createListItemProgrammaticallyWithSourceNodeReference(widgetId){
		// Create IconContainer
		var r;
		r = new ListItem({icon:"../images/i-icon-1.png", rightText:"Off", moveTo:"bar"}, widgetId[0]);
		r.startup();
		r = new ListItem({}, widgetId[1]);
		r.startup();
		r = new ListItem({rightIcon:"mblDomButtonBluePlus"}, widgetId[2]);
		r.startup();
		r = new ListItem({rightIcon:"mblDomButtonCheckboxOn"}, widgetId[3]);
		r.startup();
		r = new ListItem({variableHeight:"true"}, widgetId[4]);
		r.startup();

		return r;
	};



	function _assertCorrectListItems(widgetId){
		_assertCorrectListItem(widgetId[0], false, WIDGET_DOMBUTTON_ARROW, "", "Off", "u1space");
		_assertCorrectListItem(widgetId[1], true, "", "", "", "u2space");
		_assertCorrectListItem(widgetId[2], true, WIDGET_DOMBUTTON_BLUEPLUS, "", "", "Wi-Fi");
		_assertCorrectListItem(widgetId[3], true, WIDGET_DOMBUTTON_CHECKBOX_ON, "", "", "VPN");
		_assertCorrectListItem(widgetId[4], true, "", "", "", '');
	};

	function _assertCorrectListItem(widgetId, noIcon, rightIcon, rightIcon2, rightText, boxText){
		var widget = registry.byId(widgetId);
		doh.assertNotEqual(null, widget, "ListItem: Did not instantiate.");
		runner.assertTrue(domClass.contains(widget.domNode, WIDGET_CLASSNAME1), WIDGET_CLASSNAME1 + " id=" + widget.domNode.id);
		if(!noIcon){
			runner.assertTrue(widget.iconNode, "iconNode: There is no iconNode. id=" + widget.domNode.id);
			runner.assertTrue(domClass.contains(widget.iconNode, WIDGET_ICON_CLASSNAME1), WIDGET_ICON_CLASSNAME1 + " id=" + widget.domNode.id);
			if(dojo.isIE!=6){
				runner.assertTrue(!!widget.iconNode.src, "iconNode: There is no src in iconNode. id=" + widget.domNode.id);
			}
		}
		if(rightIcon){
			runner.assertTrue(widget.rightIconNode, "rightIconNode: There is no rightIconNode. id=" + widget.domNode.id);
			runner.assertEqual(WIDGET_RIGHTICON_CLASSNAME1, widget.rightIconNode.className);
			runner.assertTrue(domClass.contains(widget.rightIconNode.childNodes[0], rightIcon), rightIcon + " id=" + widget.domNode.id);
		}
		if(rightIcon2){
			runner.assertTrue(widget.rightIconNode2, "rightIconNode2: There is no rightIconNode2. id=" + widget.domNode.id);
			runner.assertTrue(domClass.contains(widget.rightIconNode2, rightIcon2), rightIcon2 + " id=" + widget.domNode.id);
		}
		if(rightText){
			runner.assertTrue(widget.rightTextNode, "rightTextNode: There is no rightTextNode. id=" + widget.domNode.id);
			runner.assertEqual(rightText, widget.rightTextNode.innerHTML);
		}
		if(boxText){
			runner.assertTrue(widget.labelNode, "box: There is no box. id=" + widget.domNode.id);
			var innerHTML = string.trim(widget.labelNode.innerHTML.replace(/\r\n/g,""));
			runner.assertEqual(boxText, innerHTML, "id=" + widget.domNode.id);
		}
	};

	function _showView2(){
		var view1 = registry.byId("view1");
		view1.performTransition("view2", 1, "none");
	};

	ready(function(){
		runner.register("dojox.mobile.test.doh.Heading", [
			{
				name: "ListItem Verification1",
				timeout: 4000,
				runTest: function(){
					_createListItemProgrammatically("view1-RoundRectList2", ["view1-item6", "view1-item7", "view1-item8", "view1-item9", "view1-item10"]);
					_createListItemProgrammaticallyWithSourceNodeReference(["view1-item11", "view1-item12", "view1-item13", "view1-item14", "view1-item15"]);

					_assertCorrectListItems(["view1-item1", "view1-item2", "view1-item3", "view1-item4", "view1-item5"]);
					_assertCorrectListItems(["view1-item6", "view1-item7", "view1-item8", "view1-item9", "view1-item10"]);
					_assertCorrectListItems(["view1-item11", "view1-item12", "view1-item13", "view1-item14", "view1-item15"]);
				}
			},
			{
				name: "ListItem Verification2",
				timeout: 4000,
				runTest: function(){
					_createListItemProgrammatically("view2-RoundRectList2", ["view2-item6", "view2-item7", "view2-item8", "view2-item9", "view2-item10"]);
					_createListItemProgrammaticallyWithSourceNodeReference(["view2-item11", "view2-item12", "view2-item13", "view2-item14", "view2-item15"]);

					var d = new runner.Deferred();
					var handle2 = connect.subscribe("/dojox/mobile/afterTransitionIn", d.getTestCallback(function(view){
						if(view.id=="view2"){
							connect.unsubscribe(handle2);
						}
						_assertCorrectListItems(["view2-item1", "view2-item2", "view2-item3", "view2-item4", "view2-item5"]);
						_assertCorrectListItems(["view2-item6", "view2-item7", "view2-item8", "view2-item9", "view2-item10"]);
						_assertCorrectListItems(["view2-item11", "view2-item12", "view2-item13", "view2-item14", "view2-item15"]);
					}));
					_showView2();
					return d;
				}
			}
		]);
		runner.run();
	});
})
