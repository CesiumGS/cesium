//>>built
define("dijit/_HasDropDown",["dojo/_base/declare","dojo/_base/Deferred","dojo/dom","dojo/dom-attr","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/has","dojo/keys","dojo/_base/lang","dojo/on","dojo/touch","./registry","./focus","./popup","./_FocusMixin"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,on,_b,_c,_d,_e,_f){
return _1("dijit._HasDropDown",_f,{_buttonNode:null,_arrowWrapperNode:null,_popupStateNode:null,_aroundNode:null,dropDown:null,autoWidth:true,forceWidth:false,maxHeight:-1,dropDownPosition:["below","above"],_stopClickEvents:true,_onDropDownMouseDown:function(e){
if(this.disabled||this.readOnly){
return;
}
e.preventDefault();
this._docHandler=this.own(on(this.ownerDocument,_b.release,_a.hitch(this,"_onDropDownMouseUp")))[0];
this.toggleDropDown();
},_onDropDownMouseUp:function(e){
if(e&&this._docHandler){
this._docHandler.remove();
this._docHandler=null;
}
var _10=this.dropDown,_11=false;
if(e&&this._opened){
var c=_6.position(this._buttonNode,true);
if(!(e.pageX>=c.x&&e.pageX<=c.x+c.w)||!(e.pageY>=c.y&&e.pageY<=c.y+c.h)){
var t=e.target;
while(t&&!_11){
if(_5.contains(t,"dijitPopup")){
_11=true;
}else{
t=t.parentNode;
}
}
if(_11){
t=e.target;
if(_10.onItemClick){
var _12;
while(t&&!(_12=_c.byNode(t))){
t=t.parentNode;
}
if(_12&&_12.onClick&&_12.getParent){
_12.getParent().onItemClick(_12,e);
}
}
return;
}
}
}
if(this._opened){
if(_10.focus&&_10.autoFocus!==false){
this._focusDropDownTimer=this.defer(function(){
_10.focus();
delete this._focusDropDownTimer;
});
}
}else{
if(this.focus){
this.defer("focus");
}
}
},_onDropDownClick:function(e){
if(this._stopClickEvents){
e.stopPropagation();
e.preventDefault();
}
},buildRendering:function(){
this.inherited(arguments);
this._buttonNode=this._buttonNode||this.focusNode||this.domNode;
this._popupStateNode=this._popupStateNode||this.focusNode||this._buttonNode;
var _13={"after":this.isLeftToRight()?"Right":"Left","before":this.isLeftToRight()?"Left":"Right","above":"Up","below":"Down","left":"Left","right":"Right"}[this.dropDownPosition[0]]||this.dropDownPosition[0]||"Down";
_5.add(this._arrowWrapperNode||this._buttonNode,"dijit"+_13+"ArrowButton");
},postCreate:function(){
this.inherited(arguments);
var _14=this.focusNode||this.domNode;
this.own(on(this._buttonNode,_b.press,_a.hitch(this,"_onDropDownMouseDown")),on(this._buttonNode,"click",_a.hitch(this,"_onDropDownClick")),on(_14,"keydown",_a.hitch(this,"_onKey")),on(_14,"keyup",_a.hitch(this,"_onKeyUp")));
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
var d=this.dropDown,_15=e.target;
if(d&&this._opened&&d.handleKey){
if(d.handleKey(e)===false){
e.stopPropagation();
e.preventDefault();
return;
}
}
if(d&&this._opened&&e.keyCode==_9.ESCAPE){
this.closeDropDown();
e.stopPropagation();
e.preventDefault();
}else{
if(!this._opened&&(e.keyCode==_9.DOWN_ARROW||((e.keyCode==_9.ENTER||(e.keyCode==_9.SPACE&&(!this._searchTimer||(e.ctrlKey||e.altKey||e.metaKey))))&&((_15.tagName||"").toLowerCase()!=="input"||(_15.type&&_15.type.toLowerCase()!=="text"))))){
this._toggleOnKeyUp=true;
e.stopPropagation();
e.preventDefault();
}
}
},_onKeyUp:function(){
if(this._toggleOnKeyUp){
delete this._toggleOnKeyUp;
this.toggleDropDown();
var d=this.dropDown;
if(d&&d.focus){
this.defer(_a.hitch(d,"focus"),1);
}
}
},_onBlur:function(){
this.closeDropDown(false);
this.inherited(arguments);
},isLoaded:function(){
return true;
},loadDropDown:function(_16){
_16();
},loadAndOpenDropDown:function(){
var d=new _2(),_17=_a.hitch(this,function(){
this.openDropDown();
d.resolve(this.dropDown);
});
if(!this.isLoaded()){
this.loadDropDown(_17);
}else{
_17();
}
return d;
},toggleDropDown:function(){
if(this.disabled||this.readOnly){
return;
}
if(!this._opened){
this.loadAndOpenDropDown();
}else{
this.closeDropDown(true);
}
},openDropDown:function(){
var _18=this.dropDown,_19=_18.domNode,_1a=this._aroundNode||this.domNode,_1b=this;
var _1c=_e.open({parent:this,popup:_18,around:_1a,orient:this.dropDownPosition,maxHeight:this.maxHeight,onExecute:function(){
_1b.closeDropDown(true);
},onCancel:function(){
_1b.closeDropDown(true);
},onClose:function(){
_4.set(_1b._popupStateNode,"popupActive",false);
_5.remove(_1b._popupStateNode,"dijitHasDropDownOpen");
_1b._set("_opened",false);
}});
if(this.forceWidth||(this.autoWidth&&_1a.offsetWidth>_18._popupWrapper.offsetWidth)){
var _1d={w:_1a.offsetWidth-(_18._popupWrapper.offsetWidth-_18.domNode.offsetWidth)};
if(_a.isFunction(_18.resize)){
_18.resize(_1d);
}else{
_6.setMarginBox(_19,_1d);
}
}
_4.set(this._popupStateNode,"popupActive","true");
_5.add(this._popupStateNode,"dijitHasDropDownOpen");
this._set("_opened",true);
this._popupStateNode.setAttribute("aria-expanded","true");
this._popupStateNode.setAttribute("aria-owns",_18.id);
if(_19.getAttribute("role")!=="presentation"&&!_19.getAttribute("aria-labelledby")){
_19.setAttribute("aria-labelledby",this.id);
}
return _1c;
},closeDropDown:function(_1e){
if(this._focusDropDownTimer){
this._focusDropDownTimer.remove();
delete this._focusDropDownTimer;
}
if(this._opened){
this._popupStateNode.setAttribute("aria-expanded","false");
if(_1e){
this.focus();
}
_e.close(this.dropDown);
this._opened=false;
}
}});
});
