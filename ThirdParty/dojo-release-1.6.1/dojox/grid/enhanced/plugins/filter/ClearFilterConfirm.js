/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter.ClearFilterConfirm"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter.ClearFilterConfirm"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter.ClearFilterConfirm");
dojo.require("dijit.form.Button");
dojo.declare("dojox.grid.enhanced.plugins.filter.ClearFilterConfirm",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.grid","enhanced/templates/ClearFilterConfirmPane.html","<div class=\"dojoxGridClearFilterConfirm\">\n\t<div class=\"dojoxGridClearFilterMsg\">\n\t\t${_clearFilterMsg}\n\t</div>\n\t<div class=\"dojoxGridClearFilterBtns\" dojoAttachPoint=\"btnsNode\">\n\t\t<span dojoType=\"dijit.form.Button\" label=\"${_cancelBtnLabel}\" dojoAttachPoint=\"cancelBtn\" dojoAttachEvent=\"onClick:_onCancel\"></span>\n\t\t<span dojoType=\"dijit.form.Button\" label=\"${_clearBtnLabel}\" dojoAttachPoint=\"clearBtn\" dojoAttachEvent=\"onClick:_onClear\"></span>\n\t</div>\n</div>\n"),widgetsInTemplate:true,plugin:null,postMixInProperties:function(){
var _1=this.plugin.nls;
this._clearBtnLabel=_1["clearButton"];
this._cancelBtnLabel=_1["cancelButton"];
this._clearFilterMsg=_1["clearFilterMsg"];
},postCreate:function(){
this.inherited(arguments);
dijit.setWaiState(this.cancelBtn.domNode,"label",this.plugin.nls["waiCancelButton"]);
dijit.setWaiState(this.clearBtn.domNode,"label",this.plugin.nls["waiClearButton"]);
},uninitialize:function(){
this.plugin=null;
},_onCancel:function(){
this.plugin.clearFilterDialog.hide();
},_onClear:function(){
this.plugin.clearFilterDialog.hide();
this.plugin.filterDefDialog.clearFilter(this.plugin.filterDefDialog._clearWithoutRefresh);
}});
}
