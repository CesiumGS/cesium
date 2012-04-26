/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx._base"]){
dojo._hasResource["dojox.fx._base"]=true;
dojo.provide("dojox.fx._base");
dojo.require("dojo.fx");
dojo.mixin(dojox.fx,{anim:dojo.anim,animateProperty:dojo.animateProperty,fadeTo:dojo._fade,fadeIn:dojo.fadeIn,fadeOut:dojo.fadeOut,combine:dojo.fx.combine,chain:dojo.fx.chain,slideTo:dojo.fx.slideTo,wipeIn:dojo.fx.wipeIn,wipeOut:dojo.fx.wipeOut});
dojox.fx.sizeTo=function(_1){
var _2=_1.node=dojo.byId(_1.node),_3="absolute";
var _4=_1.method||"chain";
if(!_1.duration){
_1.duration=500;
}
if(_4=="chain"){
_1.duration=Math.floor(_1.duration/2);
}
var _5,_6,_7,_8,_9,_a=null;
var _b=(function(n){
return function(){
var cs=dojo.getComputedStyle(n),_c=cs.position,w=cs.width,h=cs.height;
_5=(_c==_3?n.offsetTop:parseInt(cs.top)||0);
_7=(_c==_3?n.offsetLeft:parseInt(cs.left)||0);
_9=(w=="auto"?0:parseInt(w));
_a=(h=="auto"?0:parseInt(h));
_8=_7-Math.floor((_1.width-_9)/2);
_6=_5-Math.floor((_1.height-_a)/2);
if(_c!=_3&&_c!="relative"){
var _d=dojo.coords(n,true);
_5=_d.y;
_7=_d.x;
n.style.position=_3;
n.style.top=_5+"px";
n.style.left=_7+"px";
}
};
})(_2);
var _e=dojo.animateProperty(dojo.mixin({properties:{height:function(){
_b();
return {end:_1.height||0,start:_a};
},top:function(){
return {start:_5,end:_6};
}}},_1));
var _f=dojo.animateProperty(dojo.mixin({properties:{width:function(){
return {start:_9,end:_1.width||0};
},left:function(){
return {start:_7,end:_8};
}}},_1));
var _10=dojo.fx[(_1.method=="combine"?"combine":"chain")]([_e,_f]);
return _10;
};
dojox.fx.slideBy=function(_11){
var _12=_11.node=dojo.byId(_11.node),top,_13;
var _14=(function(n){
return function(){
var cs=dojo.getComputedStyle(n);
var pos=cs.position;
top=(pos=="absolute"?n.offsetTop:parseInt(cs.top)||0);
_13=(pos=="absolute"?n.offsetLeft:parseInt(cs.left)||0);
if(pos!="absolute"&&pos!="relative"){
var ret=dojo.coords(n,true);
top=ret.y;
_13=ret.x;
n.style.position="absolute";
n.style.top=top+"px";
n.style.left=_13+"px";
}
};
})(_12);
_14();
var _15=dojo.animateProperty(dojo.mixin({properties:{top:top+(_11.top||0),left:_13+(_11.left||0)}},_11));
dojo.connect(_15,"beforeBegin",_15,_14);
return _15;
};
dojox.fx.crossFade=function(_16){
var _17=_16.nodes[0]=dojo.byId(_16.nodes[0]),op1=dojo.style(_17,"opacity"),_18=_16.nodes[1]=dojo.byId(_16.nodes[1]),op2=dojo.style(_18,"opacity");
var _19=dojo.fx.combine([dojo[(op1==0?"fadeIn":"fadeOut")](dojo.mixin({node:_17},_16)),dojo[(op1==0?"fadeOut":"fadeIn")](dojo.mixin({node:_18},_16))]);
return _19;
};
dojox.fx.highlight=function(_1a){
var _1b=_1a.node=dojo.byId(_1a.node);
_1a.duration=_1a.duration||400;
var _1c=_1a.color||"#ffff99",_1d=dojo.style(_1b,"backgroundColor");
if(_1d=="rgba(0, 0, 0, 0)"){
_1d="transparent";
}
var _1e=dojo.animateProperty(dojo.mixin({properties:{backgroundColor:{start:_1c,end:_1d}}},_1a));
if(_1d=="transparent"){
dojo.connect(_1e,"onEnd",_1e,function(){
_1b.style.backgroundColor=_1d;
});
}
return _1e;
};
dojox.fx.wipeTo=function(_1f){
_1f.node=dojo.byId(_1f.node);
var _20=_1f.node,s=_20.style;
var dir=(_1f.width?"width":"height"),_21=_1f[dir],_22={};
_22[dir]={start:function(){
s.overflow="hidden";
if(s.visibility=="hidden"||s.display=="none"){
s[dir]="1px";
s.display="";
s.visibility="";
return 1;
}else{
var now=dojo.style(_20,dir);
return Math.max(now,1);
}
},end:_21};
var _23=dojo.animateProperty(dojo.mixin({properties:_22},_1f));
return _23;
};
}
