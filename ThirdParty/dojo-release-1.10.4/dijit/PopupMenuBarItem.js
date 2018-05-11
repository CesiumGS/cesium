define([
	"dojo/_base/declare", // declare
	"./PopupMenuItem",
	"./MenuBarItem"
], function(declare, PopupMenuItem, MenuBarItem){

	// module:
	//		dijit/PopupMenuBarItem

	var _MenuBarItemMixin = MenuBarItem._MenuBarItemMixin;

	return declare("dijit.PopupMenuBarItem", [PopupMenuItem, _MenuBarItemMixin], {
		// summary:
		//		Item in a MenuBar like "File" or "Edit", that spawns a submenu when pressed (or hovered)
	});
});
