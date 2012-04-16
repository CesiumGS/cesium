/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.FileInputAuto"]){
dojo._hasResource["dojox.form.FileInputAuto"]=true;
dojo.provide("dojox.form.FileInputAuto");
dojo.require("dojox.form.FileInput");
dojo.require("dojo.io.iframe");
dojo.declare("dojox.form.FileInputAuto",dojox.form.FileInput,{url:"",blurDelay:2000,duration:500,uploadMessage:"Uploading ...",triggerEvent:"onblur",_sent:false,templateString:dojo.cache("dojox.form","resources/FileInputAuto.html","<div class=\"dijitFileInput\">\n\t<input id=\"${id}\" name=\"${name}\" class=\"dijitFileInputReal\" type=\"file\" dojoAttachPoint=\"fileInput\" />\n\t<div class=\"dijitFakeInput\" dojoAttachPoint=\"fakeNodeHolder\">\n\t\t<input class=\"dijitFileInputVisible\" type=\"text\" dojoAttachPoint=\"focusNode, inputNode\" />\n\t\t<div class=\"dijitInline dijitFileInputText\" dojoAttachPoint=\"titleNode\">${label}</div>\n\t\t<div class=\"dijitInline dijitFileInputButton\" dojoAttachPoint=\"cancelNode\" dojoAttachEvent=\"onclick:reset\">${cancelText}</div>\n\t</div>\n\t<div class=\"dijitProgressOverlay\" dojoAttachPoint=\"overlay\">&nbsp;</div>\n</div>\n"),onBeforeSend:function(){
return {};
},startup:function(){
this._blurListener=this.connect(this.fileInput,this.triggerEvent,"_onBlur");
this._focusListener=this.connect(this.fileInput,"onfocus","_onFocus");
this.inherited(arguments);
},_onFocus:function(){
if(this._blurTimer){
clearTimeout(this._blurTimer);
}
},_onBlur:function(){
if(this._blurTimer){
clearTimeout(this._blurTimer);
}
if(!this._sent){
this._blurTimer=setTimeout(dojo.hitch(this,"_sendFile"),this.blurDelay);
}
},setMessage:function(_1){
this.overlay.removeChild(this.overlay.firstChild);
this.overlay.appendChild(document.createTextNode(_1));
},_sendFile:function(e){
if(this._sent||this._sending||!this.fileInput.value){
return;
}
this._sending=true;
dojo.style(this.fakeNodeHolder,"display","none");
dojo.style(this.overlay,{opacity:0,display:"block"});
this.setMessage(this.uploadMessage);
dojo.fadeIn({node:this.overlay,duration:this.duration}).play();
var _2;
if(dojo.isIE<9||(dojo.isIE&&dojo.isQuirks)){
_2=document.createElement("<form enctype=\"multipart/form-data\" method=\"post\">");
_2.encoding="multipart/form-data";
}else{
_2=document.createElement("form");
_2.setAttribute("enctype","multipart/form-data");
}
_2.appendChild(this.fileInput);
dojo.body().appendChild(_2);
dojo.io.iframe.send({url:this.url,form:_2,handleAs:"json",handle:dojo.hitch(this,"_handleSend"),content:this.onBeforeSend()});
},_handleSend:function(_3,_4){
this.overlay.removeChild(this.overlay.firstChild);
this._sent=true;
this._sending=false;
dojo.style(this.overlay,{opacity:0,border:"none",background:"none"});
this.overlay.style.backgroundImage="none";
this.fileInput.style.display="none";
this.fakeNodeHolder.style.display="none";
dojo.fadeIn({node:this.overlay,duration:this.duration}).play(250);
this.disconnect(this._blurListener);
this.disconnect(this._focusListener);
dojo.body().removeChild(_4.args.form);
this.fileInput=null;
this.onComplete(_3,_4,this);
},reset:function(e){
if(this._blurTimer){
clearTimeout(this._blurTimer);
}
this.disconnect(this._blurListener);
this.disconnect(this._focusListener);
this.overlay.style.display="none";
this.fakeNodeHolder.style.display="";
this.inherited(arguments);
this._sent=false;
this._sending=false;
this._blurListener=this.connect(this.fileInput,this.triggerEvent,"_onBlur");
this._focusListener=this.connect(this.fileInput,"onfocus","_onFocus");
},onComplete:function(_5,_6,_7){
}});
dojo.declare("dojox.form.FileInputBlind",dojox.form.FileInputAuto,{startup:function(){
this.inherited(arguments);
this._off=dojo.style(this.inputNode,"width");
this.inputNode.style.display="none";
this._fixPosition();
},_fixPosition:function(){
if(dojo.isIE){
dojo.style(this.fileInput,"width","1px");
}else{
dojo.style(this.fileInput,"left","-"+(this._off)+"px");
}
},reset:function(e){
this.inherited(arguments);
this._fixPosition();
}});
}
