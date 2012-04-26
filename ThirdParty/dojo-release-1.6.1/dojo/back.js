/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.back"]){
dojo._hasResource["dojo.back"]=true;
dojo.provide("dojo.back");
dojo.getObject("back",true,dojo);
(function(){
var _1=dojo.back,_2=_1.getHash=function(){
var h=window.location.hash;
if(h.charAt(0)=="#"){
h=h.substring(1);
}
return dojo.isMozilla?h:decodeURIComponent(h);
},_3=_1.setHash=function(h){
if(!h){
h="";
}
window.location.hash=encodeURIComponent(h);
_4=history.length;
};
var _5=(typeof (window)!=="undefined")?window.location.href:"";
var _6=(typeof (window)!=="undefined")?_2():"";
var _7=null;
var _8=null;
var _9=null;
var _a=null;
var _b=[];
var _c=[];
var _d=false;
var _e=false;
var _4;
function _f(){
var _10=_c.pop();
if(!_10){
return;
}
var _11=_c[_c.length-1];
if(!_11&&_c.length==0){
_11=_7;
}
if(_11){
if(_11.kwArgs["back"]){
_11.kwArgs["back"]();
}else{
if(_11.kwArgs["backButton"]){
_11.kwArgs["backButton"]();
}else{
if(_11.kwArgs["handle"]){
_11.kwArgs.handle("back");
}
}
}
}
_b.push(_10);
};
_1.goBack=_f;
function _12(){
var _13=_b.pop();
if(!_13){
return;
}
if(_13.kwArgs["forward"]){
_13.kwArgs.forward();
}else{
if(_13.kwArgs["forwardButton"]){
_13.kwArgs.forwardButton();
}else{
if(_13.kwArgs["handle"]){
_13.kwArgs.handle("forward");
}
}
}
_c.push(_13);
};
_1.goForward=_12;
function _14(url,_15,_16){
return {"url":url,"kwArgs":_15,"urlHash":_16};
};
function _17(url){
var _18=url.split("?");
if(_18.length<2){
return null;
}else{
return _18[1];
}
};
function _19(){
var url=(dojo.config["dojoIframeHistoryUrl"]||dojo.moduleUrl("dojo","resources/iframe_history.html"))+"?"+(new Date()).getTime();
_d=true;
if(_a){
dojo.isWebKit?_a.location=url:window.frames[_a.name].location=url;
}else{
}
return url;
};
function _1a(){
if(!_e){
var hsl=_c.length;
var _1b=_2();
if((_1b===_6||window.location.href==_5)&&(hsl==1)){
_f();
return;
}
if(_b.length>0){
if(_b[_b.length-1].urlHash===_1b){
_12();
return;
}
}
if((hsl>=2)&&(_c[hsl-2])){
if(_c[hsl-2].urlHash===_1b){
_f();
return;
}
}
}
};
_1.init=function(){
if(dojo.byId("dj_history")){
return;
}
var src=dojo.config["dojoIframeHistoryUrl"]||dojo.moduleUrl("dojo","resources/iframe_history.html");
if(dojo._postLoad){
console.error("dojo.back.init() must be called before the DOM has loaded. "+"If using xdomain loading or djConfig.debugAtAllCosts, include dojo.back "+"in a build layer.");
}else{
document.write("<iframe style=\"border:0;width:1px;height:1px;position:absolute;visibility:hidden;bottom:0;right:0;\" name=\"dj_history\" id=\"dj_history\" src=\""+src+"\"></iframe>");
}
};
_1.setInitialState=function(_1c){
_7=_14(_5,_1c,_6);
};
_1.addToHistory=function(_1d){
_b=[];
var _1e=null;
var url=null;
if(!_a){
if(dojo.config["useXDomain"]&&!dojo.config["dojoIframeHistoryUrl"]){
console.warn("dojo.back: When using cross-domain Dojo builds,"+" please save iframe_history.html to your domain and set djConfig.dojoIframeHistoryUrl"+" to the path on your domain to iframe_history.html");
}
_a=window.frames["dj_history"];
}
if(!_9){
_9=dojo.create("a",{style:{display:"none"}},dojo.body());
}
if(_1d["changeUrl"]){
_1e=""+((_1d["changeUrl"]!==true)?_1d["changeUrl"]:(new Date()).getTime());
if(_c.length==0&&_7.urlHash==_1e){
_7=_14(url,_1d,_1e);
return;
}else{
if(_c.length>0&&_c[_c.length-1].urlHash==_1e){
_c[_c.length-1]=_14(url,_1d,_1e);
return;
}
}
_e=true;
setTimeout(function(){
_3(_1e);
_e=false;
},1);
_9.href=_1e;
if(dojo.isIE){
url=_19();
var _1f=_1d["back"]||_1d["backButton"]||_1d["handle"];
var tcb=function(_20){
if(_2()!=""){
setTimeout(function(){
_3(_1e);
},1);
}
_1f.apply(this,[_20]);
};
if(_1d["back"]){
_1d.back=tcb;
}else{
if(_1d["backButton"]){
_1d.backButton=tcb;
}else{
if(_1d["handle"]){
_1d.handle=tcb;
}
}
}
var _21=_1d["forward"]||_1d["forwardButton"]||_1d["handle"];
var tfw=function(_22){
if(_2()!=""){
_3(_1e);
}
if(_21){
_21.apply(this,[_22]);
}
};
if(_1d["forward"]){
_1d.forward=tfw;
}else{
if(_1d["forwardButton"]){
_1d.forwardButton=tfw;
}else{
if(_1d["handle"]){
_1d.handle=tfw;
}
}
}
}else{
if(!dojo.isIE){
if(!_8){
_8=setInterval(_1a,200);
}
}
}
}else{
url=_19();
}
_c.push(_14(url,_1d,_1e));
};
_1._iframeLoaded=function(evt,_23){
var _24=_17(_23.href);
if(_24==null){
if(_c.length==1){
_f();
}
return;
}
if(_d){
_d=false;
return;
}
if(_c.length>=2&&_24==_17(_c[_c.length-2].url)){
_f();
}else{
if(_b.length>0&&_24==_17(_b[_b.length-1].url)){
_12();
}
}
};
})();
}
