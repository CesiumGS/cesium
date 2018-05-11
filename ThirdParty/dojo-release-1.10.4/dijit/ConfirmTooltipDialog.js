define([
	"dojo/_base/declare",
	"./TooltipDialog",
	"./_ConfirmDialogMixin"
], function(declare, TooltipDialog, _ConfirmDialogMixin) {
	
	return declare("dijit/ConfirmTooltipDialog", [TooltipDialog, _ConfirmDialogMixin], {
		// summary:
		//		A TooltipDialog with OK/Cancel buttons.
	});
});
