dojo.addOnLoad(function(){
	doh.register("dojox.mobile.test.doh.Switch", [
		{
			name: "Switch Verification",
			timeout: 4000,
			runTest: function(){
				var d = new doh.Deferred();
				setTimeout(d.getTestCallback(function(){
					var demoWidget = dijit.byId("dojox_mobile_Switch_0");
					doh.assertTrue(demoWidget.domNode.className.search(/mblSwitch/i) != -1);
					doh.assertTrue(demoWidget.domNode.className.search(/mblSwitchOff/i) != -1);
					doh.assertTrue(demoWidget.domNode.className.search(/float/i) != -1);

					doh.assertEqual('mblSwitchInner', demoWidget.inner.className);
					doh.assertEqual('mblSwitchBg mblSwitchBgLeft', demoWidget.inner.childNodes[0].className);
					doh.assertEqual('none', demoWidget.inner.childNodes[0].style.display);
					doh.assertEqual('mblSwitchText mblSwitchTextLeft', demoWidget.inner.childNodes[0].childNodes[0].className);
					doh.assertEqual('ON', demoWidget.inner.childNodes[0].childNodes[0].innerHTML);
					doh.assertEqual('mblSwitchBg mblSwitchBgRight', demoWidget.inner.childNodes[1].className);
					doh.assertEqual('mblSwitchText mblSwitchTextRight', demoWidget.inner.childNodes[1].childNodes[0].className);
					doh.assertEqual('OFF', demoWidget.inner.childNodes[1].childNodes[0].innerHTML);
					doh.assertEqual('mblSwitchKnob', demoWidget.inner.childNodes[2].className);

					demoWidget = dijit.byId("dojox_mobile_Switch_1");
					doh.assertEqual('mblSwitch mblSwDefaultShape mblSwitchOn', demoWidget.domNode.className);
					doh.assertEqual('mblSwitchInner', demoWidget.inner.className);
					doh.assertEqual('mblSwitchBg mblSwitchBgLeft', demoWidget.inner.childNodes[0].className);
					doh.assertEqual('mblSwitchText mblSwitchTextLeft', demoWidget.inner.childNodes[0].childNodes[0].className);
					doh.assertEqual('Start', demoWidget.inner.childNodes[0].childNodes[0].innerHTML);
					doh.assertEqual('mblSwitchBg mblSwitchBgRight', demoWidget.inner.childNodes[1].className);
					doh.assertEqual('none', demoWidget.inner.childNodes[1].style.display);
					doh.assertEqual('mblSwitchText mblSwitchTextRight', demoWidget.inner.childNodes[1].childNodes[0].className);
					doh.assertEqual('Stop', demoWidget.inner.childNodes[1].childNodes[0].innerHTML);
					doh.assertEqual('mblSwitchKnob', demoWidget.inner.childNodes[2].className);
					
				}));
				return d;
			}
		},
		{
			name: "Switch set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_Switch_0");
				demoWidget.set({value :"on"});
				doh.assertEqual("on", demoWidget.get("value"));
//							doh.assertEqual('none', demoWidget.inner.childNodes[1].style.display);
			}
		},
		{
			name: "Switch set",
			timeout: 1000,
			runTest: function(){
				var demoWidget = dijit.byId("dojox_mobile_Switch_0");
				demoWidget.set({leftLabel :"Start", rightLabel:"Stop"});
				doh.assertEqual("Start", demoWidget.get("leftLabel"));
				doh.assertEqual("Stop", demoWidget.get("rightLabel"));
				doh.assertEqual('Start', demoWidget.inner.childNodes[0].childNodes[0].innerHTML);
				doh.assertEqual('Stop', demoWidget.inner.childNodes[1].childNodes[0].innerHTML);
			}
		}
	]);
	doh.run();
});
