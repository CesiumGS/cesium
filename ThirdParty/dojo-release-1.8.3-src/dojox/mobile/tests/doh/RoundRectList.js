
dojo.addOnLoad(function(){
	doh.register("dojox.mobile.test.doh.RoundRectList", [
		{
			name: "RoundRectList Verification",
			timeout: 4000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){
					var demoWidget = dijit.byId("Category");
					doh.assertEqual('mblRoundRectCategory', demoWidget.domNode.className);
					doh.assertEqual('Spaces', demoWidget.domNode.innerHTML);

					demoWidget = dijit.byId("dojox_mobile_RoundRectList_0");
					doh.assertEqual('mblRoundRectList', demoWidget.domNode.className);
					verifyListItem("item1", 'u1space', 'Off', "mblDomButtonArrow", true, true, false);
					verifyListItem("item2", 'u2space', 'On', "mblDomButtonArrow", true, true, false);
					verifyListItem("item3", 'Wi-Fi', 'Off', "mblDomButtonArrow", false, true, false);
					
				}));
				return d;
			}
		},
		{
			name: "RoundRectList Verification2",
			timeout: 1000,
			runTest: function(){
				var d = new doh.Deferred();
				var demoWidget = dijit.byId("dojox_mobile_RoundRectList_0");
				demoWidget.set({transition :"flip"});
				doh.assertEqual("flip", demoWidget.get("transition"));
				demoWidget.set({transition :"fade"});
				doh.assertEqual("fade", demoWidget.get("transition"));

//				fireOnClick("item3");
				fireOnMouseDown("item3");
				fireOnMouseUp("item3");
				var view = dijit.byId("foo");
				dojo.connect(view, "onAfterTransitionOut", this, d.getTestCallback(function(){
					var demoWidget = dijit.byId("dojox_mobile_RoundRectCategory_0");
					doh.assertEqual('mblRoundRectCategory', demoWidget.domNode.className);
					doh.assertEqual('Applications', demoWidget.domNode.innerHTML);

					demoWidget = dijit.byId("dojox_mobile_RoundRectList_1");
					doh.assertEqual('mblRoundRectList', demoWidget.domNode.className);

					verifyListItem("dojox_mobile_ListItem_0", 'Video', 'Off', "", false, true, false);
					verifyListItem("dojox_mobile_ListItem_1", 'Maps', 'VPN', "", true, false, false);
					verifyListItem("dojox_mobile_ListItem_2", 'Phone Number', 'Off', "", false, false, false);
				}));
				return d;
			}
		},
		{
			name: "RoundRectCategory getLabel",
			timeout: 1000,
			runTest: function(){
				doh.assertEqual("Spaces", dijit.byId("Category").get("label")); 
			}
		},
		{
			name: "RoundRectCategory setLabel",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("Category");
				demoWidget.set({label :"Value Changed"});
				doh.assertEqual("Value Changed", demoWidget.get("label"));
				doh.assertEqual('Value Changed', demoWidget.domNode.innerHTML);
			}
		}
	]);
	doh.run();
});
