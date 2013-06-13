/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-style",["./sniff","./dom"],function(_1,_2){
var _3,_4={};
if(_1("webkit")){
_3=function(_5){
var s;
if(_5.nodeType==1){
var dv=_5.ownerDocument.defaultView;
s=dv.getComputedStyle(_5,null);
if(!s&&_5.style){
_5.style.display="";
s=dv.getComputedStyle(_5,null);
}
}
return s||{};
};
}else{
if(_1("ie")&&(_1("ie")<9||_1("quirks"))){
_3=function(_6){
return _6.nodeType==1&&_6.currentStyle?_6.currentStyle:{};
};
}else{
_3=function(_7){
return _7.nodeType==1?_7.ownerDocument.defaultView.getComputedStyle(_7,null):{};
};
}
}
_4.getComputedStyle=_3;
var _8;
if(!_1("ie")){
_8=function(_9,_a){
return parseFloat(_a)||0;
};
}else{
_8=function(_b,_c){
if(!_c){
return 0;
}
if(_c=="medium"){
return 4;
}
if(_c.slice&&_c.slice(-2)=="px"){
return parseFloat(_c);
}
var s=_b.style,rs=_b.runtimeStyle,cs=_b.currentStyle,_d=s.left,_e=rs.left;
rs.left=cs.left;
try{
s.left=_c;
_c=s.pixelLeft;
}
catch(e){
_c=0;
}
s.left=_d;
rs.left=_e;
return _c;
};
}
_4.toPixelValue=_8;
var _f="DXImageTransform.Microsoft.Alpha";
var af=function(n,f){
try{
return n.filters.item(_f);
}
catch(e){
return f?{}:null;
}
};
var _10=_1("ie")<9||(_1("ie")<10&&_1("quirks"))?function(_11){
try{
return af(_11).Opacity/100;
}
catch(e){
return 1;
}
}:function(_12){
return _3(_12).opacity;
};
var _13=_1("ie")<9||(_1("ie")<10&&_1("quirks"))?function(_14,_15){
if(_15===""){
_15=1;
}
var ov=_15*100,_16=_15===1;
if(_16){
_14.style.zoom="";
if(af(_14)){
_14.style.filter=_14.style.filter.replace(new RegExp("\\s*progid:"+_f+"\\([^\\)]+?\\)","i"),"");
}
}else{
_14.style.zoom=1;
if(af(_14)){
af(_14,1).Opacity=ov;
}else{
_14.style.filter+=" progid:"+_f+"(Opacity="+ov+")";
}
af(_14,1).Enabled=true;
}
if(_14.tagName.toLowerCase()=="tr"){
for(var td=_14.firstChild;td;td=td.nextSibling){
if(td.tagName.toLowerCase()=="td"){
_13(td,_15);
}
}
}
return _15;
}:function(_17,_18){
return _17.style.opacity=_18;
};
var _19={left:true,top:true};
var _1a=/margin|padding|width|height|max|min|offset/;
function _1b(_1c,_1d,_1e){
_1d=_1d.toLowerCase();
if(_1("ie")){
if(_1e=="auto"){
if(_1d=="height"){
return _1c.offsetHeight;
}
if(_1d=="width"){
return _1c.offsetWidth;
}
}
if(_1d=="fontweight"){
switch(_1e){
case 700:
return "bold";
case 400:
default:
return "normal";
}
}
}
if(!(_1d in _19)){
_19[_1d]=_1a.test(_1d);
}
return _19[_1d]?_8(_1c,_1e):_1e;
};
var _1f={cssFloat:1,styleFloat:1,"float":1};
_4.get=function getStyle(_20,_21){
var n=_2.byId(_20),l=arguments.length,op=(_21=="opacity");
if(l==2&&op){
return _10(n);
}
_21=_1f[_21]?"cssFloat" in n.style?"cssFloat":"styleFloat":_21;
var s=_4.getComputedStyle(n);
return (l==1)?s:_1b(n,_21,s[_21]||n.style[_21]);
};
_4.set=function setStyle(_22,_23,_24){
var n=_2.byId(_22),l=arguments.length,op=(_23=="opacity");
_23=_1f[_23]?"cssFloat" in n.style?"cssFloat":"styleFloat":_23;
if(l==3){
return op?_13(n,_24):n.style[_23]=_24;
}
for(var x in _23){
_4.set(_22,x,_23[x]);
}
return _4.getComputedStyle(n);
};
return _4;
});
