/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.uploader.Base"]){
dojo._hasResource["dojox.form.uploader.Base"]=true;
dojo.provide("dojox.form.uploader.Base");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dojox.form.uploader.Base",[dijit._Widget,dijit._Templated],{getForm:function(){
if(!this.form){
var n=this.domNode;
while(n&&n.tagName&&n!==document.body){
if(n.tagName.toLowerCase()=="form"){
this.form=n;
break;
}
n=n.parentNode;
}
}
return this.form;
},getUrl:function(){
if(this.uploadUrl){
this.url=this.uploadUrl;
}
if(this.url){
return this.url;
}
if(this.getForm()){
this.url=this.form.action;
}
return this.url;
},connectForm:function(){
this.url=this.getUrl();
if(!this._fcon&&!!this.getForm()){
this._fcon=true;
this.connect(this.form,"onsubmit",function(_1){
dojo.stopEvent(_1);
this.submit(dojo.formToObject(this.form));
});
}
},supports:function(_2){
if(!this._hascache){
this._hascache={testDiv:dojo.create("div"),testInput:dojo.create("input",{type:"file"}),xhr:!!window.XMLHttpRequest?new XMLHttpRequest():{}};
dojo.style(this._hascache.testDiv,"opacity",0.7);
}
switch(_2){
case "FormData":
return !!window.FormData;
case "sendAsBinary":
return !!this._hascache.xhr.sendAsBinary;
case "opacity":
return dojo.style(this._hascache.testDiv,"opacity")==0.7;
case "multiple":
if(this.force=="flash"||this.force=="iframe"){
return false;
}
var _3=dojo.attr(this._hascache.testInput,"multiple");
return _3===true||_3===false;
}
return false;
},getMimeType:function(){
return "application/octet-stream";
},getFileType:function(_4){
return _4.substring(_4.lastIndexOf(".")+1).toUpperCase();
},convertBytes:function(_5){
var kb=Math.round(_5/1024*100000)/100000;
var mb=Math.round(_5/1048576*100000)/100000;
var gb=Math.round(_5/1073741824*100000)/100000;
var _6=_5;
if(kb>1){
_6=kb.toFixed(1)+" kb";
}
if(mb>1){
_6=mb.toFixed(1)+" mb";
}
if(gb>1){
_6=gb.toFixed(1)+" gb";
}
return {kb:kb,mb:mb,gb:gb,bytes:_5,value:_6};
}});
}
