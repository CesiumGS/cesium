/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.html.ellipsis"]){
dojo._hasResource["dojox.html.ellipsis"]=true;
dojo.provide("dojox.html.ellipsis");
(function(d){
if(d.isMoz){
var _1=1;
if("dojoxFFEllipsisDelay" in d.config){
_1=Number(d.config.dojoxFFEllipsisDelay);
if(isNaN(_1)){
_1=1;
}
}
try{
var _2=(function(){
var _3="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
var _4=document.createElementNS(_3,"window");
var _5=document.createElementNS(_3,"description");
_5.setAttribute("crop","end");
_4.appendChild(_5);
return function(n){
var x=_4.cloneNode(true);
x.firstChild.setAttribute("value",n.textContent);
n.innerHTML="";
n.appendChild(x);
};
})();
}
catch(e){
}
var _6=d.create;
var dd=d.doc;
var dp=d.place;
var _7=_6("iframe",{className:"dojoxEllipsisIFrame",src:"javascript:'<html><head><script>if(\"loadFirebugConsole\" in window){window.loadFirebugConsole();}</script></head><body></body></html>'"});
var _8=function(r,_9){
if(r.collapsed){
return;
}
if(_9>0){
do{
_8(r);
_9--;
}while(_9);
return;
}
if(r.endContainer.nodeType==3&&r.endOffset>0){
r.setEnd(r.endContainer,r.endOffset-1);
}else{
if(r.endContainer.nodeType==3){
r.setEndBefore(r.endContainer);
_8(r);
return;
}else{
if(r.endOffset&&r.endContainer.childNodes.length>=r.endOffset){
var _a=r.endContainer.childNodes[r.endOffset-1];
if(_a.nodeType==3){
r.setEnd(_a,_a.length-1);
}else{
if(_a.childNodes.length){
r.setEnd(_a,_a.childNodes.length);
_8(r);
return;
}else{
r.setEndBefore(_a);
_8(r);
return;
}
}
}else{
r.setEndBefore(r.endContainer);
_8(r);
return;
}
}
}
};
var _b=function(n){
var c=_6("div",{className:"dojoxEllipsisContainer"});
var e=_6("div",{className:"dojoxEllipsisShown",style:{display:"none"}});
n.parentNode.replaceChild(c,n);
c.appendChild(n);
c.appendChild(e);
var i=_7.cloneNode(true);
var ns=n.style;
var es=e.style;
var _c;
var _d=function(){
ns.display="";
es.display="none";
if(n.scrollWidth<=n.offsetWidth){
return;
}
var r=dd.createRange();
r.selectNodeContents(n);
ns.display="none";
es.display="";
var _e=false;
do{
var _f=1;
dp(r.cloneContents(),e,"only");
var sw=e.scrollWidth,ow=e.offsetWidth;
_e=(sw<=ow);
var pct=(1-((ow*1)/sw));
if(pct>0){
_f=Math.max(Math.round(e.textContent.length*pct)-1,1);
}
_8(r,_f);
}while(!r.collapsed&&!_e);
};
i.onload=function(){
i.contentWindow.onresize=_d;
_d();
};
c.appendChild(i);
};
var hc=d.hasClass;
var doc=d.doc;
var s,fn,opt;
if(doc.querySelectorAll){
s=doc;
fn="querySelectorAll";
opt=".dojoxEllipsis";
}else{
if(doc.getElementsByClassName){
s=doc;
fn="getElementsByClassName";
opt="dojoxEllipsis";
}else{
s=d;
fn="query";
opt=".dojoxEllipsis";
}
}
fx=function(){
d.forEach(s[fn].apply(s,[opt]),function(n){
if(!n||n._djx_ellipsis_done){
return;
}
n._djx_ellipsis_done=true;
if(_2&&n.textContent==n.innerHTML&&!hc(n,"dojoxEllipsisSelectable")){
_2(n);
}else{
_b(n);
}
});
};
d.addOnLoad(function(){
var t=null;
var c=null;
var _10=function(){
if(c){
d.disconnect(c);
c=null;
}
if(t){
clearTimeout(t);
}
t=setTimeout(function(){
t=null;
fx();
c=d.connect(d.body(),"DOMSubtreeModified",_10);
},_1);
};
_10();
});
}
})(dojo);
}
