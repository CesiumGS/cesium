/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.hash"]){
dojo._hasResource["dojo.hash"]=true;
dojo.provide("dojo.hash");
(function(){
dojo.hash=function(_1,_2){
if(!arguments.length){
return _3();
}
if(_1.charAt(0)=="#"){
_1=_1.substring(1);
}
if(_2){
_4(_1);
}else{
location.href="#"+_1;
}
return _1;
};
var _5,_6,_7,_8=dojo.config.hashPollFrequency||100;
function _9(_a,_b){
var i=_a.indexOf(_b);
return (i>=0)?_a.substring(i+1):"";
};
function _3(){
return _9(location.href,"#");
};
function _c(){
dojo.publish("/dojo/hashchange",[_3()]);
};
function _d(){
if(_3()===_5){
return;
}
_5=_3();
_c();
};
function _4(_e){
if(_6){
if(_6.isTransitioning()){
setTimeout(dojo.hitch(null,_4,_e),_8);
return;
}
var _f=_6.iframe.location.href;
var _10=_f.indexOf("?");
_6.iframe.location.replace(_f.substring(0,_10)+"?"+_e);
return;
}
location.replace("#"+_e);
!_7&&_d();
};
function _11(){
var ifr=document.createElement("iframe"),_12="dojo-hash-iframe",_13=dojo.config.dojoBlankHtmlUrl||dojo.moduleUrl("dojo","resources/blank.html");
if(dojo.config.useXDomain&&!dojo.config.dojoBlankHtmlUrl){
console.warn("dojo.hash: When using cross-domain Dojo builds,"+" please save dojo/resources/blank.html to your domain and set djConfig.dojoBlankHtmlUrl"+" to the path on your domain to blank.html");
}
ifr.id=_12;
ifr.src=_13+"?"+_3();
ifr.style.display="none";
document.body.appendChild(ifr);
this.iframe=dojo.global[_12];
var _14,_15,_16,_17,_18,_19=this.iframe.location;
function _1a(){
_5=_3();
_14=_18?_5:_9(_19.href,"?");
_15=false;
_16=null;
};
this.isTransitioning=function(){
return _15;
};
this.pollLocation=function(){
if(!_18){
try{
var _1b=_9(_19.href,"?");
if(document.title!=_17){
_17=this.iframe.document.title=document.title;
}
}
catch(e){
_18=true;
console.error("dojo.hash: Error adding history entry. Server unreachable.");
}
}
var _1c=_3();
if(_15&&_5===_1c){
if(_18||_1b===_16){
_1a();
_c();
}else{
setTimeout(dojo.hitch(this,this.pollLocation),0);
return;
}
}else{
if(_5===_1c&&(_18||_14===_1b)){
}else{
if(_5!==_1c){
_5=_1c;
_15=true;
_16=_1c;
ifr.src=_13+"?"+_16;
_18=false;
setTimeout(dojo.hitch(this,this.pollLocation),0);
return;
}else{
if(!_18){
location.href="#"+_19.search.substring(1);
_1a();
_c();
}
}
}
}
setTimeout(dojo.hitch(this,this.pollLocation),_8);
};
_1a();
setTimeout(dojo.hitch(this,this.pollLocation),_8);
};
dojo.addOnLoad(function(){
if("onhashchange" in dojo.global&&(!dojo.isIE||(dojo.isIE>=8&&document.compatMode!="BackCompat"))){
_7=dojo.connect(dojo.global,"onhashchange",_c);
}else{
if(document.addEventListener){
_5=_3();
setInterval(_d,_8);
}else{
if(document.attachEvent){
_6=new _11();
}
}
}
});
})();
}
