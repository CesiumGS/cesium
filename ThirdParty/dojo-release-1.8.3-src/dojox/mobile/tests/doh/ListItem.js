dojo.addOnLoad(function(){
	doh.register("dojox.mobile.test.doh.ListItem", [
		{
			name: "ListItem Verification",
			timeout: 4000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){
					verifyListItem("dojox_mobile_ListItem_0", 'External View #1 (sync)', '', "mblDomButtonArrow", true, true, false, false, /i-icon-1.png/i);
					verifyListItem("dojox_mobile_ListItem_1", 'External View #2 (async)', '', "mblDomButtonArrow", true, true, false);
					verifyListItem("dojox_mobile_ListItem_2", 'External View #3 (sync)', '', "mblDomButtonArrow", true, true, false);
					verifyListItem("dojox_mobile_ListItem_3", 'Video', 'Off', "", false, false, false);
					verifyListItem("dojox_mobile_ListItem_4", 'Maps', 'VPN', "", true, false, false);
					verifyListItem("dojox_mobile_ListItem_5", 'Jack Coleman', '', "", false, false, false);
					verifyListItem("dojox_mobile_ListItem_6", 'Sounds', '', "mblDomButtonArrow", true, true, false);
					verifyListItem("dojox_mobile_ListItem_7", 'Brightness', '', "mblDomButtonArrow", true, true, false);
					verifyListItem("dojox_mobile_ListItem_8", 'Wallpaper', '', "mblDomButtonArrow", true, true, false);
					verifyListItem("dojox_mobile_ListItem_9", 'XX Widget', '', "mblDomButtonBluePlus", true, true, false);
					verifyListItem("dojox_mobile_ListItem_10", 'YY Widget', '', "mblDomButtonRedMinus", true, true, false);
					
					var txt = 'See location in applications (such as Maps) using wireless networks';
					verifyListItem("dojox_mobile_ListItem_11", txt, '', "mblDomButtonCheckboxOff", false, true, false, true);
					
					txt = 'When locating, accurate to street level (uncheck to conserve battery)';
					verifyListItem("dojox_mobile_ListItem_12", txt, '', "mblDomButtonCheckboxOn", false, true, false, true);

					verifyListItem("dojox_mobile_ListItem_13", 'Set unlock pattern', '', "", false, false, false);
				}));
				return d;
			}
		},
		{
			name: "ListItem set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_ListItem_0");
				demoWidget.set({transition :"flip", url:"../view2.html", noArrow:true, selected:true, anchorLabel:true, rightText:"Value Changed"});
				doh.assertEqual("flip", demoWidget.get("transition"));
				doh.assertEqual("../view2.html", demoWidget.get("url"));
				doh.assertTrue(demoWidget.get("noArrow"), 'get("noArrow")');
				doh.assertTrue(demoWidget.get("selected"), 'get("selected")');
				doh.assertTrue(demoWidget.get("anchorLabel"), 'get("anchorLabel")');
				doh.assertEqual("Value Changed", demoWidget.get("rightText"));

				verifyListItem("dojox_mobile_ListItem_0", 'External View #1 (sync)', 'Value Changed', "mblDomButtonArrow", true, true, false, false, null, true);
			}
		},
		{
			name: "ListItem set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_ListItem_1");
				demoWidget.set({icon :"../images/i-icon-4.png", label:"Value Changed", clickable:true, url:"../view3.html", transition :"slide", transitionDir:-1, sync:false, toggle:true, _duration:1600});

				doh.assertEqual("slide", demoWidget.get("transition"));
				doh.assertEqual("../view3.html", demoWidget.get("url"));
				doh.assertEqual(-1, demoWidget.get("transitionDir"));
				doh.assertTrue(demoWidget.get("clickable"), 'get("clickable")');
				doh.assertFalse(demoWidget.get("sync"), 'get("sync")');
				doh.assertTrue(demoWidget.get("toggle"), 'get("toggle")');
				doh.assertEqual(1600, demoWidget.get("_duration"));
				doh.assertEqual("Value Changed", demoWidget.get("label"));

				verifyListItem("dojox_mobile_ListItem_1", 'Value Changed', '', "mblDomButtonArrow", true, true, false, false, /i-icon-4.png/i);
			}
		},
		{
			name: "ListItem set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_ListItem_6");
				demoWidget.set({iconPos :"0,116,29,29", moveTo:"bar", transition :"fade"});

				doh.assertEqual("bar", demoWidget.get("moveTo"));
				doh.assertEqual("0,116,29,29", demoWidget.get("iconPos"));
				doh.assertEqual("fade", demoWidget.get("transition"));

				verifyListItem("dojox_mobile_ListItem_6", 'Sounds', '', "mblDomButtonArrow", true, true, false, false, /i-icon-all.png/i, false, true);
			}
		},
		{

//Todo
			name: "ListItem set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_ListItem_6");
				demoWidget.set({href :"", hrefTarget:""});

				doh.assertEqual("", demoWidget.get("href"));
				doh.assertEqual("", demoWidget.get("hrefTarget"));

			}
		},
		{
			name: "ListItem set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_ListItem_9");
				demoWidget.set({rightIcon:"mblDomButtonRedMinus"});
				verifyListItem("dojox_mobile_ListItem_9", 'XX Widget', '', "mblDomButtonRedMinus", true, true, false);
//							doh.assertEqual("mblDomButtonRedMinus", demoWidget.get("icon"));
			}
		},
		{
			name: "ListItem set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_ListItem_11");
				demoWidget.set({rightIcon:"mblDomButtonCheckboxOn"});

				var txt = 'See location in applications (such as Maps) using wireless networks';
				verifyListItem("dojox_mobile_ListItem_11", txt, '', "mblDomButtonCheckboxOn", false, true, false, true);
//							doh.assertEqual("mblDomButtonCheckboxOn", demoWidget.get("icon"));
			}
		}
	]);
	doh.run();
});
