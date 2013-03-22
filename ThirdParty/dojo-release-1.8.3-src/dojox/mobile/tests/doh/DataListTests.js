var fruits11, fruits12, fruits13, fruits21, fruits22, fruits23;

require([
	"dojo/_base/lang", //dojo.clone
	"dojo/data/ItemFileWriteStore", // dojo.data.ItemFileWriteStore
	"dojo/dom-construct", // dojo.place
	"dojo/ready", // dojo.ready
	"dijit/registry",  // dijit.byId
	"doh/runner",	//doh functions
	"dojox/mobile/EdgeToEdgeDataList",
	"dojox/mobile/RoundRectDataList",
	"dojox/mobile",				// This is a mobile app.
	"dojox/mobile/View",		// This mobile app uses mobile view
	"dojox/mobile/compat",		// This mobile app supports running on desktop browsers
	"dojox/mobile/parser"		// This mobile app uses declarative programming with fast mobile parser
], function(lang, ItemFileWriteStore, domConst, ready, registry, runner, EdgeToEdgeDataList, RoundRectDataList){

	var CLASS_NAME;
	var DataList;
	var testName;

	if(IsEdgeToEdgeList){
		CLASS_NAME = "mblEdgeToEdgeList";
		DataList = EdgeToEdgeDataList;
		testName = "dojox.mobile.test.doh.EdgeToEdgeDataListTests";
	}else{
		CLASS_NAME = "mblRoundRectList";
		DataList = RoundRectDataList;
		testName = "dojox.mobile.test.doh.RoundRectDataListTests";
	}
	var fruitsData = { 
		items:[ 
			{label:"Apple",		moveTo:"dummy"},
			{label:"Banana", 	moveTo:"dummy"},
			{label:"Cherry", 	moveTo:"dummy"}
		]};
					
	fruits11 = new ItemFileWriteStore({data:lang.clone(fruitsData)});
	fruits12 = new ItemFileWriteStore({data:lang.clone(fruitsData)});
	fruits13 = new ItemFileWriteStore({data:lang.clone(fruitsData)});
	fruits21 = new ItemFileWriteStore({data:lang.clone(fruitsData)});
	fruits22 = new ItemFileWriteStore({data:lang.clone(fruitsData)});
	fruits23 = new ItemFileWriteStore({data:lang.clone(fruitsData)});
			
	function _createDataListDeclaratively(id) {
		return registry.byId(id);
	};
	
	function _createDataListProgrammatically(fruits, placeHolderId){
		var widget = new DataList({store:fruits, query:{label:"*"}});
		runner.assertNotEqual(null, widget);
		domConst.place(widget.domNode, placeHolderId, "replace");
		widget.startup();
		return widget;
	};
	
	function _createDataListProgrammaticallyWithSourceNodeReference(fruits, id){
		var widget = new DataList({store:fruits, query:{label:"*"}}, id);
		widget.startup();
		return widget;
	};

	function _assertCorrectDataList(fruits, dataList){
		runner.assertNotEqual(null, dataList);
		
		runner.assertEqual(CLASS_NAME, dataList.domNode.className, dataList.toString());
		runner.assertEqual(fruitsData.items.length, dataList.domNode.children.length, "length id=" + dataList.domNode.id);
		
		var item = fruits.newItem({label: "Date", moveTo: "dummy"});
		runner.assertEqual(fruits._arrayOfTopLevelItems.length, dataList.domNode.children.length, "new length id=" + dataList.domNode.id);
		
		fruits.deleteItem(item);
		runner.assertEqual(fruits._arrayOfTopLevelItems.length, dataList.domNode.children.length, "delete length id=" + dataList.domNode.id);
	};
	
	function _showView2(){
		var view1 = registry.byId("view1");
		view1.performTransition("view2", 1, "none");
	};

	ready(function(){
		runner.register(testName, [
			function testInView1(){
				var dataList1 = _createDataListDeclaratively("view1-dataList1");
				var dataList2 = _createDataListProgrammatically(fruits12, "view1-dataList2");
				var dataList3 = _createDataListProgrammaticallyWithSourceNodeReference(fruits13, "view1-dataList3");
		
				_assertCorrectDataList(fruits11, dataList1);
				_assertCorrectDataList(fruits12, dataList2);
				_assertCorrectDataList(fruits13, dataList3);
			},
			function testInView2(){
				var dataList1 = _createDataListDeclaratively("view2-dataList1");
				var dataList2 = _createDataListProgrammatically(fruits22, "view2-dataList2");
				var dataList3 = _createDataListProgrammaticallyWithSourceNodeReference(fruits23, "view2-dataList3");
				
				_showView2();
				
				_assertCorrectDataList(fruits21, dataList1);
				_assertCorrectDataList(fruits22, dataList2);
				_assertCorrectDataList(fruits23, dataList3);
			}
		]);
		runner.run();
	});
})
