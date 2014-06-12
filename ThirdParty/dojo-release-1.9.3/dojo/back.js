/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/back",["./_base/config","./_base/lang","./sniff","./dom","./dom-construct","./_base/window","require"],function(_1,_2,_3,_4,_5,_6,_7){
var _8={};
1&&_2.setObject("dojo.back",_8);
var _9=_8.getHash=function(){
var h=window.location.hash;
if(h.charAt(0)=="#"){
h=h.substring(1);
}
return _3("mozilla")?h:decodeURIComponent(h);
},_a=_8.setHash=function(h){
if(!h){
h="";
}
window.location.hash=encodeURIComponent(h);
_b=history.length;
};
var _c=(typeof (window)!=="undefined")?window.location.href:"";
var _d=(typeof (window)!=="undefined")?_9():"";
var _e=null;
var _f=null;
var _10=null;
var _11=null;
var _12=[];
var _13=[];
var _14=false;
var _15=false;
var _b;
function _16(){
var _17=_13.pop();
if(!_17){
return;
}
var _18=_13[_13.length-1];
if(!_18&&_13.length==0){
_18=_e;
}
if(_18){
if(_18.kwArgs["back"]){
_18.kwArgs["back"]();
}else{
if(_18.kwArgs["backButton"]){
_18.kwArgs["backButton"]();
}else{
if(_18.kwArgs["handle"]){
_18.kwArgs.handle("back");
}
}
}
}
_12.push(_17);
};
_8.goBack=_16;
function _19(){
var _1a=_12.pop();
if(!_1a){
return;
}
if(_1a.kwArgs["forward"]){
_1a.kwArgs.forward();
}else{
if(_1a.kwArgs["forwardButton"]){
_1a.kwArgs.forwardButton();
}else{
if(_1a.kwArgs["handle"]){
_1a.kwArgs.handle("forward");
}
}
}
_13.push(_1a);
};
_8.goForward=_19;
function _1b(url,_1c,_1d){
return {"url":url,"kwArgs":_1c,"urlHash":_1d};
};
function _1e(url){
var _1f=url.split("?");
if(_1f.length<2){
return null;
}else{
return _1f[1];
}
};
function _20(){
var url=(_1["dojoIframeHistoryUrl"]||_7.toUrl("./resources/iframe_history.html"))+"?"+(new Date()).getTime();
_14=true;
if(_11){
_3("webkit")?_11.location=url:window.frames[_11.name].location=url;
}else{
}
return url;
};
function _21(){
if(!_15){
var hsl=_13.length;
var _22=_9();
if((_22===_d||window.location.href==_c)&&(hsl==1)){
_16();
return;
}
if(_12.length>0){
if(_12[_12.length-1].urlHash===_22){
_19();
return;
}
}
if((hsl>=2)&&(_13[hsl-2])){
if(_13[hsl-2].urlHash===_22){
_16();
}
}
}
};
_8.init=function(){
if(_4.byId("dj_history")){
return;
}
var src=_1["dojoIframeHistoryUrl"]||_7.toUrl("./resources/iframe_history.html");
if(_1.afterOnLoad){
console.error("dojo/back::init() must be called before the DOM has loaded. "+"Include dojo/back in a build layer.");
}else{
document.write("<iframe style=\"border:0;width:1px;height:1px;position:absolute;visibility:hidden;bottom:0;right:0;\" name=\"dj_history\" id=\"dj_history\" src=\""+src+"\"></iframe>");
}
};
_8.setInitialState=function(_23){
_e=_1b(_c,_23,_d);
};
_8.addToHistory=function(_24){
_12=[];
var _25=null;
var url=null;
if(!_11){
if(_1["useXDomain"]&&!_1["dojoIframeHistoryUrl"]){
console.warn("dojo/back: When using cross-domain Dojo builds,"+" please save iframe_history.html to your domain and set djConfig.dojoIframeHistoryUrl"+" to the path on your domain to iframe_history.html");
}
_11=window.frames["dj_history"];
}
if(!_10){
_10=_5.create("a",{style:{display:"none"}},_6.body());
}
if(_24["changeUrl"]){
_25=""+((_24["changeUrl"]!==true)?_24["changeUrl"]:(new Date()).getTime());
if(_13.length==0&&_e.urlHash==_25){
_e=_1b(url,_24,_25);
return;
}else{
if(_13.length>0&&_13[_13.length-1].urlHash==_25){
_13[_13.length-1]=_1b(url,_24,_25);
return;
}
}
_15=true;
setTimeout(function(){
_a(_25);
_15=false;
},1);
_10.href=_25;
if(_3("ie")){
url=_20();
var _26=_24["back"]||_24["backButton"]||_24["handle"];
var tcb=function(_27){
if(_9()!=""){
setTimeout(function(){
_a(_25);
},1);
}
_26.apply(this,[_27]);
};
if(_24["back"]){
_24.back=tcb;
}else{
if(_24["backButton"]){
_24.backButton=tcb;
}else{
if(_24["handle"]){
_24.handle=tcb;
}
}
}
var _28=_24["forward"]||_24["forwardButton"]||_24["handle"];
var tfw=function(_29){
if(_9()!=""){
_a(_25);
}
if(_28){
_28.apply(this,[_29]);
}
};
if(_24["forward"]){
_24.forward=tfw;
}else{
if(_24["forwardButton"]){
_24.forwardButton=tfw;
}else{
if(_24["handle"]){
_24.handle=tfw;
}
}
}
}else{
if(!_3("ie")){
if(!_f){
_f=setInterval(_21,200);
}
}
}
}else{
url=_20();
}
_13.push(_1b(url,_24,_25));
};
_8._iframeLoaded=function(evt,_2a){
var _2b=_1e(_2a.href);
if(_2b==null){
if(_13.length==1){
_16();
}
return;
}
if(_14){
_14=false;
return;
}
if(_13.length>=2&&_2b==_1e(_13[_13.length-2].url)){
_16();
}else{
if(_12.length>0&&_2b==_1e(_12[_12.length-1].url)){
_19();
}
}
};
return _8;
});
