define([
	"dojo/_base/declare",
	"dojo/_base/kernel",
	"dojo/fx",
	"dijit/TitlePane"
	], function(declare, kernel, fx, TitlePane){
		
return declare("dojox.widget.PortletSettings", [dijit._Container, dijit.layout.ContentPane], {
	// summary:
	//		A settings widget to be used with a dojox.widget.Portlet.
	// description:
	//		This widget should be placed inside a dojox.widget.Portlet widget.
	//		It is used to set some preferences for that Portlet.	It is essentially
	//		a ContentPane, and should contain other widgets and DOM nodes that
	//		do the real work of setting preferences for the portlet.

	// portletIconClass: String
	//		The CSS class to apply to the icon in the Portlet title bar that is used
	//		to toggle the visibility of this widget.
	portletIconClass: "dojoxPortletSettingsIcon",

	// portletIconHoverClass: String
	//		The CSS class to apply to the icon in the Portlet title bar that is used
	//		to toggle the visibility of this widget when the mouse hovers over it.
	portletIconHoverClass: "dojoxPortletSettingsIconHover",

	postCreate: function(){
		// summary:
		//		Sets the require CSS classes on the widget.

		// Start the PortletSettings widget hidden, always.
		dojo.style(this.domNode, "display", "none");
		dojo.addClass(this.domNode, "dojoxPortletSettingsContainer");

		// Remove the unwanted content pane class.
		dojo.removeClass(this.domNode, "dijitContentPane");
	},

	_setPortletAttr: function(portlet){
		// summary:
		//		Sets the portlet that encloses this widget.
		this.portlet = portlet;
	},

	toggle: function(){
		// summary:
		//		Toggles the visibility of this widget.
		var n = this.domNode;
		if(dojo.style(n, "display") == "none"){
			dojo.style(n,{
				"display": "block",
				"height": "1px",
				"width": "auto"
			});
			dojo.fx.wipeIn({
				node: n
			}).play();
		}else{
			dojo.fx.wipeOut({
				node: n,
				onEnd: dojo.hitch(this, function(){
					dojo.style(n,{"display": "none", "height": "", "width":""});
				}
			)}).play();
		}
	}
});

});
