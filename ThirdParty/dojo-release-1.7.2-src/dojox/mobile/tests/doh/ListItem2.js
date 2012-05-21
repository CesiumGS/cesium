dojo.addOnLoad(function(){
	doh.register("dojox.mobile.test.doh.ListItem", [
		{
			name: "ListItem Verification",
			timeout: 4000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){

					verifyListItem("dojox_mobile_ListItem_0", 'Sounds', '', "mblDomButtonArrow", true, true, false, false, /i-icon-all.png/i);
					verifyListItemPos("dojox_mobile_ListItem_0", "0px", "116px", "29px", "87px", "0px", "-87px");

					verifyListItem("dojox_mobile_ListItem_1", 'Brightness', '', "mblDomButtonArrow", true, true, false, false, /i-icon-all.png/i);
					verifyListItemPos("dojox_mobile_ListItem_1", "0px", "145px", "29px", "116px", "0px", "-116px");

					verifyListItem("dojox_mobile_ListItem_2", 'XX Widget', '', "mblDomButtonBluePlus", true, true, false, false, /i-icon-all.png/i);								verifyListItemPos("dojox_mobile_ListItem_2", "0px", "116px", "29px", "87px", "0px", "-87px");

					verifyListItem("dojox_mobile_ListItem_3", 'YY Widget', '', "mblDomButtonRedMinus", true, true, false, false, /i-icon-all.png/i);								verifyListItemPos("dojox_mobile_ListItem_3", "0px", "145px", "29px", "116px", "0px", "-116px");
				}));
				return d;
			}
		},
		{
			name: "ListItem set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_RoundRectList_0");
				demoWidget.set({iconBase :""});
				doh.assertEqual("", demoWidget.get("iconBase"));

				verifyListItem("dojox_mobile_ListItem_0", 'Sounds', '', "mblDomButtonArrow", true, true, false, false, /i-icon-all.png/i);
				verifyListItemPos("dojox_mobile_ListItem_0", "0px", "116px", "29px", "87px", "0px", "-87px");

				demoWidget = dijit.byId("dojox_mobile_EdgeToEdgeList_0");
				demoWidget.set({iconBase :""});
				doh.assertEqual("", demoWidget.get("iconBase"));

				verifyListItem("dojox_mobile_ListItem_2", 'XX Widget', '', "mblDomButtonBluePlus", true, true, false, false, /i-icon-all.png/i)
				verifyListItemPos("dojox_mobile_ListItem_2", "0px", "116px", "29px", "87px", "0px", "-87px");
			}
		}
	]);
	doh.run();
});
