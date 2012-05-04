dojo.addOnLoad(function(){
	doh.register("dojox.mobile.test.ToolBarButton", [
		function test_Heading_Verification(){
			var demoWidget = dijit.byId("btn1");

			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblToolBarButtonText', demoWidget.domNode.className);
			doh.assertEqual('Edit', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_0");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhitePlus', demoWidget.domNode.className);
			
			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_1");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblToolBarButtonText', demoWidget.domNode.className);
			doh.assertEqual('Edit', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_2");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhitePlus', demoWidget.domNode.className);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_3");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblToolBarButtonText', demoWidget.domNode.className);
			doh.assertEqual('Speaker', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_4");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblToolBarButtonText mblColorBlue', demoWidget.domNode.className);
			doh.assertEqual('Done', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_5");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblToolBarButtonText', demoWidget.domNode.className);
			doh.assertEqual('Update All', demoWidget.domNode.childNodes[0].nodeValue);
			
			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_6");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblToolBarButtonText mblColorBlue', demoWidget.domNode.className);
			doh.assertEqual('Done', demoWidget.domNode.childNodes[0].nodeValue);
			
			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_7");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblToolBarButtonText mblColorBlue', demoWidget.domNode.className);
			doh.assertEqual('Done', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_8");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblToolBarButtonText', demoWidget.domNode.className);
			doh.assertEqual('New Folder', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_9");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblToolBarButtonText', demoWidget.domNode.className);
			doh.assertEqual('New', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_10");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblToolBarButtonText', demoWidget.domNode.className);
			doh.assertEqual('Toggle', demoWidget.domNode.childNodes[0].nodeValue);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_11");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault', demoWidget.domNode.className);
			if(dojo.isIE===6){
				doh.assertTrue(demoWidget.domNode.childNodes[0].childNodes[0].href.search(/a-icon-12.png/) != -1, "a-icon-12.png");
			}else{
				doh.assertTrue(demoWidget.domNode.childNodes[0].childNodes[0].src.search(/a-icon-12.png/) != -1, "a-icon-12.png");
			}

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_12");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault', demoWidget.domNode.className);
			doh.assertEqual('mblToolBarButtonSpriteIcon', demoWidget.domNode.childNodes[0].childNodes[0].className);
			verifyRect(demoWidget.domNode.childNodes[0].childNodes[0], "29px", "29px", "58px", "0px");
			doh.assertEqual('-29px', demoWidget.domNode.childNodes[0].childNodes[0].style.top);
			doh.assertEqual('0px', demoWidget.domNode.childNodes[0].childNodes[0].style.left);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_13");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhitePlus', demoWidget.domNode.className);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_14");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhiteSearch', demoWidget.domNode.className);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_15");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhitePlus', demoWidget.domNode.className);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_16");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault', demoWidget.domNode.className);
			if(dojo.isIE!=6){
				doh.assertTrue(demoWidget.domNode.childNodes[0].childNodes[0].src.search(/tab-icon-15h.png/) != -1, "tab-icon-15h.png");
			}

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_17");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhiteSearch', demoWidget.domNode.className);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_18");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhiteUpArrow', demoWidget.domNode.className);

			demoWidget = dijit.byId("dojox_mobile_ToolBarButton_19");
			doh.assertEqual('mblToolBarButton mblArrowButtonText mblColorDefault mblDomButton mblToolBarButtonDomButton mblDomButtonWhiteDownArrow', demoWidget.domNode.className);
		}
	]);
	doh.run();
});

