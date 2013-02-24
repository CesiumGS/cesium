var timeoutInterval = 3000;

var WIDGET_CLASSNAME1 = "mblPageIndicator";
var WIDGET_CLASSNAME2 = "mblFixedBottomBar";
var WIDGET_DOT_CLASSNAME1 = "mblPageIndicatorDot";
var WIDGET_DOT_CLASSNAME2 = "mblPageIndicatorDotSelected";
var WIDGET_PAGENUM = 5;

require([
	"dojo/_base/connect",
	"dojo/_base/sniff",
	"dojo/dom-construct", // dojo.place
	"dojo/dom-class", // dojo.hasClass
	"dojo/ready", // dojo.ready
	"dijit/registry",  // dijit.byId
	"doh/runner",	//doh functions
	"dojox/mobile/PageIndicator",
	"dojox/mobile",				// This is a mobile app.
	"dojox/mobile/SwapView",		// This mobile app uses mobile view
	"dojox/mobile/compat",		// This mobile app supports running on desktop browsers
	"dojox/mobile/parser"		// This mobile app uses declarative programming with fast mobile parser
], function(connect, has, domConst, domClass, ready, registry, runner, PageIndicator){
	function fireOnClick(node){
		if(has("ie")<9){
			var e = document.createEventObject();
			e.layerX = 0;
			node.fireEvent( "onclick" );
		}else{
			var e = document.createEvent('Events');
			e.initEvent('click', true, true);
			e.layerX = 0;
			node.dispatchEvent(e);
		}
	}
	function _createPageIndicatorDeclaratively(widgetId) {
		return registry.byId(widgetId);
	};
	function _createPageIndicatorProgrammatically(placeHolderId, widgetId){
		// Create SwapView
		var r = new PageIndicator({id:widgetId, fixed:"bottom"});
		runner.assertNotEqual(null, r);
		domConst.place(r.domNode, placeHolderId, "replace");
		
		r.startup();
		_initAppBars();

		return r;
	};
	function _createPageIndicatorProgrammaticallyWithSourceNodeReference(widgetId){
		// Create IconContainer
		var r = new PageIndicator({}, widgetId);

		r.startup();
		_initAppBars();

		return r;
	};
	function _initAppBars(){
		var view1 = registry.byId("dojox_mobile_SwapView_0");
		view1.findAppBars();
		view1.resize();

		var view2 = registry.byId("dojox_mobile_SwapView_1");
		view2.findAppBars();
		view2.resize();

		var view3 = registry.byId("dojox_mobile_SwapView_2");
		view3.findAppBars();
		view3.resize();

		var view4 = registry.byId("dojox_mobile_SwapView_3");
		view4.findAppBars();
		view4.resize();

		var view5 = registry.byId("dojox_mobile_SwapView_4");
		view5.findAppBars();
		view5.resize();
	};
	function _assertCorrectPageIndicator(widget, col){
		runner.assertNotEqual(null, widget, "IconContainer: Did not instantiate.");
		runner.assertTrue(domClass.contains(widget.domNode, WIDGET_CLASSNAME1), WIDGET_CLASSNAME1);
		runner.assertTrue(domClass.contains(widget.domNode, WIDGET_CLASSNAME2), WIDGET_CLASSNAME2);
		var r = widget._tblNode.rows[0];
		runner.assertEqual(WIDGET_PAGENUM, widget._tblNode.rows[0].cells.length, "Number of page");
		for(i = 0; i < r.cells.length; i++){
			dot = r.cells[i].firstChild;
			runner.assertTrue(domClass.contains(dot, WIDGET_DOT_CLASSNAME1), WIDGET_DOT_CLASSNAME1);
			if(i+1 === col){
				runner.assertTrue(domClass.contains(dot, WIDGET_DOT_CLASSNAME2), WIDGET_DOT_CLASSNAME2);
			}
		}
	};
	ready(function(){
		if(WIDGET_PROGRAMMATICALLY === 1){
			_createPageIndicatorProgrammatically("dojox_mobile_PageIndicator_0Place", "dojox_mobile_PageIndicator_0");
		}else if(WIDGET_PROGRAMMATICALLY === 2){
			_createPageIndicatorProgrammaticallyWithSourceNodeReference("dojox_mobile_PageIndicator_0");
		}

		runner.register("dojox.mobile.test.doh.PageIndicator", [
			{
				name: "PageIndicator Verification1",
				timeout: 4000,
				runTest: function(){

					var view1 = registry.byId("dojox_mobile_SwapView_0");
					var view2 = registry.byId("dojox_mobile_SwapView_1");
					var widget1 = registry.byId("dojox_mobile_PageIndicator_0");

					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						_assertCorrectPageIndicator(widget1, 1);
						view1.goTo(1);
					}), timeoutInterval);
					return d;
			
				}
			},
			{
				name: "PageIndicator Verification2",
				timeout: 4000,
				runTest: function(){
					var view2 = registry.byId("dojox_mobile_SwapView_1");
					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						var widget1 = registry.byId("dojox_mobile_PageIndicator_0");
						_assertCorrectPageIndicator(widget1, 2);
						view2.goTo(1);
					}), timeoutInterval);
					return d;
				}
			},
			{
				name: "PageIndicator Verification3",
				timeout: 4000,
				runTest: function(){
					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						var widget1 = registry.byId("dojox_mobile_PageIndicator_0");
						_assertCorrectPageIndicator(widget1, 3);
						fireOnClick(widget1.domNode);
					}), timeoutInterval);
					return d;
				}
			},
			{
				name: "PageIndicator Verification4",
				timeout: 4000,
				runTest: function(){
					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						var widget1 = registry.byId("dojox_mobile_PageIndicator_0");
						_assertCorrectPageIndicator(widget1, 2);
					}), timeoutInterval);
					return d;
				}
			}
		]);
		runner.run();
	});
})
