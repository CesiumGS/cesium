/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._HasDropDown"]){
dojo._hasResource["dijit._HasDropDown"]=true;
dojo.provide("dijit._HasDropDown");
dojo.require("dijit._Widget");
dojo.declare("dijit._HasDropDown",null,{_buttonNode:null,_arrowWrapperNode:null,_popupStateNode:null,_aroundNode:null,dropDown:null,autoWidth:true,forceWidth:false,maxHeight:0,dropDownPosition:["below","above"],_stopClickEvents:true,_onDropDownMouseDown:function(e){
if(this.disabled||this.readOnly){
return;
}
dojo.stopEvent(e);
this._docHandler=this.connect(dojo.doc,"onmouseup","_onDropDownMouseUp");
this.toggleDropDown();
},_onDropDownMouseUp:function(e){
if(e&&this._docHandler){
this.disconnect(this._docHandler);
}
var _1=this.dropDown,_2=false;
if(e&&this._opened){
var c=dojo.position(this._buttonNode,true);
if(!(e.pageX>=c.x&&e.pageX<=c.x+c.w)||!(e.pageY>=c.y&&e.pageY<=c.y+c.h)){
var t=e.target;
while(t&&!_2){
if(dojo.hasClass(t,"dijitPopup")){
_2=true;
}else{
t=t.parentNode;
}
}
if(_2){
t=e.target;
if(_1.onItemClick){
var _3;
while(t&&!(_3=dijit.byNode(t))){
t=t.parentNode;
}
if(_3&&_3.onClick&&_3.getParent){
_3.getParent().onItemClick(_3,e);
}
}
return;
}
}
}
if(this._opened&&_1.focus&&_1.autoFocus!==false){
window.setTimeout(dojo.hitch(_1,"focus"),1);
}
},_onDropDownClick:function(e){
if(this._stopClickEvents){
dojo.stopEvent(e);
}
},buildRendering:function(){
this.inherited(arguments);
this._buttonNode=this._buttonNode||this.focusNode||this.domNode;
this._popupStateNode=this._popupStateNode||this.focusNode||this._buttonNode;
var _4={"after":this.isLeftToRight()?"Right":"Left","before":this.isLeftToRight()?"Left":"Right","above":"Up","below":"Down","left":"Left","right":"Right"}[this.dropDownPosition[0]]||this.dropDownPosition[0]||"Down";
dojo.addClass(this._arrowWrapperNode||this._buttonNode,"dijit"+_4+"ArrowButton");
},postCreate:function(){
this.inherited(arguments);
this.connect(this._buttonNode,"onmousedown","_onDropDownMouseDown");
this.connect(this._buttonNode,"onclick","_onDropDownClick");
this.connect(this.focusNode,"onkeypress","_onKey");
this.connect(this.focusNode,"onkeyup","_onKeyUp");
},destroy:function(){
if(this.dropDown){
if(!this.dropDown._destroyed){
this.dropDown.destroyRecursive();
}
delete this.dropDown;
}
this.inherited(arguments);
},_onKey:function(e){
if(this.disabled||this.readOnly){
return;
}
var d=this.dropDown,_5=e.target;
if(d&&this._opened&&d.handleKey){
if(d.handleKey(e)===false){
dojo.stopEvent(e);
return;
}
}
if(d&&this._opened&&e.charOrCode==dojo.keys.ESCAPE){
this.closeDropDown();
dojo.stopEvent(e);
}else{
if(!this._opened&&(e.charOrCode==dojo.keys.DOWN_ARROW||((e.charOrCode==dojo.keys.ENTER||e.charOrCode==" ")&&((_5.tagName||"").toLowerCase()!=="input"||(_5.type&&_5.type.toLowerCase()!=="text"))))){
this._toggleOnKeyUp=true;
dojo.stopEvent(e);
}
}
},_onKeyUp:function(){
if(this._toggleOnKeyUp){
delete this._toggleOnKeyUp;
this.toggleDropDown();
var d=this.dropDown;
if(d&&d.focus){
setTimeout(dojo.hitch(d,"focus"),1);
}
}
},_onBlur:function(){
var _6=dijit._curFocus&&this.dropDown&&dojo.isDescendant(dijit._curFocus,this.dropDown.domNode);
this.closeDropDown(_6);
this.inherited(arguments);
},isLoaded:function(){
return true;
},loadDropDown:function(_7){
_7();
},toggleDropDown:function(){
if(this.disabled||this.readOnly){
return;
}
if(!this._opened){
if(!this.isLoaded()){
this.loadDropDown(dojo.hitch(this,"openDropDown"));
return;
}else{
this.openDropDown();
}
}else{
this.closeDropDown();
}
},openDropDown:function(){
var _8=this.dropDown,_9=_8.domNode,_a=this._aroundNode||this.domNode,_b=this;
if(!this._preparedNode){
this._preparedNode=true;
if(_9.style.width){
this._explicitDDWidth=true;
}
if(_9.style.height){
this._explicitDDHeight=true;
}
}
if(this.maxHeight||this.forceWidth||this.autoWidth){
var _c={display:"",visibility:"hidden"};
if(!this._explicitDDWidth){
_c.width="";
}
if(!this._explicitDDHeight){
_c.height="";
}
dojo.style(_9,_c);
var _d=this.maxHeight;
if(_d==-1){
var _e=dojo.window.getBox(),_f=dojo.position(_a,false);
_d=Math.floor(Math.max(_f.y,_e.h-(_f.y+_f.h)));
}
if(_8.startup&&!_8._started){
_8.startup();
}
dijit.popup.moveOffScreen(_8);
var mb=dojo._getMarginSize(_9);
var _10=(_d&&mb.h>_d);
dojo.style(_9,{overflowX:"hidden",overflowY:_10?"auto":"hidden"});
if(_10){
mb.h=_d;
if("w" in mb){
mb.w+=16;
}
}else{
delete mb.h;
}
if(this.forceWidth){
mb.w=_a.offsetWidth;
}else{
if(this.autoWidth){
mb.w=Math.max(mb.w,_a.offsetWidth);
}else{
delete mb.w;
}
}
if(dojo.isFunction(_8.resize)){
_8.resize(mb);
}else{
dojo.marginBox(_9,mb);
}
}
var _11=dijit.popup.open({parent:this,popup:_8,around:_a,orient:dijit.getPopupAroundAlignment((this.dropDownPosition&&this.dropDownPosition.length)?this.dropDownPosition:["below"],this.isLeftToRight()),onExecute:function(){
_b.closeDropDown(true);
},onCancel:function(){
_b.closeDropDown(true);
},onClose:function(){
dojo.attr(_b._popupStateNode,"popupActive",false);
dojo.removeClass(_b._popupStateNode,"dijitHasDropDownOpen");
_b._opened=false;
}});
dojo.attr(this._popupStateNode,"popupActive","true");
dojo.addClass(_b._popupStateNode,"dijitHasDropDownOpen");
this._opened=true;
return _11;
},closeDropDown:function(_12){
if(this._opened){
if(_12){
this.focus();
}
dijit.popup.close(this.dropDown);
this._opened=false;
}
}});
}
