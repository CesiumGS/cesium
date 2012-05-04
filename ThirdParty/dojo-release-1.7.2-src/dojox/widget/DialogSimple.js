define(["dojo", "dijit", "dojox", "dijit/Dialog", "dojox/layout/ContentPane"], function(dojo, dijit, dojox){

	dojo.getObject("widget", true, dojox);
	return dojo.declare("dojox.widget.DialogSimple", [dojox.layout.ContentPane, dijit._DialogBase], {
		// summary: A Simple Dialog Mixing the `dojox.layout.ContentPane` functionality over
		//		top of a vanilla `dijit.Dialog`. See `dojox.widget.Dialog` for a more flexible
		//		dialog option allowing animations and different styles/theme support.
	});
	
});

