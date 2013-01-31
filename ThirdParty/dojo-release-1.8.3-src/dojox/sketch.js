define([
	"dojo/_base/kernel",
	"dojo/_base/lang", 
	"./xml/DomParser", 
	"./sketch/UndoStack", 
	"./sketch/Figure", 
	"./sketch/Toolbar"
], function(dojo){
	dojo.getObject("sketch", true, dojox);

	/*=====
	 return {
	 // summary:
	 //		Deprecated.  Should require dojox/sketch modules directly rather than trying to access them through
	 //		this module.
	 };
	 =====*/
	return dojox.sketch;
});
