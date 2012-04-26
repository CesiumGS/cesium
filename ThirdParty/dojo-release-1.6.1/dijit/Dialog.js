/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.Dialog"]){
dojo._hasResource["dijit.Dialog"]=true;
dojo.provide("dijit.Dialog");
dojo.require("dojo.dnd.move");
dojo.require("dojo.dnd.TimedMoveable");
dojo.require("dojo.fx");
dojo.require("dojo.window");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._CssStateMixin");
dojo.require("dijit.form._FormMixin");
dojo.require("dijit._DialogMixin");
dojo.require("dijit.DialogUnderlay");
dojo.require("dijit.layout.ContentPane");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.require("dijit.TooltipDialog");
dojo.declare("dijit._DialogBase",[dijit._Templated,dijit.form._FormMixin,dijit._DialogMixin,dijit._CssStateMixin],{templateString:dojo.cache("dijit","templates/Dialog.html","<div class=\"dijitDialog\" role=\"dialog\" aria-labelledby=\"${id}_title\">\n\t<div dojoAttachPoint=\"titleBar\" class=\"dijitDialogTitleBar\">\n\t<span dojoAttachPoint=\"titleNode\" class=\"dijitDialogTitle\" id=\"${id}_title\"></span>\n\t<span dojoAttachPoint=\"closeButtonNode\" class=\"dijitDialogCloseIcon\" dojoAttachEvent=\"ondijitclick: onCancel\" title=\"${buttonCancel}\" role=\"button\" tabIndex=\"-1\">\n\t\t<span dojoAttachPoint=\"closeText\" class=\"closeText\" title=\"${buttonCancel}\">x</span>\n\t</span>\n\t</div>\n\t\t<div dojoAttachPoint=\"containerNode\" class=\"dijitDialogPaneContent\"></div>\n</div>\n"),baseClass:"dijitDialog",cssStateNodes:{closeButtonNode:"dijitDialogCloseIcon"},attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{title:[{node:"titleNode",type:"innerHTML"},{node:"titleBar",type:"attribute"}],"aria-describedby":""}),open:false,duration:dijit.defaultDuration,refocus:true,autofocus:true,_firstFocusItem:null,_lastFocusItem:null,doLayout:false,draggable:true,"aria-describedby":"",postMixInProperties:function(){
var _1=dojo.i18n.getLocalization("dijit","common");
dojo.mixin(this,_1);
this.inherited(arguments);
},postCreate:function(){
dojo.style(this.domNode,{display:"none",position:"absolute"});
dojo.body().appendChild(this.domNode);
this.inherited(arguments);
this.connect(this,"onExecute","hide");
this.connect(this,"onCancel","hide");
this._modalconnects=[];
},onLoad:function(){
this._position();
if(this.autofocus&&dijit._DialogLevelManager.isTop(this)){
this._getFocusItems(this.domNode);
dijit.focus(this._firstFocusItem);
}
this.inherited(arguments);
},_endDrag:function(e){
if(e&&e.node&&e.node===this.domNode){
this._relativePosition=dojo.position(e.node);
}
},_setup:function(){
var _2=this.domNode;
if(this.titleBar&&this.draggable){
this._moveable=(dojo.isIE==6)?new dojo.dnd.TimedMoveable(_2,{handle:this.titleBar}):new dojo.dnd.Moveable(_2,{handle:this.titleBar,timeout:0});
this._dndListener=dojo.subscribe("/dnd/move/stop",this,"_endDrag");
}else{
dojo.addClass(_2,"dijitDialogFixed");
}
this.underlayAttrs={dialogId:this.id,"class":dojo.map(this["class"].split(/\s/),function(s){
return s+"_underlay";
}).join(" ")};
},_size:function(){
this._checkIfSingleChild();
if(this._singleChild){
if(this._singleChildOriginalStyle){
this._singleChild.domNode.style.cssText=this._singleChildOriginalStyle;
}
delete this._singleChildOriginalStyle;
}else{
dojo.style(this.containerNode,{width:"auto",height:"auto"});
}
var mb=dojo._getMarginSize(this.domNode);
var _3=dojo.window.getBox();
if(mb.w>=_3.w||mb.h>=_3.h){
var w=Math.min(mb.w,Math.floor(_3.w*0.75)),h=Math.min(mb.h,Math.floor(_3.h*0.75));
if(this._singleChild&&this._singleChild.resize){
this._singleChildOriginalStyle=this._singleChild.domNode.style.cssText;
this._singleChild.resize({w:w,h:h});
}else{
dojo.style(this.containerNode,{width:w+"px",height:h+"px",overflow:"auto",position:"relative"});
}
}else{
if(this._singleChild&&this._singleChild.resize){
this._singleChild.resize();
}
}
},_position:function(){
if(!dojo.hasClass(dojo.body(),"dojoMove")){
var _4=this.domNode,_5=dojo.window.getBox(),p=this._relativePosition,bb=p?null:dojo._getBorderBox(_4),l=Math.floor(_5.l+(p?p.x:(_5.w-bb.w)/2)),t=Math.floor(_5.t+(p?p.y:(_5.h-bb.h)/2));
dojo.style(_4,{left:l+"px",top:t+"px"});
}
},_onKey:function(_6){
if(_6.charOrCode){
var dk=dojo.keys;
var _7=_6.target;
if(_6.charOrCode===dk.TAB){
this._getFocusItems(this.domNode);
}
var _8=(this._firstFocusItem==this._lastFocusItem);
if(_7==this._firstFocusItem&&_6.shiftKey&&_6.charOrCode===dk.TAB){
if(!_8){
dijit.focus(this._lastFocusItem);
}
dojo.stopEvent(_6);
}else{
if(_7==this._lastFocusItem&&_6.charOrCode===dk.TAB&&!_6.shiftKey){
if(!_8){
dijit.focus(this._firstFocusItem);
}
dojo.stopEvent(_6);
}else{
while(_7){
if(_7==this.domNode||dojo.hasClass(_7,"dijitPopup")){
if(_6.charOrCode==dk.ESCAPE){
this.onCancel();
}else{
return;
}
}
_7=_7.parentNode;
}
if(_6.charOrCode!==dk.TAB){
dojo.stopEvent(_6);
}else{
if(!dojo.isOpera){
try{
this._firstFocusItem.focus();
}
catch(e){
}
}
}
}
}
}
},show:function(){
if(this.open){
return;
}
if(!this._started){
this.startup();
}
if(!this._alreadyInitialized){
this._setup();
this._alreadyInitialized=true;
}
if(this._fadeOutDeferred){
this._fadeOutDeferred.cancel();
}
this._modalconnects.push(dojo.connect(window,"onscroll",this,"layout"));
this._modalconnects.push(dojo.connect(window,"onresize",this,function(){
var _9=dojo.window.getBox();
if(!this._oldViewport||_9.h!=this._oldViewport.h||_9.w!=this._oldViewport.w){
this.layout();
this._oldViewport=_9;
}
}));
this._modalconnects.push(dojo.connect(this.domNode,"onkeypress",this,"_onKey"));
dojo.style(this.domNode,{opacity:0,display:""});
this._set("open",true);
this._onShow();
this._size();
this._position();
var _a;
this._fadeInDeferred=new dojo.Deferred(dojo.hitch(this,function(){
_a.stop();
delete this._fadeInDeferred;
}));
_a=dojo.fadeIn({node:this.domNode,duration:this.duration,beforeBegin:dojo.hitch(this,function(){
dijit._DialogLevelManager.show(this,this.underlayAttrs);
}),onEnd:dojo.hitch(this,function(){
if(this.autofocus&&dijit._DialogLevelManager.isTop(this)){
this._getFocusItems(this.domNode);
dijit.focus(this._firstFocusItem);
}
this._fadeInDeferred.callback(true);
delete this._fadeInDeferred;
})}).play();
return this._fadeInDeferred;
},hide:function(){
if(!this._alreadyInitialized){
return;
}
if(this._fadeInDeferred){
this._fadeInDeferred.cancel();
}
var _b;
this._fadeOutDeferred=new dojo.Deferred(dojo.hitch(this,function(){
_b.stop();
delete this._fadeOutDeferred;
}));
_b=dojo.fadeOut({node:this.domNode,duration:this.duration,onEnd:dojo.hitch(this,function(){
this.domNode.style.display="none";
dijit._DialogLevelManager.hide(this);
this.onHide();
this._fadeOutDeferred.callback(true);
delete this._fadeOutDeferred;
})}).play();
if(this._scrollConnected){
this._scrollConnected=false;
}
dojo.forEach(this._modalconnects,dojo.disconnect);
this._modalconnects=[];
if(this._relativePosition){
delete this._relativePosition;
}
this._set("open",false);
return this._fadeOutDeferred;
},layout:function(){
if(this.domNode.style.display!="none"){
if(dijit._underlay){
dijit._underlay.layout();
}
this._position();
}
},destroy:function(){
if(this._fadeInDeferred){
this._fadeInDeferred.cancel();
}
if(this._fadeOutDeferred){
this._fadeOutDeferred.cancel();
}
if(this._moveable){
this._moveable.destroy();
}
if(this._dndListener){
dojo.unsubscribe(this._dndListener);
}
dojo.forEach(this._modalconnects,dojo.disconnect);
dijit._DialogLevelManager.hide(this);
this.inherited(arguments);
}});
dojo.declare("dijit.Dialog",[dijit.layout.ContentPane,dijit._DialogBase],{});
dijit._DialogLevelManager={show:function(_c,_d){
var ds=dijit._dialogStack;
ds[ds.length-1].focus=dijit.getFocus(_c);
var _e=dijit._underlay;
if(!_e||_e._destroyed){
_e=dijit._underlay=new dijit.DialogUnderlay(_d);
}else{
_e.set(_c.underlayAttrs);
}
var _f=ds[ds.length-1].dialog?ds[ds.length-1].zIndex+2:950;
if(ds.length==1){
_e.show();
}
dojo.style(dijit._underlay.domNode,"zIndex",_f-1);
dojo.style(_c.domNode,"zIndex",_f);
ds.push({dialog:_c,underlayAttrs:_d,zIndex:_f});
},hide:function(_10){
var ds=dijit._dialogStack;
if(ds[ds.length-1].dialog==_10){
ds.pop();
var pd=ds[ds.length-1];
if(ds.length==1){
if(!dijit._underlay._destroyed){
dijit._underlay.hide();
}
}else{
dojo.style(dijit._underlay.domNode,"zIndex",pd.zIndex-1);
dijit._underlay.set(pd.underlayAttrs);
}
if(_10.refocus){
var _11=pd.focus;
if(!_11||(pd.dialog&&!dojo.isDescendant(_11.node,pd.dialog.domNode))){
pd.dialog._getFocusItems(pd.dialog.domNode);
_11=pd.dialog._firstFocusItem;
}
try{
dijit.focus(_11);
}
catch(e){
}
}
}else{
var idx=dojo.indexOf(dojo.map(ds,function(_12){
return _12.dialog;
}),_10);
if(idx!=-1){
ds.splice(idx,1);
}
}
},isTop:function(_13){
var ds=dijit._dialogStack;
return ds[ds.length-1].dialog==_13;
}};
dijit._dialogStack=[{dialog:null,focus:null,underlayAttrs:null}];
}
