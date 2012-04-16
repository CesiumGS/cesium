/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.rotator.Pan"]){
dojo._hasResource["dojox.widget.rotator.Pan"]=true;
dojo.provide("dojox.widget.rotator.Pan");
dojo.require("dojo.fx");
(function(d){
var _1=0,_2=1,UP=2,_3=3;
function _4(_5,_6){
var n=_6.next.node,r=_6.rotatorBox,m=_5%2,a=m?"left":"top",s=(m?r.w:r.h)*(_5<2?-1:1),p={},q={};
d.style(n,"display","");
p[a]={start:0,end:-s};
q[a]={start:s,end:0};
return d.fx.combine([d.animateProperty({node:_6.current.node,duration:_6.duration,properties:p,easing:_6.easing}),d.animateProperty({node:n,duration:_6.duration,properties:q,easing:_6.easing})]);
};
function _7(n,z){
d.style(n,"zIndex",z);
};
d.mixin(dojox.widget.rotator,{pan:function(_8){
var w=_8.wrap,p=_8.rotator.panes,_9=p.length,z=_9,j=_8.current.idx,k=_8.next.idx,nw=Math.abs(k-j),ww=Math.abs((_9-Math.max(j,k))+Math.min(j,k))%_9,_a=j<k,_b=_3,_c=[],_d=[],_e=_8.duration;
if((!w&&!_a)||(w&&(_a&&nw>ww||!_a&&nw<ww))){
_b=_2;
}
if(_8.continuous){
if(_8.quick){
_e=Math.round(_e/(w?Math.min(ww,nw):nw));
}
_7(p[j].node,z--);
var f=(_b==_3);
while(1){
var i=j;
if(f){
if(++j>=_9){
j=0;
}
}else{
if(--j<0){
j=_9-1;
}
}
var x=p[i],y=p[j];
_7(y.node,z--);
_c.push(_4(_b,d.mixin({easing:function(m){
return m;
}},_8,{current:x,next:y,duration:_e})));
if((f&&j==k)||(!f&&j==k)){
break;
}
_d.push(y.node);
}
var _f=d.fx.chain(_c),h=d.connect(_f,"onEnd",function(){
d.disconnect(h);
d.forEach(_d,function(q){
d.style(q,{display:"none",left:0,opacity:1,top:0,zIndex:0});
});
});
return _f;
}
return _4(_b,_8);
},panDown:function(_10){
return _4(_1,_10);
},panRight:function(_11){
return _4(_2,_11);
},panUp:function(_12){
return _4(UP,_12);
},panLeft:function(_13){
return _4(_3,_13);
}});
})(dojo);
}
