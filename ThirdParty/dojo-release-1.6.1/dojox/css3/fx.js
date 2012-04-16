/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.css3.fx"]){
dojo._hasResource["dojox.css3.fx"]=true;
dojo.provide("dojox.css3.fx");
dojo.require("dojo.fx");
dojo.require("dojox.html.ext-dojo.style");
dojo.require("dojox.fx.ext-dojo.complex");
dojo.mixin(dojox.css3.fx,{puff:function(_1){
return dojo.fx.combine([dojo.fadeOut(_1),this.expand({node:_1.node,endScale:_1.endScale||2})]);
},expand:function(_2){
return dojo.animateProperty({node:_2.node,properties:{transform:{start:"scale(1)",end:"scale("+[_2.endScale||3]+")"}}});
},shrink:function(_3){
return this.expand({node:_3.node,endScale:0.01});
},rotate:function(_4){
return dojo.animateProperty({node:_4.node,duration:_4.duration||1000,properties:{transform:{start:"rotate("+(_4.startAngle||"0deg")+")",end:"rotate("+(_4.endAngle||"360deg")+")"}}});
},flip:function(_5){
var _6=[],_7=_5.whichAnims||[0,1,2,3],_8=_5.direction||1,_9=[{start:"scale(1, 1) skew(0deg,0deg)",end:"scale(0, 1) skew(0,"+(_8*30)+"deg)"},{start:"scale(0, 1) skew(0deg,"+(_8*30)+"deg)",end:"scale(-1, 1) skew(0deg,0deg)"},{start:"scale(-1, 1) skew(0deg,0deg)",end:"scale(0, 1) skew(0deg,"+(-_8*30)+"deg)"},{start:"scale(0, 1) skew(0deg,"+(-_8*30)+"deg)",end:"scale(1, 1) skew(0deg,0deg)"}];
for(var i=0;i<_7.length;i++){
_6.push(dojo.animateProperty(dojo.mixin({node:_5.node,duration:_5.duration||600,properties:{transform:_9[_7[i]]}},_5)));
}
return dojo.fx.chain(_6);
},bounce:function(_a){
var _b=[],n=_a.node,_c=_a.duration||1000,_d=_a.scaleX||1.2,_e=_a.scaleY||0.6,ds=dojo.style,_f=ds(n,"position"),_10="absolute",_11=ds(n,"top"),_12=[],_13=0,_14=Math.round,_15=_a.jumpHeight||70;
if(_f!=="absolute"){
_10="relative";
}
var a1=dojo.animateProperty({node:n,duration:_c/6,properties:{transform:{start:"scale(1, 1)",end:"scale("+_d+", "+_e+")"}}});
dojo.connect(a1,"onBegin",function(){
ds(n,{transformOrigin:"50% 100%",position:_10});
});
_b.push(a1);
var a2=dojo.animateProperty({node:n,duration:_c/6,properties:{transform:{end:"scale(1, 1)",start:"scale("+_d+", "+_e+")"}}});
_12.push(a2);
_12.push(new dojo.Animation(dojo.mixin({curve:[],duration:_c/3,delay:_c/12,onBegin:function(){
_13=(new Date).getTime();
},onAnimate:function(){
var _16=(new Date).getTime();
ds(n,{top:parseInt(ds(n,"top"))-_14(_15*((_16-_13)/this.duration))+"px"});
_13=_16;
}},_a)));
_b.push(dojo.fx.combine(_12));
_b.push(dojo.animateProperty(dojo.mixin({duration:_c/3,onEnd:function(){
ds(n,{position:_f});
},properties:{top:_11}},_a)));
_b.push(a1);
_b.push(a2);
return dojo.fx.chain(_b);
}});
}
