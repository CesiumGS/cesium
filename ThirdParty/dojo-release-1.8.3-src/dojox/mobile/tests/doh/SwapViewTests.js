require([
	"dojo/_base/connect",
	"dojo/dom-construct", // dojo.place
	"dojo/dom-class", // dojo.hasClass
	"dojo/ready", // dojo.ready
	"dijit/registry",  // dijit.byId
	"doh/runner",	//doh functions
	"dojox/mobile/SwapView",	// This mobile app uses mobile view
	"dojox/mobile",				// This is a mobile app.
	"dojox/mobile/compat",		// This mobile app supports running on desktop browsers
	"dojox/mobile/parser"		// This mobile app uses declarative programming with fast mobile parser
], function(connect, domConst, domClass, ready, registry, runner, SwapView){


	var timeoutInterval = 1000;
	var WIDGET_CLASSNAME1 = "mblView";
	var WIDGET_CLASSNAME2 = "mblSwapView";


	function _createSwapViewDeclaratively(widgetId) {
		return registry.byId(widgetId);
	};

	function _createSwapViewProgrammatically(placeHolderId, widgetId, selected, innerHTML){
		// Create SwapView
		var r = new dojox.mobile.SwapView({id:widgetId, selected:selected, innerHTML:innerHTML});
		runner.assertNotEqual(null, r);
		domConst.place(r.domNode, placeHolderId, "replace");
		r.startup();
		
		return r;
	};

	function _createSwapViewProgrammaticallyWithSourceNodeReference(widgetId, selected){
		// Create IconContainer
		var r = new SwapView({selected:selected}, widgetId);

		r.startup();
		return r;
	};

	function _assertCorrectSwapView(widget, display){
		runner.assertNotEqual(null, widget, "IconContainer: Did not instantiate.");
		runner.assertTrue(domClass.contains(widget.domNode, WIDGET_CLASSNAME1), WIDGET_CLASSNAME1);
		runner.assertTrue(domClass.contains(widget.domNode, WIDGET_CLASSNAME2), WIDGET_CLASSNAME2);
		runner.assertEqual(display?"":"none", widget.domNode.style.display, "widget.domNode.style.display");
		
	};

	function _assertCorrectSwapViewPos(widgetId, top, left){
	};


	ready(function(){
		if(WIDGET_PROGRAMMATICALLY === 1){
			_createSwapViewProgrammatically("fooPlace", "foo", true, "<h1>SwapView 1</h1>");
			_createSwapViewProgrammatically("barPlace", "bar", false, "<h1>SwapView 2</h1>");
		}else if(WIDGET_PROGRAMMATICALLY === 2){
			_createSwapViewProgrammaticallyWithSourceNodeReference("foo", true);
			_createSwapViewProgrammaticallyWithSourceNodeReference("bar", false);
		}

		runner.register("dojox.mobile.test.doh.SwapViewTests", [
			{
				name: "SwapView Verification1",
				timeout: 4000,
				runTest: function(){

					var widget1 = registry.byId("foo");
					var widget2 = registry.byId("bar");

					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						var widget1 = registry.byId("foo");
						var widget2 = registry.byId("bar");
						_assertCorrectSwapView(widget1, true);
						_assertCorrectSwapView(widget2, false);
						widget1.goTo(1);
					}), timeoutInterval);
					return d;
			
				}
			},
			{
				name: "SwapView Verification2",
				timeout: 4000,
				runTest: function(){
					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						var widget1 = registry.byId("foo");
						var widget2 = registry.byId("bar");
						_assertCorrectSwapView(widget1, false);
						_assertCorrectSwapView(widget2, true);
					}), timeoutInterval);
					return d;
				}
			}
		]);
		runner.run();
	});
})
