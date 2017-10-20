define([
	"dojo/_base/declare", // declare
	"./MenuItem",
	"dojo/text!./templates/MenuBarItem.html"
], function(declare, MenuItem, template){

	// module:
	//		dijit/MenuBarItem

	var _MenuBarItemMixin = declare("dijit._MenuBarItemMixin", null, {
		templateString: template,

		// Map widget attributes to DOMNode attributes.
		_setIconClassAttr: null	// cancel MenuItem setter because we don't have a place for an icon
	});

	var MenuBarItem = declare("dijit.MenuBarItem", [MenuItem, _MenuBarItemMixin], {
		// summary:
		//		Item in a MenuBar that's clickable, and doesn't spawn a submenu when pressed (or hovered)

	});
	MenuBarItem._MenuBarItemMixin = _MenuBarItemMixin;	// dojox.mobile is accessing this


	return MenuBarItem;
});
