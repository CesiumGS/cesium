/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/hash",["./_base/kernel","require","./_base/config","./aspect","./_base/lang","./topic","./domReady","./sniff"],function(_1,_2,_3,_4,_5,_6,_7,_8){
_1.hash=function(_9,_a){
if(!arguments.length){
return _b();
}
if(_9.charAt(0)=="#"){
_9=_9.substring(1);
}
if(_a){
_c(_9);
}else{
location.href="#"+_9;
}
return _9;
};
var _d,_e,_f,_10=_3.hashPollFrequency||100;
function _11(str,_12){
var i=str.indexOf(_12);
return (i>=0)?str.substring(i+1):"";
};
function _b(){
return _11(location.href,"#");
};
function _13(){
_6.publish("/dojo/hashchange",_b());
};
function _14(){
if(_b()===_d){
return;
}
_d=_b();
_13();
};
function _c(_15){
if(_e){
if(_e.isTransitioning()){
setTimeout(_5.hitch(null,_c,_15),_10);
return;
}
var _16=_e.iframe.location.href;
var _17=_16.indexOf("?");
_e.iframe.location.replace(_16.substring(0,_17)+"?"+_15);
return;
}
location.replace("#"+_15);
!_f&&_14();
};
function _18(){
var ifr=document.createElement("iframe"),_19="dojo-hash-iframe",_1a=_3.dojoBlankHtmlUrl||_2.toUrl("./resources/blank.html");
if(_3.useXDomain&&!_3.dojoBlankHtmlUrl){
console.warn("dojo.hash: When using cross-domain Dojo builds,"+" please save dojo/resources/blank.html to your domain and set djConfig.dojoBlankHtmlUrl"+" to the path on your domain to blank.html");
}
ifr.id=_19;
ifr.src=_1a+"?"+_b();
ifr.style.display="none";
document.body.appendChild(ifr);
this.iframe=_1.global[_19];
var _1b,_1c,_1d,_1e,_1f,_20=this.iframe.location;
function _21(){
_d=_b();
_1b=_1f?_d:_11(_20.href,"?");
_1c=false;
_1d=null;
};
this.isTransitioning=function(){
return _1c;
};
this.pollLocation=function(){
if(!_1f){
try{
var _22=_11(_20.href,"?");
if(document.title!=_1e){
_1e=this.iframe.document.title=document.title;
}
}
catch(e){
_1f=true;
console.error("dojo.hash: Error adding history entry. Server unreachable.");
}
}
var _23=_b();
if(_1c&&_d===_23){
if(_1f||_22===_1d){
_21();
_13();
}else{
setTimeout(_5.hitch(this,this.pollLocation),0);
return;
}
}else{
if(_d===_23&&(_1f||_1b===_22)){
}else{
if(_d!==_23){
_d=_23;
_1c=true;
_1d=_23;
ifr.src=_1a+"?"+_1d;
_1f=false;
setTimeout(_5.hitch(this,this.pollLocation),0);
return;
}else{
if(!_1f){
location.href="#"+_20.search.substring(1);
_21();
_13();
}
}
}
}
setTimeout(_5.hitch(this,this.pollLocation),_10);
};
_21();
setTimeout(_5.hitch(this,this.pollLocation),_10);
};
_7(function(){
if("onhashchange" in _1.global&&(!_8("ie")||(_8("ie")>=8&&document.compatMode!="BackCompat"))){
_f=_4.after(_1.global,"onhashchange",_13,true);
}else{
if(document.addEventListener){
_d=_b();
setInterval(_14,_10);
}else{
if(document.attachEvent){
_e=new _18();
}
}
}
});
return _1.hash;
});
