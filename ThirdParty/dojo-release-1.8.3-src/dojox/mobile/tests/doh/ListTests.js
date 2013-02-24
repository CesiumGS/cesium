require([
	"dojo/dom-construct", // dojo.place
	"dojo/ready", // dojo.ready
	"dijit/registry",  // dijit.byId
	"doh/runner",	//doh functions
	"dojox/mobile/EdgeToEdgeList",
	"dojox/mobile/RoundRectList",
	"dojox/mobile/ListItem",
	"dojox/mobile",				// This is a mobile app.
	"dojox/mobile/View",		// This mobile app uses mobile view
	"dojox/mobile/compat",		// This mobile app supports running on desktop browsers
	"dojox/mobile/parser"		// This mobile app uses declarative programming with fast mobile parser
], function(domConst, ready, registry, runner, EdgeToEdgeList, RoundRectList, ListItem){

	var ITEM_LABEL, ListObject, testName;
	
	if(IsEdgeToEdgeList){
		ITEM_LABEL = "Edge To Edge";
		ListObject = EdgeToEdgeList;
		testName = "dojox.mobile.test.doh.EdgeToEdgeListTests";
	}else{
		ITEM_LABEL = "Round Rect";
		ListObject = RoundRectList;
		testName = "dojox.mobile.test.doh.RoundRectListTests";
	}

	function _createListObjectDeclaratively(id) {
		return registry.byId(id);
	};
	
	function _createListObjectProgrammatically(placeHolderId){
		var widget = new ListObject({select:"single"});
		runner.assertNotEqual(null, widget);
		var item = new ListItem({label:ITEM_LABEL + " 1", checked:true});
		widget.addChild(item);
		item = new ListItem({label:ITEM_LABEL + " 2"});
		widget.addChild(item);
		domConst.place(widget.domNode, placeHolderId, "replace");
		widget.startup();
		return widget;
	};
	
	function _createListObjectProgrammaticallyWithSourceNodeReference(id){
		var list = new ListObject({select:"single"}, id);
		var item = new ListItem({label:ITEM_LABEL + " 1", checked:true});
		list.addChild(item);
		item = new ListItem({label:ITEM_LABEL + " 2"});
		list.addChild(item);
		list.startup();
		return list;
	};

	function _assertCorrectListObject(list){
		runner.assertNotEqual(null, list);
		var children = list.getChildren();
		var length = children.length;
		runner.assertEqual(2, length, list.toString());
		runner.assertTrue(children[0].checked, children[0].toString());
	};
	
	function _showView2(){
		var view1 = registry.byId("view1");
		view1.performTransition("view2", 1, "none");
	};

	ready(function(){
		runner.register("dojox.mobile.test.doh.EdgeToEdgeListTests", [
			function testInView1(){
				var list1 = _createListObjectDeclaratively("view1-list1");
				var list2 = _createListObjectProgrammatically("view1-list2");
				var list3 = _createListObjectProgrammaticallyWithSourceNodeReference("view1-list3");
		
				_assertCorrectListObject(list1);
				_assertCorrectListObject(list2);
				_assertCorrectListObject(list3);
			},
			function testInView2(){
				var list1 = _createListObjectDeclaratively("view2-list1");
				var list2 = _createListObjectProgrammatically("view2-list2");
				var list3 = _createListObjectProgrammaticallyWithSourceNodeReference("view2-list3");
				
				_showView2();
				
				_assertCorrectListObject(list1);
				_assertCorrectListObject(list2);
				_assertCorrectListObject(list3);
			}
		]);
		runner.run();
	});
})
