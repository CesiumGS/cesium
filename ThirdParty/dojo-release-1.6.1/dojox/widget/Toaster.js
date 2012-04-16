/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Toaster"]){
dojo._hasResource["dojox.widget.Toaster"]=true;
dojo.provide("dojox.widget.Toaster");
dojo.require("dojo.fx");
dojo.require("dojo.window");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dojox.widget.Toaster",[dijit._Widget,dijit._Templated],{templateString:"<div class=\"dijitToasterClip\" dojoAttachPoint=\"clipNode\"><div class=\"dijitToasterContainer\" dojoAttachPoint=\"containerNode\" dojoAttachEvent=\"onclick:onSelect\"><div class=\"dijitToasterContent\" dojoAttachPoint=\"contentNode\"></div></div></div>",messageTopic:"",messageTypes:{MESSAGE:"message",WARNING:"warning",ERROR:"error",FATAL:"fatal"},defaultType:"message",positionDirection:"br-up",positionDirectionTypes:["br-up","br-left","bl-up","bl-right","tr-down","tr-left","tl-down","tl-right"],duration:2000,slideDuration:500,separator:"<hr></hr>",postCreate:function(){
this.inherited(arguments);
this.hide();
dojo.body().appendChild(this.domNode);
if(this.messageTopic){
dojo.subscribe(this.messageTopic,this,"_handleMessage");
}
},_handleMessage:function(_1){
if(dojo.isString(_1)){
this.setContent(_1);
}else{
this.setContent(_1.message,_1.type,_1.duration);
}
},_capitalize:function(w){
return w.substring(0,1).toUpperCase()+w.substring(1);
},setContent:function(_2,_3,_4){
_4=_4||this.duration;
if(this.slideAnim){
if(this.slideAnim.status()!="playing"){
this.slideAnim.stop();
}
if(this.slideAnim.status()=="playing"||(this.fadeAnim&&this.fadeAnim.status()=="playing")){
setTimeout(dojo.hitch(this,function(){
this.setContent(_2,_3,_4);
}),50);
return;
}
}
for(var _5 in this.messageTypes){
dojo.removeClass(this.containerNode,"dijitToaster"+this._capitalize(this.messageTypes[_5]));
}
dojo.style(this.containerNode,"opacity",1);
this._setContent(_2);
dojo.addClass(this.containerNode,"dijitToaster"+this._capitalize(_3||this.defaultType));
this.show();
var _6=dojo.marginBox(this.containerNode);
this._cancelHideTimer();
if(this.isVisible){
this._placeClip();
if(!this._stickyMessage){
this._setHideTimer(_4);
}
}else{
var _7=this.containerNode.style;
var pd=this.positionDirection;
if(pd.indexOf("-up")>=0){
_7.left=0+"px";
_7.top=_6.h+10+"px";
}else{
if(pd.indexOf("-left")>=0){
_7.left=_6.w+10+"px";
_7.top=0+"px";
}else{
if(pd.indexOf("-right")>=0){
_7.left=0-_6.w-10+"px";
_7.top=0+"px";
}else{
if(pd.indexOf("-down")>=0){
_7.left=0+"px";
_7.top=0-_6.h-10+"px";
}else{
throw new Error(this.id+".positionDirection is invalid: "+pd);
}
}
}
}
this.slideAnim=dojo.fx.slideTo({node:this.containerNode,top:0,left:0,duration:this.slideDuration});
this.connect(this.slideAnim,"onEnd",function(_8,_9){
this.fadeAnim=dojo.fadeOut({node:this.containerNode,duration:1000});
this.connect(this.fadeAnim,"onEnd",function(_a){
this.isVisible=false;
this.hide();
});
this._setHideTimer(_4);
this.connect(this,"onSelect",function(_b){
this._cancelHideTimer();
this._stickyMessage=false;
this.fadeAnim.play();
});
this.isVisible=true;
});
this.slideAnim.play();
}
},_setContent:function(_c){
if(dojo.isFunction(_c)){
_c(this);
return;
}
if(_c&&this.isVisible){
_c=this.contentNode.innerHTML+this.separator+_c;
}
this.contentNode.innerHTML=_c;
},_cancelHideTimer:function(){
if(this._hideTimer){
clearTimeout(this._hideTimer);
this._hideTimer=null;
}
},_setHideTimer:function(_d){
this._cancelHideTimer();
if(_d>0){
this._cancelHideTimer();
this._hideTimer=setTimeout(dojo.hitch(this,function(_e){
if(this.bgIframe&&this.bgIframe.iframe){
this.bgIframe.iframe.style.display="none";
}
this._hideTimer=null;
this._stickyMessage=false;
this.fadeAnim.play();
}),_d);
}else{
this._stickyMessage=true;
}
},_placeClip:function(){
var _f=dojo.window.getBox();
var _10=dojo.marginBox(this.containerNode);
var _11=this.clipNode.style;
_11.height=_10.h+"px";
_11.width=_10.w+"px";
var pd=this.positionDirection;
if(pd.match(/^t/)){
_11.top=_f.t+"px";
}else{
if(pd.match(/^b/)){
_11.top=(_f.h-_10.h-2+_f.t)+"px";
}
}
if(pd.match(/^[tb]r-/)){
_11.left=(_f.w-_10.w-1-_f.l)+"px";
}else{
if(pd.match(/^[tb]l-/)){
_11.left=0+"px";
}
}
_11.clip="rect(0px, "+_10.w+"px, "+_10.h+"px, 0px)";
if(dojo.isIE){
if(!this.bgIframe){
this.clipNode.id=dijit.getUniqueId("dojox_widget_Toaster_clipNode");
this.bgIframe=new dijit.BackgroundIframe(this.clipNode);
}
var _12=this.bgIframe.iframe;
if(_12){
_12.style.display="block";
}
}
},onSelect:function(e){
},show:function(){
dojo.style(this.domNode,"display","block");
this._placeClip();
if(!this._scrollConnected){
this._scrollConnected=dojo.connect(window,"onscroll",this,this._placeClip);
}
},hide:function(){
dojo.style(this.domNode,"display","none");
if(this._scrollConnected){
dojo.disconnect(this._scrollConnected);
this._scrollConnected=false;
}
dojo.style(this.containerNode,"opacity",1);
}});
}
