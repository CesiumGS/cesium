define([
	"dijit/form/Select",
	"./_SelectStackMixin",
	"dojo/_base/declare"
], function(Select, _SelectStackMixin, declare){
/*=====
return {
	// summary:
	//		A dropdown-based select stack.
};
=====*/
	return declare("dojox.form.DropDownStack", [ Select, _SelectStackMixin ]);
});