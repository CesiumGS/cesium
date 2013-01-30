require([
	"dojo/_base/Deferred",
	"dojo/store/Cache",
	"dojo/store/JsonRest",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"dojo/ready", // dojo.ready
	"dijit/registry",
	"doh/runner",	//doh functions
	"dojox/mobile/EdgeToEdgeStoreList",
	"dojox/mobile/RoundRectStoreList",
	"dojox/mobile/parser",
	"dojox/mobile",
	"dojox/mobile/compat"
], function(Deferred, Cache, JsonRest, Memory, Observable, ready, registry, runner, EdgeToEdgeStoreList, RoundRectStoreList){

	var CLASS_NAME;
	var DataList;
	var testName;

	if(IsEdgeToEdgeList){
		CLASS_NAME = "mblEdgeToEdgeList";
		DataList = EdgeToEdgeStoreList;
		testName = "dojox.mobile.test.doh.EdgeToEdgeStoreList";
	}else{
		CLASS_NAME = "mblRoundRectList";
		DataList = RoundRectStoreList;
		testName = "dojox.mobile.test.doh.RoundRectStoreList";
	}

	var static_data2 = [
		{label: "Apple", 	moveTo: "dummy"},
		{label: "Banana", 	moveTo: "dummy"},
		{label: "Cherry", 	moveTo: "dummy"},
		{label: "Grape", 	moveTo: "dummy"},
		{label: "Kiwi", 	moveTo: "dummy"},
		{label: "Lemon", 	moveTo: "dummy"},
		{label: "Melon", 	moveTo: "dummy"},
		{label: "Orange", 	moveTo: "dummy"},
		{label: "Peach", 	moveTo: "dummy"}
	];
	var url = "settings2.json";
	store1 = new JsonRest({idProperty:"label", target: url});
	store2 = Observable(new Memory({idProperty:"label", data: static_data2}));
	store1.__counter = store2.__counter = 1;
	store = store1;

	// switch to the selected store
	switchTo = function(store){
		window.store = store;
		registry.byId("list").setStore(store);
	};
	// add a new item
	add1 = function(){
		store.add({
			label: "New Item "+(store.__counter++),
			icon: "../images/i-icon-1.png",
			moveTo: "dummy"
		});
	};
	// delete the added item
	delete1 = function(){
		if(store.__counter > 1){
			store.remove("New Item "+(--store.__counter));
		}
	};

	ready(function(){
		runner.register(testName, [
			{
				name: DataList + " Verification",
				timeout: 4000,
				runTest: function(){
					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){
						var demoWidget = registry.byId("dojox_mobile_ListItem_0");
						runner.assertEqual('mblListItem', demoWidget.domNode.className);
						runner.assertEqual('mblImageIcon mblListItemIcon', demoWidget.iconNode.className);
						runner.assertTrue(demoWidget.iconNode.src.search(/i-icon-1.png/i) != -1);
						runner.assertEqual('mblListItemRightIcon', demoWidget.rightIconNode.className);
						runner.assertEqual('mblListItemLabel', demoWidget.labelNode.className);
						runner.assertEqual('Wi-Fi', demoWidget.labelNode.innerHTML);
						runner.assertEqual('mblDomButtonArrow mblDomButton', demoWidget.rightIconNode.childNodes[0].className);

						demoWidget = registry.byId("dojox_mobile_ListItem_3");
						runner.assertEqual('mblListItem mblListItemSelected', demoWidget.domNode.className);
						runner.assertEqual('mblImageIcon mblListItemIcon', demoWidget.iconNode.className);
						runner.assertTrue(demoWidget.iconNode.src.search(/i-icon-4.png/i) != -1);
						runner.assertEqual('mblListItemRightIcon', demoWidget.rightIconNode.className);
						runner.assertEqual('mblListItemLabel', demoWidget.labelNode.className);
						runner.assertEqual('General', demoWidget.labelNode.innerHTML);
						runner.assertEqual('mblDomButtonArrow mblDomButton', demoWidget.rightIconNode.childNodes[0].className);
						
					}),500);
					return d;
				}
			},
			{
				name: DataList + " Verification2",
				timeout: 10000,
				runTest: function(){
					var d = new doh.Deferred();
					setTimeout(d.getTestCallback(function(){

						switchTo(store2);
						var demoWidget = registry.byId("dojox_mobile_ListItem_13");
						runner.assertEqual('mblListItem', demoWidget.domNode.className);
						runner.assertEqual(null, demoWidget.iconNode);
						runner.assertEqual('mblListItemLabel', demoWidget.labelNode.className);
						runner.assertEqual('Grape', demoWidget.labelNode.innerHTML);
						runner.assertEqual('mblDomButtonArrow mblDomButton', demoWidget.rightIconNode.childNodes[0].className);


					}),2500);
					return d;
				}
			},
			{
				name: DataList + " Verification3",
				timeout: 10000,
				runTest: function(){
					var d = new runner.Deferred();
					setTimeout(d.getTestCallback(function(){

						add1();
						add1();
						add1();
						var demoWidget = registry.byId("dojox_mobile_ListItem_19");
						runner.assertEqual('mblListItem', demoWidget.domNode.className);
						runner.assertEqual('mblImageIcon mblListItemIcon', demoWidget.iconNode.className);
						runner.assertEqual('mblListItemLabel', demoWidget.labelNode.className);
						runner.assertEqual('New Item 1', demoWidget.labelNode.innerHTML);
						runner.assertEqual('mblDomButtonArrow mblDomButton', demoWidget.rightIconNode.childNodes[0].className);

						delete1();
						demoWidget = registry.byId("dojox_mobile_ListItem_21");
						runner.assertTrue(!demoWidget);

						demoWidget = registry.byId("dojox_mobile_ListItem_20");
						runner.assertEqual('mblListItem', demoWidget.domNode.className);
						runner.assertEqual('mblImageIcon mblListItemIcon', demoWidget.iconNode.className);
						runner.assertEqual('mblListItemLabel', demoWidget.labelNode.className);
						runner.assertEqual('New Item 2', demoWidget.labelNode.innerHTML);
						runner.assertEqual('mblDomButtonArrow mblDomButton', demoWidget.rightIconNode.childNodes[0].className);
					}),1500);
					return d;
				}
			}
		]);
		runner.run();
	});
});
