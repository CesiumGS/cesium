define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dijit/_HasDropDown"
], function(kernel, _HasDropDown){
	kernel.deprecated("dojox.form._HasDropDown", "Use dijit._HasDropDown instead", "2.0");

	lang.setObject("dojox.form._HasDropDown", _HasDropDown);
	return _HasDropDown;
});