dojo.addOnLoad(function(){
	doh.register("dojox.mobile.test.doh.Heading2", [
		{
			name: "Heading Verification",
			timeout: 4000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){
					var demoWidget = dijit.byId("dojox_mobile_Heading_0");
					doh.assertTrue('mblHeading mblHeadingCenterTitle' == demoWidget.domNode.className || 'mblHeading' == demoWidget.domNode.className);
					doh.assertEqual('General', demoWidget.domNode.childNodes[1].childNodes[0].nodeValue);
					doh.assertEqual('Settings', demoWidget.backButton.labelNode.innerHTML);

					demoWidget = dijit.byId("dojox_mobile_Heading_1");
					doh.assertTrue('mblHeading mblHeadingCenterTitle' == demoWidget.domNode.className || 'mblHeading' == demoWidget.domNode.className);
					doh.assertEqual('Test', demoWidget.domNode.childNodes[1].childNodes[0].nodeValue);
					doh.assertEqual('Go To', demoWidget.backButton.labelNode.innerHTML);

					demoWidget = dijit.byId("dojox_mobile_Heading_2");
					doh.assertTrue('mblHeading mblHeadingCenterTitle' == demoWidget.domNode.className || 'mblHeading' == demoWidget.domNode.className);
					doh.assertEqual('Test', demoWidget.domNode.childNodes[1].childNodes[0].nodeValue);
					doh.assertEqual('Settings', demoWidget.backButton.labelNode.innerHTML);

					demoWidget = dijit.byId("dojox_mobile_Heading_3");
					doh.assertTrue('mblHeading mblHeadingCenterTitle' == demoWidget.domNode.className || 'mblHeading' == demoWidget.domNode.className);
					doh.assertEqual('Very Very Long Title May Not Be Displayed in the Narrow Space', demoWidget.domNode.childNodes[1].childNodes[0].nodeValue);
					doh.assertEqual('3', demoWidget.domNode.childNodes.length);
					doh.assertEqual('Long Button', demoWidget.backButton.labelNode.innerHTML);
				}));
				return d;
			}
		},
		{
			name: "Set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_Heading_2");
				demoWidget.set({back:"Value Changed", label:"Value Changed", moveTo:"bar", transition:"flip"});
				doh.assertEqual("Value Changed", demoWidget.get("label"), 'get("label")');
				doh.assertEqual("Value Changed", demoWidget.get("back"), 'get("back")');
				doh.assertEqual("bar", demoWidget.get("moveTo"));
				doh.assertEqual("flip", demoWidget.get("transition"));
				doh.assertEqual('Value Changed', demoWidget.backButton.label, "demoWidget.backButton.label");
				doh.assertEqual('Value Changed', demoWidget.backButton.labelNode.innerHTML, "demoWidget.backButton.labelNode.innerHTML");

				demoWidget = dijit.byId("dojox_mobile_Heading_5");
				demoWidget.set({transition:"fade"});
				doh.assertEqual("fade", demoWidget.get("transition"));
			}
		},
		{
			name: "moveTo",
			timeout: 1000,
			runTest: function(){
				var d = new doh.Deferred();
				var demoWidget = dijit.byId("dojox_mobile_Heading_2");
//				fireOnClick(demoWidget.domNode.childNodes[0].childNodes[1]);
				fireOnMouseDown(demoWidget.backButton.domNode);
				fireOnMouseUp(demoWidget.backButton.domNode);
				setTimeout(d.getTestCallback(function(){

					var demoWidget = dijit.byId("bar");
					doh.assertEqual('visible', demoWidget.domNode.style.visibility);
				}));
				return d;
			}
		},
		{
			name: "moveTo",
			timeout: 1000,
			runTest: function(){
				setTimeout(function(){
					var d = new doh.Deferred();
					var demoWidget = dijit.byId("dojox_mobile_Heading_5");
					fireOnClick(demoWidget.domNode.childNodes[0].childNodes[1]);
					setTimeout(d.getTestCallback(function(){
						var demoWidget = dijit.byId("general");
						doh.assertEqual('visible', demoWidget.domNode.style.visibility);
					}));
					return d;
				},1500);
			}
/*		},
		{
			name: "moveTo",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_Heading_1");
				demoWidget.set({href:"about:blank"});
				doh.assertEqual("about:blank", demoWidget.get("href"));

				var d = new doh.Deferred();
				fireOnClick(demoWidget.domNode.childNodes[0].childNodes[1]);
				setTimeout(d.getTestCallback(function(){
				}));
				return d;
			}
*/
		}
	]);
	doh.run();
});
