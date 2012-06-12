define([
	"dijit/form/Select",
	"./_SelectStackMixin",
	"dojo/_base/declare"
], function(Select, _SelectStackMixin, declare){
	/*=====
		Select = dijit.form.Select;
		_SelectStackMixin = dojox.form._SelectStackMixin;
	=====*/
	return declare("dojox.form.DropDownStack", [ Select, _SelectStackMixin ], {
	// summary: A dropdown-based select stack.

	});
});