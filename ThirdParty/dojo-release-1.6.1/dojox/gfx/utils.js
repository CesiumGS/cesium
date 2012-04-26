/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.utils"]){
dojo._hasResource["dojox.gfx.utils"]=true;
dojo.provide("dojox.gfx.utils");
dojo.require("dojox.gfx");
(function(){
var d=dojo,g=dojox.gfx,gu=g.utils;
dojo.mixin(gu,{forEach:function(_1,f,o){
o=o||d.global;
f.call(o,_1);
if(_1 instanceof g.Surface||_1 instanceof g.Group){
d.forEach(_1.children,function(_2){
gu.forEach(_2,f,o);
});
}
},serialize:function(_3){
var t={},v,_4=_3 instanceof g.Surface;
if(_4||_3 instanceof g.Group){
t.children=d.map(_3.children,gu.serialize);
if(_4){
return t.children;
}
}else{
t.shape=_3.getShape();
}
if(_3.getTransform){
v=_3.getTransform();
if(v){
t.transform=v;
}
}
if(_3.getStroke){
v=_3.getStroke();
if(v){
t.stroke=v;
}
}
if(_3.getFill){
v=_3.getFill();
if(v){
t.fill=v;
}
}
if(_3.getFont){
v=_3.getFont();
if(v){
t.font=v;
}
}
return t;
},toJson:function(_5,_6){
return d.toJson(gu.serialize(_5),_6);
},deserialize:function(_7,_8){
if(_8 instanceof Array){
return d.map(_8,d.hitch(null,gu.deserialize,_7));
}
var _9=("shape" in _8)?_7.createShape(_8.shape):_7.createGroup();
if("transform" in _8){
_9.setTransform(_8.transform);
}
if("stroke" in _8){
_9.setStroke(_8.stroke);
}
if("fill" in _8){
_9.setFill(_8.fill);
}
if("font" in _8){
_9.setFont(_8.font);
}
if("children" in _8){
d.forEach(_8.children,d.hitch(null,gu.deserialize,_9));
}
return _9;
},fromJson:function(_a,_b){
return gu.deserialize(_a,d.fromJson(_b));
},toSvg:function(_c){
var _d=new dojo.Deferred();
if(dojox.gfx.renderer==="svg"){
try{
var _e=gu._cleanSvg(gu._innerXML(_c.rawNode));
_d.callback(_e);
}
catch(e){
_d.errback(e);
}
}else{
if(!gu._initSvgSerializerDeferred){
gu._initSvgSerializer();
}
var _f=dojox.gfx.utils.toJson(_c);
var _10=function(){
try{
var _11=_c.getDimensions();
var _12=_11.width;
var _13=_11.height;
var _14=gu._gfxSvgProxy.document.createElement("div");
gu._gfxSvgProxy.document.body.appendChild(_14);
dojo.withDoc(gu._gfxSvgProxy.document,function(){
dojo.style(_14,"width",_12);
dojo.style(_14,"height",_13);
},this);
var ts=gu._gfxSvgProxy[dojox._scopeName].gfx.createSurface(_14,_12,_13);
var _15=function(_16){
try{
gu._gfxSvgProxy[dojox._scopeName].gfx.utils.fromJson(_16,_f);
var svg=gu._cleanSvg(_14.innerHTML);
_16.clear();
_16.destroy();
gu._gfxSvgProxy.document.body.removeChild(_14);
_d.callback(svg);
}
catch(e){
_d.errback(e);
}
};
ts.whenLoaded(null,_15);
}
catch(ex){
_d.errback(ex);
}
};
if(gu._initSvgSerializerDeferred.fired>0){
_10();
}else{
gu._initSvgSerializerDeferred.addCallback(_10);
}
}
return _d;
},_gfxSvgProxy:null,_initSvgSerializerDeferred:null,_svgSerializerInitialized:function(){
gu._initSvgSerializerDeferred.callback(true);
},_initSvgSerializer:function(){
if(!gu._initSvgSerializerDeferred){
gu._initSvgSerializerDeferred=new dojo.Deferred();
var f=dojo.doc.createElement("iframe");
dojo.style(f,{display:"none",position:"absolute",width:"1em",height:"1em",top:"-10000px"});
var _17;
if(dojo.isIE){
f.onreadystatechange=function(){
if(f.contentWindow.document.readyState=="complete"){
f.onreadystatechange=function(){
};
_17=setInterval(function(){
if(f.contentWindow[dojo._scopeName]&&f.contentWindow[dojox._scopeName].gfx&&f.contentWindow[dojox._scopeName].gfx.utils){
clearInterval(_17);
f.contentWindow.parent[dojox._scopeName].gfx.utils._gfxSvgProxy=f.contentWindow;
f.contentWindow.parent[dojox._scopeName].gfx.utils._svgSerializerInitialized();
}
},50);
}
};
}else{
f.onload=function(){
f.onload=function(){
};
_17=setInterval(function(){
if(f.contentWindow[dojo._scopeName]&&f.contentWindow[dojox._scopeName].gfx&&f.contentWindow[dojox._scopeName].gfx.utils){
clearInterval(_17);
f.contentWindow.parent[dojox._scopeName].gfx.utils._gfxSvgProxy=f.contentWindow;
f.contentWindow.parent[dojox._scopeName].gfx.utils._svgSerializerInitialized();
}
},50);
};
}
var uri=(dojo.config["dojoxGfxSvgProxyFrameUrl"]||dojo.moduleUrl("dojox","gfx/resources/gfxSvgProxyFrame.html"));
f.setAttribute("src",uri);
dojo.body().appendChild(f);
}
},_innerXML:function(_18){
if(_18.innerXML){
return _18.innerXML;
}else{
if(_18.xml){
return _18.xml;
}else{
if(typeof XMLSerializer!="undefined"){
return (new XMLSerializer()).serializeToString(_18);
}
}
}
return null;
},_cleanSvg:function(svg){
if(svg){
if(svg.indexOf("xmlns=\"http://www.w3.org/2000/svg\"")==-1){
svg=svg.substring(4,svg.length);
svg="<svg xmlns=\"http://www.w3.org/2000/svg\""+svg;
}
svg=svg.replace(/\bdojoGfx\w*\s*=\s*(['"])\w*\1/g,"");
}
return svg;
}});
})();
}
