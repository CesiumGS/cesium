define([
	"./CheckedMultiSelect",
	"./_SelectStackMixin",
	"dojo/_base/declare"
], function(CheckedMultiSelect, _SelectStackMixin, declare){
	/*=====
		CheckedMultiSelect = dojox.form.CheckedMultiSelect;
		_SelectStackMixin = dojox.form._SelectStackMixin;
	=====*/
	return declare("dojox.form.RadioStack", [ CheckedMultiSelect, _SelectStackMixin ], {
	// summary: A radio-based select stack.
	});
});