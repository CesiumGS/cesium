dojo.addOnLoad(function(){
	var view = dijit.byId("foo");

	var list = new dojox.mobile.RoundRectList({iconBase:"../images/i-icon-all.png"});
	view.addChild(list);

	var demoWidget = new dojox.mobile.ListItem({iconPos:"0,87,29,29", moveTo:"general", label:"Sounds"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({iconPos:"0,116,29,29", moveTo:"general", label:"Brightness"});
	list.addChild(demoWidget);

	list = new dojox.mobile.EdgeToEdgeList({iconBase:"../images/i-icon-all.png"});
	demoWidget = new dojox.mobile.ListItem({iconPos:"0,87,29,29", rightIcon:"mblDomButtonBluePlus", label:"XX Widget"});
	list.addChild(demoWidget);

	demoWidget = new dojox.mobile.ListItem({iconPos:"0,116,29,29", rightIcon:"mblDomButtonRedMinus", label:"YY Widget"});
	list.addChild(demoWidget);

	view.addChild(list);
});
