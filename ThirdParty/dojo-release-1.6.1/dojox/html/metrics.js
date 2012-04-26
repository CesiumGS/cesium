/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.html.metrics"]){
dojo._hasResource["dojox.html.metrics"]=true;
dojo.provide("dojox.html.metrics");
(function(){
var _1=dojox.html.metrics;
_1.getFontMeasurements=function(){
var _2={"1em":0,"1ex":0,"100%":0,"12pt":0,"16px":0,"xx-small":0,"x-small":0,"small":0,"medium":0,"large":0,"x-large":0,"xx-large":0};
if(dojo.isIE){
dojo.doc.documentElement.style.fontSize="100%";
}
var _3=dojo.doc.createElement("div");
var ds=_3.style;
ds.position="absolute";
ds.left="-100px";
ds.top="0";
ds.width="30px";
ds.height="1000em";
ds.borderWidth="0";
ds.margin="0";
ds.padding="0";
ds.outline="0";
ds.lineHeight="1";
ds.overflow="hidden";
dojo.body().appendChild(_3);
for(var p in _2){
ds.fontSize=p;
_2[p]=Math.round(_3.offsetHeight*12/16)*16/12/1000;
}
dojo.body().removeChild(_3);
_3=null;
return _2;
};
var _4=null;
_1.getCachedFontMeasurements=function(_5){
if(_5||!_4){
_4=_1.getFontMeasurements();
}
return _4;
};
var _6=null,_7={};
_1.getTextBox=function(_8,_9,_a){
var m,s;
if(!_6){
m=_6=dojo.doc.createElement("div");
var c=dojo.doc.createElement("div");
c.appendChild(m);
s=c.style;
s.overflow="scroll";
s.position="absolute";
s.left="0px";
s.top="-10000px";
s.width="1px";
s.height="1px";
s.visibility="hidden";
s.borderWidth="0";
s.margin="0";
s.padding="0";
s.outline="0";
dojo.body().appendChild(c);
}else{
m=_6;
}
m.className="";
s=m.style;
s.borderWidth="0";
s.margin="0";
s.padding="0";
s.outline="0";
if(arguments.length>1&&_9){
for(var i in _9){
if(i in _7){
continue;
}
s[i]=_9[i];
}
}
if(arguments.length>2&&_a){
m.className=_a;
}
m.innerHTML=_8;
var _b=dojo.position(m);
_b.w=m.parentNode.scrollWidth;
return _b;
};
var _c={w:16,h:16};
_1.getScrollbar=function(){
return {w:_c.w,h:_c.h};
};
_1._fontResizeNode=null;
_1.initOnFontResize=function(_d){
var f=_1._fontResizeNode=dojo.doc.createElement("iframe");
var fs=f.style;
fs.position="absolute";
fs.width="5em";
fs.height="10em";
fs.top="-10000px";
if(dojo.isIE){
f.onreadystatechange=function(){
if(f.contentWindow.document.readyState=="complete"){
f.onresize=f.contentWindow.parent[dojox._scopeName].html.metrics._fontresize;
}
};
}else{
f.onload=function(){
f.contentWindow.onresize=f.contentWindow.parent[dojox._scopeName].html.metrics._fontresize;
};
}
f.setAttribute("src","javascript:'<html><head><script>if(\"loadFirebugConsole\" in window){window.loadFirebugConsole();}</script></head><body></body></html>'");
dojo.body().appendChild(f);
_1.initOnFontResize=function(){
};
};
_1.onFontResize=function(){
};
_1._fontresize=function(){
_1.onFontResize();
};
dojo.addOnUnload(function(){
var f=_1._fontResizeNode;
if(f){
if(dojo.isIE&&f.onresize){
f.onresize=null;
}else{
if(f.contentWindow&&f.contentWindow.onresize){
f.contentWindow.onresize=null;
}
}
_1._fontResizeNode=null;
}
});
dojo.addOnLoad(function(){
try{
var n=dojo.doc.createElement("div");
n.style.cssText="top:0;left:0;width:100px;height:100px;overflow:scroll;position:absolute;visibility:hidden;";
dojo.body().appendChild(n);
_c.w=n.offsetWidth-n.clientWidth;
_c.h=n.offsetHeight-n.clientHeight;
dojo.body().removeChild(n);
delete n;
}
catch(e){
}
if("fontSizeWatch" in dojo.config&&!!dojo.config.fontSizeWatch){
_1.initOnFontResize();
}
});
})();
}
