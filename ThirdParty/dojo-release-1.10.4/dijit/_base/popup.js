define([
	"dojo/dom-class", // domClass.contains
	"dojo/_base/window",
	"../popup",
	"../BackgroundIframe"	// just loading for back-compat, in case client code is referencing it
], function(domClass, win, popup){

// module:
//		dijit/_base/popup

/*=====
return {
	// summary:
	//		Deprecated.   Old module for popups, new code should use dijit/popup directly.
};
=====*/


// Hack support for old API passing in node instead of a widget (to various methods)
var origCreateWrapper = popup._createWrapper;
popup._createWrapper = function(widget){
	if(!widget.declaredClass){
		// make fake widget to pass to new API
		widget = {
			_popupWrapper: (widget.parentNode && domClass.contains(widget.parentNode, "dijitPopup")) ?
				widget.parentNode : null,
			domNode: widget,
			destroy: function(){},
			ownerDocument: widget.ownerDocument,
			ownerDocumentBody: win.body(widget.ownerDocument)
		};
	}
	return origCreateWrapper.call(this, widget);
};

// Support old format of orient parameter
var origOpen = popup.open;
popup.open = function(/*__OpenArgs*/ args){
	// Convert old hash structure (ex: {"BL": "TL", ...}) of orient to format compatible w/new popup.open() API.
	// Don't do conversion for:
	//		- null parameter (that means to use the default positioning)
	//		- "R" or "L" strings used to indicate positioning for context menus (when there is no around node)
	//		- new format, ex: ["below", "above"]
	//		- return value from deprecated dijit.getPopupAroundAlignment() method,
	//			ex: ["below", "above"]
	if(args.orient && typeof args.orient != "string" && !("length" in args.orient)){
		var ary = [];
		for(var key in args.orient){
			ary.push({aroundCorner: key, corner: args.orient[key]});
		}
		args.orient = ary;
	}

	return origOpen.call(this, args);
};

return popup;
});
