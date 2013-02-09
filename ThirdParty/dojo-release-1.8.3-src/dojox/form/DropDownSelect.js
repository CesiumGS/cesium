define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dijit/form/Select"
], function(kernel, lang, Select){
	kernel.deprecated("dojox.form.DropDownSelect", "Use Select instead", "2.0");

	lang.setObject("dojox.form.DropDownSelect", Select);
	return Select;
});