/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.MultiSelect"]){
dojo._hasResource["dijit.form.MultiSelect"]=true;
dojo.provide("dijit.form.MultiSelect");
dojo.require("dijit.form._FormWidget");
dojo.declare("dijit.form.MultiSelect",dijit.form._FormValueWidget,{size:7,templateString:"<select multiple='true' ${!nameAttrSetting} dojoAttachPoint='containerNode,focusNode' dojoAttachEvent='onchange: _onChange'></select>",attributeMap:dojo.delegate(dijit.form._FormWidget.prototype.attributeMap,{size:"focusNode"}),reset:function(){
this._hasBeenBlurred=false;
this._setValueAttr(this._resetValue,true);
},addSelected:function(_1){
_1.getSelected().forEach(function(n){
this.containerNode.appendChild(n);
this.domNode.scrollTop=this.domNode.offsetHeight;
var _2=_1.domNode.scrollTop;
_1.domNode.scrollTop=0;
_1.domNode.scrollTop=_2;
},this);
},getSelected:function(){
return dojo.query("option",this.containerNode).filter(function(n){
return n.selected;
});
},_getValueAttr:function(){
return this.getSelected().map(function(n){
return n.value;
});
},multiple:true,_setValueAttr:function(_3){
dojo.query("option",this.containerNode).forEach(function(n){
n.selected=(dojo.indexOf(_3,n.value)!=-1);
});
},invertSelection:function(_4){
dojo.query("option",this.containerNode).forEach(function(n){
n.selected=!n.selected;
});
this._handleOnChange(this.get("value"),_4==true);
},_onChange:function(e){
this._handleOnChange(this.get("value"),true);
},resize:function(_5){
if(_5){
dojo.marginBox(this.domNode,_5);
}
},postCreate:function(){
this._onChange();
}});
}
