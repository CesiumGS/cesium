define([
	"dojo/_base/kernel",
	"dojo/_base/lang", 
	"./xml/DomParser", 
	"./sketch/UndoStack", 
	"./sketch/Figure", 
	"./sketch/Toolbar"
], function(dojo){
	dojo.getObject("sketch", true, dojox);
	return dojox.sketch;
});
