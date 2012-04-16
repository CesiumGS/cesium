/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx._base"]){
dojo._hasResource["dojox.gfx._base"]=true;
dojo.provide("dojox.gfx._base");
(function(){
var g=dojox.gfx,b=g._base;
g._hasClass=function(_1,_2){
var _3=_1.getAttribute("className");
return _3&&(" "+_3+" ").indexOf(" "+_2+" ")>=0;
};
g._addClass=function(_4,_5){
var _6=_4.getAttribute("className")||"";
if(!_6||(" "+_6+" ").indexOf(" "+_5+" ")<0){
_4.setAttribute("className",_6+(_6?" ":"")+_5);
}
};
g._removeClass=function(_7,_8){
var _9=_7.getAttribute("className");
if(_9){
_7.setAttribute("className",_9.replace(new RegExp("(^|\\s+)"+_8+"(\\s+|$)"),"$1$2"));
}
};
b._getFontMeasurements=function(){
var _a={"1em":0,"1ex":0,"100%":0,"12pt":0,"16px":0,"xx-small":0,"x-small":0,"small":0,"medium":0,"large":0,"x-large":0,"xx-large":0};
if(dojo.isIE){
dojo.doc.documentElement.style.fontSize="100%";
}
var _b=dojo.create("div",{style:{position:"absolute",left:"0",top:"-100px",width:"30px",height:"1000em",borderWidth:"0",margin:"0",padding:"0",outline:"none",lineHeight:"1",overflow:"hidden"}},dojo.body());
for(var p in _a){
_b.style.fontSize=p;
_a[p]=Math.round(_b.offsetHeight*12/16)*16/12/1000;
}
dojo.body().removeChild(_b);
return _a;
};
var _c=null;
b._getCachedFontMeasurements=function(_d){
if(_d||!_c){
_c=b._getFontMeasurements();
}
return _c;
};
var _e=null,_f={};
b._getTextBox=function(_10,_11,_12){
var m,s,al=arguments.length;
if(!_e){
_e=dojo.create("div",{style:{position:"absolute",top:"-10000px",left:"0"}},dojo.body());
}
m=_e;
m.className="";
s=m.style;
s.borderWidth="0";
s.margin="0";
s.padding="0";
s.outline="0";
if(al>1&&_11){
for(var i in _11){
if(i in _f){
continue;
}
s[i]=_11[i];
}
}
if(al>2&&_12){
m.className=_12;
}
m.innerHTML=_10;
if(m["getBoundingClientRect"]){
var bcr=m.getBoundingClientRect();
return {l:bcr.left,t:bcr.top,w:bcr.width||(bcr.right-bcr.left),h:bcr.height||(bcr.bottom-bcr.top)};
}else{
return dojo.marginBox(m);
}
};
var _13=0;
b._getUniqueId=function(){
var id;
do{
id=dojo._scopeName+"Unique"+(++_13);
}while(dojo.byId(id));
return id;
};
})();
dojo.mixin(dojox.gfx,{defaultPath:{type:"path",path:""},defaultPolyline:{type:"polyline",points:[]},defaultRect:{type:"rect",x:0,y:0,width:100,height:100,r:0},defaultEllipse:{type:"ellipse",cx:0,cy:0,rx:200,ry:100},defaultCircle:{type:"circle",cx:0,cy:0,r:100},defaultLine:{type:"line",x1:0,y1:0,x2:100,y2:100},defaultImage:{type:"image",x:0,y:0,width:0,height:0,src:""},defaultText:{type:"text",x:0,y:0,text:"",align:"start",decoration:"none",rotated:false,kerning:true},defaultTextPath:{type:"textpath",text:"",align:"start",decoration:"none",rotated:false,kerning:true},defaultStroke:{type:"stroke",color:"black",style:"solid",width:1,cap:"butt",join:4},defaultLinearGradient:{type:"linear",x1:0,y1:0,x2:100,y2:100,colors:[{offset:0,color:"black"},{offset:1,color:"white"}]},defaultRadialGradient:{type:"radial",cx:0,cy:0,r:100,colors:[{offset:0,color:"black"},{offset:1,color:"white"}]},defaultPattern:{type:"pattern",x:0,y:0,width:0,height:0,src:""},defaultFont:{type:"font",style:"normal",variant:"normal",weight:"normal",size:"10pt",family:"serif"},getDefault:(function(){
var _14={};
return function(_15){
var t=_14[_15];
if(t){
return new t();
}
t=_14[_15]=new Function;
t.prototype=dojox.gfx["default"+_15];
return new t();
};
})(),normalizeColor:function(_16){
return (_16 instanceof dojo.Color)?_16:new dojo.Color(_16);
},normalizeParameters:function(_17,_18){
if(_18){
var _19={};
for(var x in _17){
if(x in _18&&!(x in _19)){
_17[x]=_18[x];
}
}
}
return _17;
},makeParameters:function(_1a,_1b){
if(!_1b){
return dojo.delegate(_1a);
}
var _1c={};
for(var i in _1a){
if(!(i in _1c)){
_1c[i]=dojo.clone((i in _1b)?_1b[i]:_1a[i]);
}
}
return _1c;
},formatNumber:function(x,_1d){
var val=x.toString();
if(val.indexOf("e")>=0){
val=x.toFixed(4);
}else{
var _1e=val.indexOf(".");
if(_1e>=0&&val.length-_1e>5){
val=x.toFixed(4);
}
}
if(x<0){
return val;
}
return _1d?" "+val:val;
},makeFontString:function(_1f){
return _1f.style+" "+_1f.variant+" "+_1f.weight+" "+_1f.size+" "+_1f.family;
},splitFontString:function(str){
var _20=dojox.gfx.getDefault("Font");
var t=str.split(/\s+/);
do{
if(t.length<5){
break;
}
_20.style=t[0];
_20.variant=t[1];
_20.weight=t[2];
var i=t[3].indexOf("/");
_20.size=i<0?t[3]:t[3].substring(0,i);
var j=4;
if(i<0){
if(t[4]=="/"){
j=6;
}else{
if(t[4].charAt(0)=="/"){
j=5;
}
}
}
if(j<t.length){
_20.family=t.slice(j).join(" ");
}
}while(false);
return _20;
},cm_in_pt:72/2.54,mm_in_pt:7.2/2.54,px_in_pt:function(){
return dojox.gfx._base._getCachedFontMeasurements()["12pt"]/12;
},pt2px:function(len){
return len*dojox.gfx.px_in_pt();
},px2pt:function(len){
return len/dojox.gfx.px_in_pt();
},normalizedLength:function(len){
if(len.length==0){
return 0;
}
if(len.length>2){
var _21=dojox.gfx.px_in_pt();
var val=parseFloat(len);
switch(len.slice(-2)){
case "px":
return val;
case "pt":
return val*_21;
case "in":
return val*72*_21;
case "pc":
return val*12*_21;
case "mm":
return val*dojox.gfx.mm_in_pt*_21;
case "cm":
return val*dojox.gfx.cm_in_pt*_21;
}
}
return parseFloat(len);
},pathVmlRegExp:/([A-Za-z]+)|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,pathSvgRegExp:/([A-Za-z])|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,equalSources:function(a,b){
return a&&b&&a==b;
},switchTo:function(_22){
var ns=dojox.gfx[_22];
if(ns){
dojo.forEach(["Group","Rect","Ellipse","Circle","Line","Polyline","Image","Text","Path","TextPath","Surface","createSurface"],function(_23){
dojox.gfx[_23]=ns[_23];
});
}
}});
}
