/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.io.iframe"]){
dojo._hasResource["dojo.io.iframe"]=true;
dojo.provide("dojo.io.iframe");
dojo.getObject("io",true,dojo);
dojo.io.iframe={create:function(_1,_2,_3){
if(window[_1]){
return window[_1];
}
if(window.frames[_1]){
return window.frames[_1];
}
var _4=null;
var _5=_3;
if(!_5){
if(dojo.config["useXDomain"]&&!dojo.config["dojoBlankHtmlUrl"]){
console.warn("dojo.io.iframe.create: When using cross-domain Dojo builds,"+" please save dojo/resources/blank.html to your domain and set djConfig.dojoBlankHtmlUrl"+" to the path on your domain to blank.html");
}
_5=(dojo.config["dojoBlankHtmlUrl"]||dojo.moduleUrl("dojo","resources/blank.html"));
}
var _4=dojo.place("<iframe id=\""+_1+"\" name=\""+_1+"\" src=\""+_5+"\" onload=\""+_2+"\" style=\"position: absolute; left: 1px; top: 1px; height: 1px; width: 1px; visibility: hidden\">",dojo.body());
window[_1]=_4;
return _4;
},setSrc:function(_6,_7,_8){
try{
if(!_8){
if(dojo.isWebKit){
_6.location=_7;
}else{
frames[_6.name].location=_7;
}
}else{
var _9;
if(dojo.isIE||dojo.isWebKit){
_9=_6.contentWindow.document;
}else{
_9=_6.contentWindow;
}
if(!_9){
_6.location=_7;
return;
}else{
_9.location.replace(_7);
}
}
}
catch(e){
}
},doc:function(_a){
var _b=_a.contentDocument||(((_a.name)&&(_a.document)&&(dojo.doc.getElementsByTagName("iframe")[_a.name].contentWindow)&&(dojo.doc.getElementsByTagName("iframe")[_a.name].contentWindow.document)))||((_a.name)&&(dojo.doc.frames[_a.name])&&(dojo.doc.frames[_a.name].document))||null;
return _b;
},send:function(_c){
if(!this["_frame"]){
this._frame=this.create(this._iframeName,dojo._scopeName+".io.iframe._iframeOnload();");
}
var _d=dojo._ioSetArgs(_c,function(_e){
_e.canceled=true;
_e.ioArgs._callNext();
},function(_f){
var _10=null;
try{
var _11=_f.ioArgs;
var dii=dojo.io.iframe;
var ifd=dii.doc(dii._frame);
var _12=_11.handleAs;
_10=ifd;
if(_12!="html"){
if(_12=="xml"){
if(dojo.isIE<9||(dojo.isIE&&dojo.isQuirks)){
dojo.query("a",dii._frame.contentWindow.document.documentElement).orphan();
var _13=(dii._frame.contentWindow.document).documentElement.innerText;
_13=_13.replace(/>\s+</g,"><");
_13=dojo.trim(_13);
var _14={responseText:_13};
_10=dojo._contentHandlers["xml"](_14);
}
}else{
_10=ifd.getElementsByTagName("textarea")[0].value;
if(_12=="json"){
_10=dojo.fromJson(_10);
}else{
if(_12=="javascript"){
_10=dojo.eval(_10);
}
}
}
}
}
catch(e){
_10=e;
}
finally{
_11._callNext();
}
return _10;
},function(_15,dfd){
dfd.ioArgs._hasError=true;
dfd.ioArgs._callNext();
return _15;
});
_d.ioArgs._callNext=function(){
if(!this["_calledNext"]){
this._calledNext=true;
dojo.io.iframe._currentDfd=null;
dojo.io.iframe._fireNextRequest();
}
};
this._dfdQueue.push(_d);
this._fireNextRequest();
dojo._ioWatch(_d,function(dfd){
return !dfd.ioArgs["_hasError"];
},function(dfd){
return (!!dfd.ioArgs["_finished"]);
},function(dfd){
if(dfd.ioArgs._finished){
dfd.callback(dfd);
}else{
dfd.errback(new Error("Invalid dojo.io.iframe request state"));
}
});
return _d;
},_currentDfd:null,_dfdQueue:[],_iframeName:dojo._scopeName+"IoIframe",_fireNextRequest:function(){
try{
if((this._currentDfd)||(this._dfdQueue.length==0)){
return;
}
do{
var dfd=this._currentDfd=this._dfdQueue.shift();
}while(dfd&&dfd.canceled&&this._dfdQueue.length);
if(!dfd||dfd.canceled){
this._currentDfd=null;
return;
}
var _16=dfd.ioArgs;
var _17=_16.args;
_16._contentToClean=[];
var fn=dojo.byId(_17["form"]);
var _18=_17["content"]||{};
if(fn){
if(_18){
var _19=function(_1a,_1b){
dojo.create("input",{type:"hidden",name:_1a,value:_1b},fn);
_16._contentToClean.push(_1a);
};
for(var x in _18){
var val=_18[x];
if(dojo.isArray(val)&&val.length>1){
var i;
for(i=0;i<val.length;i++){
_19(x,val[i]);
}
}else{
if(!fn[x]){
_19(x,val);
}else{
fn[x].value=val;
}
}
}
}
var _1c=fn.getAttributeNode("action");
var _1d=fn.getAttributeNode("method");
var _1e=fn.getAttributeNode("target");
if(_17["url"]){
_16._originalAction=_1c?_1c.value:null;
if(_1c){
_1c.value=_17.url;
}else{
fn.setAttribute("action",_17.url);
}
}
if(!_1d||!_1d.value){
if(_1d){
_1d.value=(_17["method"])?_17["method"]:"post";
}else{
fn.setAttribute("method",(_17["method"])?_17["method"]:"post");
}
}
_16._originalTarget=_1e?_1e.value:null;
if(_1e){
_1e.value=this._iframeName;
}else{
fn.setAttribute("target",this._iframeName);
}
fn.target=this._iframeName;
dojo._ioNotifyStart(dfd);
fn.submit();
}else{
var _1f=_17.url+(_17.url.indexOf("?")>-1?"&":"?")+_16.query;
dojo._ioNotifyStart(dfd);
this.setSrc(this._frame,_1f,true);
}
}
catch(e){
dfd.errback(e);
}
},_iframeOnload:function(){
var dfd=this._currentDfd;
if(!dfd){
this._fireNextRequest();
return;
}
var _20=dfd.ioArgs;
var _21=_20.args;
var _22=dojo.byId(_21.form);
if(_22){
var _23=_20._contentToClean;
for(var i=0;i<_23.length;i++){
var key=_23[i];
for(var j=0;j<_22.childNodes.length;j++){
var _24=_22.childNodes[j];
if(_24.name==key){
dojo.destroy(_24);
break;
}
}
}
if(_20["_originalAction"]){
_22.setAttribute("action",_20._originalAction);
}
if(_20["_originalTarget"]){
_22.setAttribute("target",_20._originalTarget);
_22.target=_20._originalTarget;
}
}
_20._finished=true;
}};
}
