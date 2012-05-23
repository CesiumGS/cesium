define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dijit/form/_FormSelectWidget"
], function(kernel, lang, _FormSelectWidget){
	kernel.deprecated("dojox.form._FormSelectWidget", "Use dijit.form._FormSelectWidget instead", "2.0");

	lang.setObject("dojox.form._FormSelectWidget", _FormSelectWidget);
	return _FormSelectWidget;
});