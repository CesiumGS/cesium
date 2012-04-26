/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.axis2d.common"]){
dojo._hasResource["dojox.charting.axis2d.common"]=true;
dojo.provide("dojox.charting.axis2d.common");
dojo.require("dojox.gfx");
(function(){
var g=dojox.gfx;
var _1=function(s){
s.marginLeft="0px";
s.marginTop="0px";
s.marginRight="0px";
s.marginBottom="0px";
s.paddingLeft="0px";
s.paddingTop="0px";
s.paddingRight="0px";
s.paddingBottom="0px";
s.borderLeftWidth="0px";
s.borderTopWidth="0px";
s.borderRightWidth="0px";
s.borderBottomWidth="0px";
};
var _2=function(n){
if(n["getBoundingClientRect"]){
var _3=n.getBoundingClientRect();
return _3.width||(_3.right-_3.left);
}else{
return dojo.marginBox(n).w;
}
};
dojo.mixin(dojox.charting.axis2d.common,{createText:{gfx:function(_4,_5,x,y,_6,_7,_8,_9){
return _5.createText({x:x,y:y,text:_7,align:_6}).setFont(_8).setFill(_9);
},html:function(_a,_b,x,y,_c,_d,_e,_f,_10){
var p=dojo.doc.createElement("div"),s=p.style,_11;
_1(s);
s.font=_e;
p.innerHTML=String(_d).replace(/\s/g,"&nbsp;");
s.color=_f;
s.position="absolute";
s.left="-10000px";
dojo.body().appendChild(p);
var _12=g.normalizedLength(g.splitFontString(_e).size);
if(!_10){
_11=_2(p);
}
dojo.body().removeChild(p);
s.position="relative";
if(_10){
s.width=_10+"px";
switch(_c){
case "middle":
s.textAlign="center";
s.left=(x-_10/2)+"px";
break;
case "end":
s.textAlign="right";
s.left=(x-_10)+"px";
break;
default:
s.left=x+"px";
s.textAlign="left";
break;
}
}else{
switch(_c){
case "middle":
s.left=Math.floor(x-_11/2)+"px";
break;
case "end":
s.left=Math.floor(x-_11)+"px";
break;
default:
s.left=Math.floor(x)+"px";
break;
}
}
s.top=Math.floor(y-_12)+"px";
s.whiteSpace="nowrap";
var _13=dojo.doc.createElement("div"),w=_13.style;
_1(w);
w.width="0px";
w.height="0px";
_13.appendChild(p);
_a.node.insertBefore(_13,_a.node.firstChild);
return _13;
}}});
})();
}
