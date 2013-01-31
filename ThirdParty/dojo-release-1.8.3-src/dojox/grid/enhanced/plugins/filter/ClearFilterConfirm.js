define([
	"dojo/_base/declare",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/text!../../templates/ClearFilterConfirmPane.html"
], function(declare, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, template){

return declare("dojox.grid.enhanced.plugins.filter.ClearFilterConfirm",
	[_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
	// summary:
	//		The UI for user to confirm the operation of clearing filter.
	templateString: template,

	widgetsInTemplate: true,

	plugin: null,

	postMixInProperties: function(){
		var nls = this.plugin.nls;
		this._clearBtnLabel = nls["clearButton"];
		this._cancelBtnLabel = nls["cancelButton"];
		this._clearFilterMsg = nls["clearFilterMsg"];
	},

	postCreate: function(){
		this.inherited(arguments);
		this.cancelBtn.domNode.setAttribute("aria-label", this.plugin.nls["waiCancelButton"]);
		this.clearBtn.domNode.setAttribute("aria-label", this.plugin.nls["waiClearButton"]);
	},

	uninitialize: function(){
		this.plugin = null;
	},

	_onCancel: function(){
		this.plugin.clearFilterDialog.hide();
	},

	_onClear: function(){
		this.plugin.clearFilterDialog.hide();
		this.plugin.filterDefDialog.clearFilter(this.plugin.filterDefDialog._clearWithoutRefresh);
	}
});
});
