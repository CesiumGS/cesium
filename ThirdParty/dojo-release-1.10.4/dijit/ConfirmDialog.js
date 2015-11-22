define([
	"dojo/_base/declare",
	"./Dialog",
	"./_ConfirmDialogMixin"
], function(declare, Dialog, _ConfirmDialogMixin) {

	return declare("dijit/ConfirmDialog", [Dialog, _ConfirmDialogMixin], {
		// summary:
		//		A Dialog with OK/Cancel buttons.
	});
});
