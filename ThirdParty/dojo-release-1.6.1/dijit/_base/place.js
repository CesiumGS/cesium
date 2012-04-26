/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._base.place"]){
dojo._hasResource["dijit._base.place"]=true;
dojo.provide("dijit._base.place");
dojo.require("dojo.window");
dojo.require("dojo.AdapterRegistry");
dijit.getViewport=function(){
return dojo.window.getBox();
};
dijit.placeOnScreen=function(_1,_2,_3,_4){
var _5=dojo.map(_3,function(_6){
var c={corner:_6,pos:{x:_2.x,y:_2.y}};
if(_4){
c.pos.x+=_6.charAt(1)=="L"?_4.x:-_4.x;
c.pos.y+=_6.charAt(0)=="T"?_4.y:-_4.y;
}
return c;
});
return dijit._place(_1,_5);
};
dijit._place=function(_7,_8,_9,_a){
var _b=dojo.window.getBox();
if(!_7.parentNode||String(_7.parentNode.tagName).toLowerCase()!="body"){
dojo.body().appendChild(_7);
}
var _c=null;
dojo.some(_8,function(_d){
var _e=_d.corner;
var _f=_d.pos;
var _10=0;
var _11={w:_e.charAt(1)=="L"?(_b.l+_b.w)-_f.x:_f.x-_b.l,h:_e.charAt(1)=="T"?(_b.t+_b.h)-_f.y:_f.y-_b.t};
if(_9){
var res=_9(_7,_d.aroundCorner,_e,_11,_a);
_10=typeof res=="undefined"?0:res;
}
var _12=_7.style;
var _13=_12.display;
var _14=_12.visibility;
_12.visibility="hidden";
_12.display="";
var mb=dojo.marginBox(_7);
_12.display=_13;
_12.visibility=_14;
var _15=Math.max(_b.l,_e.charAt(1)=="L"?_f.x:(_f.x-mb.w)),_16=Math.max(_b.t,_e.charAt(0)=="T"?_f.y:(_f.y-mb.h)),_17=Math.min(_b.l+_b.w,_e.charAt(1)=="L"?(_15+mb.w):_f.x),_18=Math.min(_b.t+_b.h,_e.charAt(0)=="T"?(_16+mb.h):_f.y),_19=_17-_15,_1a=_18-_16;
_10+=(mb.w-_19)+(mb.h-_1a);
if(_c==null||_10<_c.overflow){
_c={corner:_e,aroundCorner:_d.aroundCorner,x:_15,y:_16,w:_19,h:_1a,overflow:_10,spaceAvailable:_11};
}
return !_10;
});
if(_c.overflow&&_9){
_9(_7,_c.aroundCorner,_c.corner,_c.spaceAvailable,_a);
}
var l=dojo._isBodyLtr(),s=_7.style;
s.top=_c.y+"px";
s[l?"left":"right"]=(l?_c.x:_b.w-_c.x-_c.w)+"px";
return _c;
};
dijit.placeOnScreenAroundNode=function(_1b,_1c,_1d,_1e){
_1c=dojo.byId(_1c);
var _1f=dojo.position(_1c,true);
return dijit._placeOnScreenAroundRect(_1b,_1f.x,_1f.y,_1f.w,_1f.h,_1d,_1e);
};
dijit.placeOnScreenAroundRectangle=function(_20,_21,_22,_23){
return dijit._placeOnScreenAroundRect(_20,_21.x,_21.y,_21.width,_21.height,_22,_23);
};
dijit._placeOnScreenAroundRect=function(_24,x,y,_25,_26,_27,_28){
var _29=[];
for(var _2a in _27){
_29.push({aroundCorner:_2a,corner:_27[_2a],pos:{x:x+(_2a.charAt(1)=="L"?0:_25),y:y+(_2a.charAt(0)=="T"?0:_26)}});
}
return dijit._place(_24,_29,_28,{w:_25,h:_26});
};
dijit.placementRegistry=new dojo.AdapterRegistry();
dijit.placementRegistry.register("node",function(n,x){
return typeof x=="object"&&typeof x.offsetWidth!="undefined"&&typeof x.offsetHeight!="undefined";
},dijit.placeOnScreenAroundNode);
dijit.placementRegistry.register("rect",function(n,x){
return typeof x=="object"&&"x" in x&&"y" in x&&"width" in x&&"height" in x;
},dijit.placeOnScreenAroundRectangle);
dijit.placeOnScreenAroundElement=function(_2b,_2c,_2d,_2e){
return dijit.placementRegistry.match.apply(dijit.placementRegistry,arguments);
};
dijit.getPopupAroundAlignment=function(_2f,_30){
var _31={};
dojo.forEach(_2f,function(pos){
switch(pos){
case "after":
_31[_30?"BR":"BL"]=_30?"BL":"BR";
break;
case "before":
_31[_30?"BL":"BR"]=_30?"BR":"BL";
break;
case "below-alt":
_30=!_30;
case "below":
_31[_30?"BL":"BR"]=_30?"TL":"TR";
_31[_30?"BR":"BL"]=_30?"TR":"TL";
break;
case "above-alt":
_30=!_30;
case "above":
default:
_31[_30?"TL":"TR"]=_30?"BL":"BR";
_31[_30?"TR":"TL"]=_30?"BR":"BL";
break;
}
});
return _31;
};
}
