/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.Menu"]){
dojo._hasResource["dijit.Menu"]=true;
dojo.provide("dijit.Menu");
dojo.require("dojo.window");
dojo.require("dijit._Widget");
dojo.require("dijit._KeyNavContainer");
dojo.require("dijit._Templated");
dojo.require("dijit.MenuItem");
dojo.require("dijit.PopupMenuItem");
dojo.require("dijit.CheckedMenuItem");
dojo.require("dijit.MenuSeparator");
dojo.declare("dijit._MenuBase",[dijit._Widget,dijit._Templated,dijit._KeyNavContainer],{parentMenu:null,popupDelay:500,startup:function(){
if(this._started){
return;
}
dojo.forEach(this.getChildren(),function(_1){
_1.startup();
});
this.startupKeyNavChildren();
this.inherited(arguments);
},onExecute:function(){
},onCancel:function(_2){
},_moveToPopup:function(_3){
if(this.focusedChild&&this.focusedChild.popup&&!this.focusedChild.disabled){
this.focusedChild._onClick(_3);
}else{
var _4=this._getTopMenu();
if(_4&&_4._isMenuBar){
_4.focusNext();
}
}
},_onPopupHover:function(_5){
if(this.currentPopup&&this.currentPopup._pendingClose_timer){
var _6=this.currentPopup.parentMenu;
if(_6.focusedChild){
_6.focusedChild._setSelected(false);
}
_6.focusedChild=this.currentPopup.from_item;
_6.focusedChild._setSelected(true);
this._stopPendingCloseTimer(this.currentPopup);
}
},onItemHover:function(_7){
if(this.isActive){
this.focusChild(_7);
if(this.focusedChild.popup&&!this.focusedChild.disabled&&!this.hover_timer){
this.hover_timer=setTimeout(dojo.hitch(this,"_openPopup"),this.popupDelay);
}
}
if(this.focusedChild){
this.focusChild(_7);
}
this._hoveredChild=_7;
},_onChildBlur:function(_8){
this._stopPopupTimer();
_8._setSelected(false);
var _9=_8.popup;
if(_9){
this._stopPendingCloseTimer(_9);
_9._pendingClose_timer=setTimeout(function(){
_9._pendingClose_timer=null;
if(_9.parentMenu){
_9.parentMenu.currentPopup=null;
}
dijit.popup.close(_9);
},this.popupDelay);
}
},onItemUnhover:function(_a){
if(this.isActive){
this._stopPopupTimer();
}
if(this._hoveredChild==_a){
this._hoveredChild=null;
}
},_stopPopupTimer:function(){
if(this.hover_timer){
clearTimeout(this.hover_timer);
this.hover_timer=null;
}
},_stopPendingCloseTimer:function(_b){
if(_b._pendingClose_timer){
clearTimeout(_b._pendingClose_timer);
_b._pendingClose_timer=null;
}
},_stopFocusTimer:function(){
if(this._focus_timer){
clearTimeout(this._focus_timer);
this._focus_timer=null;
}
},_getTopMenu:function(){
for(var _c=this;_c.parentMenu;_c=_c.parentMenu){
}
return _c;
},onItemClick:function(_d,_e){
if(typeof this.isShowingNow=="undefined"){
this._markActive();
}
this.focusChild(_d);
if(_d.disabled){
return false;
}
if(_d.popup){
this._openPopup();
}else{
this.onExecute();
_d.onClick(_e);
}
},_openPopup:function(){
this._stopPopupTimer();
var _f=this.focusedChild;
if(!_f){
return;
}
var _10=_f.popup;
if(_10.isShowingNow){
return;
}
if(this.currentPopup){
this._stopPendingCloseTimer(this.currentPopup);
dijit.popup.close(this.currentPopup);
}
_10.parentMenu=this;
_10.from_item=_f;
var _11=this;
dijit.popup.open({parent:this,popup:_10,around:_f.domNode,orient:this._orient||(this.isLeftToRight()?{"TR":"TL","TL":"TR","BR":"BL","BL":"BR"}:{"TL":"TR","TR":"TL","BL":"BR","BR":"BL"}),onCancel:function(){
_11.focusChild(_f);
_11._cleanUp();
_f._setSelected(true);
_11.focusedChild=_f;
},onExecute:dojo.hitch(this,"_cleanUp")});
this.currentPopup=_10;
_10.connect(_10.domNode,"onmouseenter",dojo.hitch(_11,"_onPopupHover"));
if(_10.focus){
_10._focus_timer=setTimeout(dojo.hitch(_10,function(){
this._focus_timer=null;
this.focus();
}),0);
}
},_markActive:function(){
this.isActive=true;
dojo.replaceClass(this.domNode,"dijitMenuActive","dijitMenuPassive");
},onOpen:function(e){
this.isShowingNow=true;
this._markActive();
},_markInactive:function(){
this.isActive=false;
dojo.replaceClass(this.domNode,"dijitMenuPassive","dijitMenuActive");
},onClose:function(){
this._stopFocusTimer();
this._markInactive();
this.isShowingNow=false;
this.parentMenu=null;
},_closeChild:function(){
this._stopPopupTimer();
var _12=this.focusedChild&&this.focusedChild.from_item;
if(this.currentPopup){
if(dijit._curFocus&&dojo.isDescendant(dijit._curFocus,this.currentPopup.domNode)){
this.focusedChild.focusNode.focus();
}
dijit.popup.close(this.currentPopup);
this.currentPopup=null;
}
if(this.focusedChild){
this.focusedChild._setSelected(false);
this.focusedChild._onUnhover();
this.focusedChild=null;
}
},_onItemFocus:function(_13){
if(this._hoveredChild&&this._hoveredChild!=_13){
this._hoveredChild._onUnhover();
}
},_onBlur:function(){
this._cleanUp();
this.inherited(arguments);
},_cleanUp:function(){
this._closeChild();
if(typeof this.isShowingNow=="undefined"){
this._markInactive();
}
}});
dojo.declare("dijit.Menu",dijit._MenuBase,{constructor:function(){
this._bindings=[];
},templateString:dojo.cache("dijit","templates/Menu.html","<table class=\"dijit dijitMenu dijitMenuPassive dijitReset dijitMenuTable\" role=\"menu\" tabIndex=\"${tabIndex}\" dojoAttachEvent=\"onkeypress:_onKeyPress\" cellspacing=\"0\">\n\t<tbody class=\"dijitReset\" dojoAttachPoint=\"containerNode\"></tbody>\n</table>\n"),baseClass:"dijitMenu",targetNodeIds:[],contextMenuForWindow:false,leftClickToOpen:false,refocus:true,postCreate:function(){
if(this.contextMenuForWindow){
this.bindDomNode(dojo.body());
}else{
dojo.forEach(this.targetNodeIds,this.bindDomNode,this);
}
var k=dojo.keys,l=this.isLeftToRight();
this._openSubMenuKey=l?k.RIGHT_ARROW:k.LEFT_ARROW;
this._closeSubMenuKey=l?k.LEFT_ARROW:k.RIGHT_ARROW;
this.connectKeyNavHandlers([k.UP_ARROW],[k.DOWN_ARROW]);
},_onKeyPress:function(evt){
if(evt.ctrlKey||evt.altKey){
return;
}
switch(evt.charOrCode){
case this._openSubMenuKey:
this._moveToPopup(evt);
dojo.stopEvent(evt);
break;
case this._closeSubMenuKey:
if(this.parentMenu){
if(this.parentMenu._isMenuBar){
this.parentMenu.focusPrev();
}else{
this.onCancel(false);
}
}else{
dojo.stopEvent(evt);
}
break;
}
},_iframeContentWindow:function(_14){
var win=dojo.window.get(this._iframeContentDocument(_14))||this._iframeContentDocument(_14)["__parent__"]||(_14.name&&dojo.doc.frames[_14.name])||null;
return win;
},_iframeContentDocument:function(_15){
var doc=_15.contentDocument||(_15.contentWindow&&_15.contentWindow.document)||(_15.name&&dojo.doc.frames[_15.name]&&dojo.doc.frames[_15.name].document)||null;
return doc;
},bindDomNode:function(_16){
_16=dojo.byId(_16);
var cn;
if(_16.tagName.toLowerCase()=="iframe"){
var _17=_16,win=this._iframeContentWindow(_17);
cn=dojo.withGlobal(win,dojo.body);
}else{
cn=(_16==dojo.body()?dojo.doc.documentElement:_16);
}
var _18={node:_16,iframe:_17};
dojo.attr(_16,"_dijitMenu"+this.id,this._bindings.push(_18));
var _19=dojo.hitch(this,function(cn){
return [dojo.connect(cn,this.leftClickToOpen?"onclick":"oncontextmenu",this,function(evt){
dojo.stopEvent(evt);
this._scheduleOpen(evt.target,_17,{x:evt.pageX,y:evt.pageY});
}),dojo.connect(cn,"onkeydown",this,function(evt){
if(evt.shiftKey&&evt.keyCode==dojo.keys.F10){
dojo.stopEvent(evt);
this._scheduleOpen(evt.target,_17);
}
})];
});
_18.connects=cn?_19(cn):[];
if(_17){
_18.onloadHandler=dojo.hitch(this,function(){
var win=this._iframeContentWindow(_17);
cn=dojo.withGlobal(win,dojo.body);
_18.connects=_19(cn);
});
if(_17.addEventListener){
_17.addEventListener("load",_18.onloadHandler,false);
}else{
_17.attachEvent("onload",_18.onloadHandler);
}
}
},unBindDomNode:function(_1a){
var _1b;
try{
_1b=dojo.byId(_1a);
}
catch(e){
return;
}
var _1c="_dijitMenu"+this.id;
if(_1b&&dojo.hasAttr(_1b,_1c)){
var bid=dojo.attr(_1b,_1c)-1,b=this._bindings[bid];
dojo.forEach(b.connects,dojo.disconnect);
var _1d=b.iframe;
if(_1d){
if(_1d.removeEventListener){
_1d.removeEventListener("load",b.onloadHandler,false);
}else{
_1d.detachEvent("onload",b.onloadHandler);
}
}
dojo.removeAttr(_1b,_1c);
delete this._bindings[bid];
}
},_scheduleOpen:function(_1e,_1f,_20){
if(!this._openTimer){
this._openTimer=setTimeout(dojo.hitch(this,function(){
delete this._openTimer;
this._openMyself({target:_1e,iframe:_1f,coords:_20});
}),1);
}
},_openMyself:function(_21){
var _22=_21.target,_23=_21.iframe,_24=_21.coords;
if(_24){
if(_23){
var od=_22.ownerDocument,ifc=dojo.position(_23,true),win=this._iframeContentWindow(_23),_25=dojo.withGlobal(win,"_docScroll",dojo);
var cs=dojo.getComputedStyle(_23),tp=dojo._toPixelValue,_26=(dojo.isIE&&dojo.isQuirks?0:tp(_23,cs.paddingLeft))+(dojo.isIE&&dojo.isQuirks?tp(_23,cs.borderLeftWidth):0),top=(dojo.isIE&&dojo.isQuirks?0:tp(_23,cs.paddingTop))+(dojo.isIE&&dojo.isQuirks?tp(_23,cs.borderTopWidth):0);
_24.x+=ifc.x+_26-_25.x;
_24.y+=ifc.y+top-_25.y;
}
}else{
_24=dojo.position(_22,true);
_24.x+=10;
_24.y+=10;
}
var _27=this;
var _28=dijit.getFocus(this);
function _29(){
if(_27.refocus){
dijit.focus(_28);
}
dijit.popup.close(_27);
};
dijit.popup.open({popup:this,x:_24.x,y:_24.y,onExecute:_29,onCancel:_29,orient:this.isLeftToRight()?"L":"R"});
this.focus();
this._onBlur=function(){
this.inherited("_onBlur",arguments);
dijit.popup.close(this);
};
},uninitialize:function(){
dojo.forEach(this._bindings,function(b){
if(b){
this.unBindDomNode(b.node);
}
},this);
this.inherited(arguments);
}});
}
