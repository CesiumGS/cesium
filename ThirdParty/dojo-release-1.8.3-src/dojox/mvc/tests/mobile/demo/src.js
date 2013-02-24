require([
	"dojo/_base/lang",
	"dojo/aspect",
	"dojo/dom",
	"dojo/has",
	"dijit/registry",
	"dojox/mobile/parser",
	"dojox/mobile/ListItem",
	"dojox/mvc/at",
	"dojox/mvc/Generate",
	"dojox/mvc/Group",
	"dojox/mvc/Output",
	"dojox/mvc/Templated",
	"dojox/mvc/WidgetList",
	"dojox/mvc/_InlineTemplateMixin",
	"dojox/mvc/tests/mobile/demo/MobileDemoContactModel",
	"dojox/mvc/tests/mobile/demo/MobileDemoContactListModel",
	"dojox/mvc/tests/mobile/demo/MobileDemoContactController",
	"dojox/mvc/tests/mobile/demo/MobileDemoContactListController",
	"dojox/mvc/tests/mobile/demo/MobileDemoGenerateActions",
	"dojox/mobile",
	"dojox/mobile/deviceTheme",
	"dojox/mobile/Button",
	"dojox/mobile/Heading",
	"dojox/mobile/ScrollableView",
	"dojox/mobile/TextArea",
	"dojox/mobile/TextBox",
	"dojo/domReady!"
], function(lang, aspect, dom, has, registry, parser, ListItem, at){
	if(!has("webkit")){
		require(["dojox/mobile/compat"]);
	}
	window.at = at;
	parser.parse();
	dom.byId("wholepage").style.display = "";
});
