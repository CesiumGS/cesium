dojo.addOnLoad(function(){
	var list = dijit.byId("dojox_mobile_RoundRectList_0");
	var demoWidget = new dojox.mobile.ListItem({icon:"../images/i-icon-1.png", transition:"slide", url:"../view1.html", label:"External View #1 (sync)"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({icon:"../images/i-icon-2.png", transition:"flip", url:"../view2.html", sync:false, label:"External View #2 (async)"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({icon:"../images/i-icon-3.png", transition:"fade", url:"../view3.html", label:"External View #3 (sync)"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({rightText:"Off", label:"Video"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({icon:"../images/i-icon-1.png", rightText:"VPN", label:"Maps"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({label:"Jack Coleman"});
	list.addChild(demoWidget);

	list = dijit.byId("dojox_mobile_RoundRectList_1");
	demoWidget = new dojox.mobile.ListItem({iconPos:"0,87,29,29", moveTo:"general", label:"Sounds"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({iconPos:"0,116,29,29", moveTo:"general", label:"Brightness"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({iconPos:"29,0,29,29", moveTo:"general", label:"Wallpaper"});
	list.addChild(demoWidget);

	list = dijit.byId("dojox_mobile_EdgeToEdgeList_0");
	demoWidget = new dojox.mobile.ListItem({icon:"../images/i-icon-1.png", rightIcon:"mblDomButtonBluePlus", label:"XX Widget"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({icon:"../images/i-icon-2.png", rightIcon:"mblDomButtonRedMinus", label:"YY Widget"});
	list.addChild(demoWidget);

	list = dijit.byId("dojox_mobile_EdgeToEdgeList_1");
	demoWidget = new dojox.mobile.ListItem({rightIcon:"mblDomButtonCheckboxOff", variableHeight:"true"});
	dojo.create(dojo.doc.createTextNode("Use wireless networks"), null, demoWidget.labelNode, "before");
	var child = dojo.create("DIV", {className:"mblListItemSubText"}, demoWidget.labelNode, "before");
	child.appendChild(dojo.doc.createTextNode("See location in applications (such as Maps) using wireless networks"));
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({rightIcon:"mblDomButtonCheckboxOn", variableHeight:"true"});
	dojo.create(dojo.doc.createTextNode("Use GPS satellites"), null, demoWidget.labelNode, "before");
	child = dojo.create("DIV", {className:"mblListItemSubText", innerHTML:"When locating, accurate to street level (uncheck to conserve battery)"}, demoWidget.labelNode, "before");
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({label:" Set unlock pattern"});
	list.addChild(demoWidget);
});
