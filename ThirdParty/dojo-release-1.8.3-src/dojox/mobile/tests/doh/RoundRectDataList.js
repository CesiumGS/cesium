dojo.addOnLoad(function(){
	doh.register("dojox.mobile.test.doh.RoundRectDataList", [
		{
			name: "RoundRectDataList Verification",
			timeout: 4000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){
					verifyListItem("dojox_mobile_ListItem_0", 'Wi-Fi', '', "mblDomButtonArrow", true, true, false, false, /i-icon-1.png/i);

					verifyListItem("dojox_mobile_ListItem_3", 'General', '', "mblDomButtonArrow", true, true, false, false, /i-icon-4.png/i, true);
					
				}),500);
				return d;
			}
		},
		{
			name: "RoundRectDataList Verification2",
			timeout: 10000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){

					add1();
					add1();
					add1();
					verifyListItem("dojox_mobile_ListItem_12", 'New Item', '', "mblDomButtonArrow", false, true, false, false);

					delete1();
					demoWidget = dijit.byId("dojox_mobile_ListItem_12");
					doh.assertTrue(!demoWidget);

					verifyListItem("dojox_mobile_ListItem_11", 'New Item', '', "mblDomButtonArrow", false, true, false, false);

				}),1500);
				return d;
			}
		},
		{
			name: "RoundRectDataList Verification3",
			timeout: 10000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){

					switchTo(store2);
					verifyListItem("dojox_mobile_ListItem_13", 'Apple', '', "mblDomButtonArrow", false, true, false, false);

				}),2500);
				return d;
			}
		}
	]);
	doh.run();
});
