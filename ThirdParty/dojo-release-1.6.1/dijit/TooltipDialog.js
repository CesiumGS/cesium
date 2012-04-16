/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.TooltipDialog"]){
dojo._hasResource["dijit.TooltipDialog"]=true;
dojo.provide("dijit.TooltipDialog");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit._Templated");
dojo.require("dijit.form._FormMixin");
dojo.require("dijit._DialogMixin");
dojo.declare("dijit.TooltipDialog",[dijit.layout.ContentPane,dijit._Templated,dijit.form._FormMixin,dijit._DialogMixin],{title:"",doLayout:false,autofocus:true,baseClass:"dijitTooltipDialog",_firstFocusItem:null,_lastFocusItem:null,templateString:dojo.cache("dijit","templates/TooltipDialog.html","<div role=\"presentation\" tabIndex=\"-1\">\n\t<div class=\"dijitTooltipContainer\" role=\"presentation\">\n\t\t<div class =\"dijitTooltipContents dijitTooltipFocusNode\" dojoAttachPoint=\"containerNode\" role=\"dialog\"></div>\n\t</div>\n\t<div class=\"dijitTooltipConnector\" role=\"presentation\"></div>\n</div>\n"),_setTitleAttr:function(_1){
this.containerNode.title=_1;
this._set("title",_1);
},postCreate:function(){
this.inherited(arguments);
this.connect(this.containerNode,"onkeypress","_onKey");
},orient:function(_2,_3,_4){
var _5="dijitTooltipAB"+(_4.charAt(1)=="L"?"Left":"Right")+" dijitTooltip"+(_4.charAt(0)=="T"?"Below":"Above");
dojo.replaceClass(this.domNode,_5,this._currentOrientClass||"");
this._currentOrientClass=_5;
},focus:function(){
this._getFocusItems(this.containerNode);
dijit.focus(this._firstFocusItem);
},onOpen:function(_6){
this.orient(this.domNode,_6.aroundCorner,_6.corner);
this._onShow();
},onClose:function(){
this.onHide();
},_onKey:function(_7){
var _8=_7.target;
var dk=dojo.keys;
if(_7.charOrCode===dk.TAB){
this._getFocusItems(this.containerNode);
}
var _9=(this._firstFocusItem==this._lastFocusItem);
if(_7.charOrCode==dk.ESCAPE){
setTimeout(dojo.hitch(this,"onCancel"),0);
dojo.stopEvent(_7);
}else{
if(_8==this._firstFocusItem&&_7.shiftKey&&_7.charOrCode===dk.TAB){
if(!_9){
dijit.focus(this._lastFocusItem);
}
dojo.stopEvent(_7);
}else{
if(_8==this._lastFocusItem&&_7.charOrCode===dk.TAB&&!_7.shiftKey){
if(!_9){
dijit.focus(this._firstFocusItem);
}
dojo.stopEvent(_7);
}else{
if(_7.charOrCode===dk.TAB){
_7.stopPropagation();
}
}
}
}
}});
}
