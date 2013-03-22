define([
	"./CheckedMultiSelect",
	"./_SelectStackMixin",
	"dojo/_base/declare"
], function(CheckedMultiSelect, _SelectStackMixin, declare){
/*=====
return {
	// summary:
	//		A radio-based select stack.
};
=====*/
	return declare("dojox.form.RadioStack", [ CheckedMultiSelect, _SelectStackMixin ]);
});