/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.flip"]){
dojo._hasResource["dojox.fx.flip"]=true;
dojo.provide("dojox.fx.flip");
dojo.require("dojo.fx");
dojo.experimental("dojox.fx.flip");
var borderConst="border",widthConst="Width",heightConst="Height",topConst="Top",rightConst="Right",leftConst="Left",bottomConst="Bottom";
dojox.fx.flip=function(_1){
var _2=dojo.create("div"),_3=_1.node=dojo.byId(_1.node),s=_3.style,_4=null,hs=null,pn=null,_5=_1.lightColor||"#dddddd",_6=_1.darkColor||"#555555",_7=dojo.style(_3,"backgroundColor"),_8=_1.endColor||_7,_9={},_a=[],_b=_1.duration?_1.duration/2:250,_c=_1.dir||"left",_d=0.9,_e="transparent",_f=_1.whichAnim,_10=_1.axis||"center",_11=_1.depth;
var _12=function(_13){
return ((new dojo.Color(_13)).toHex()==="#000000")?"#000001":_13;
};
if(dojo.isIE<7){
_8=_12(_8);
_5=_12(_5);
_6=_12(_6);
_7=_12(_7);
_e="black";
_2.style.filter="chroma(color='#000000')";
}
var _14=(function(n){
return function(){
var ret=dojo.coords(n,true);
_4={top:ret.y,left:ret.x,width:ret.w,height:ret.h};
};
})(_3);
_14();
hs={position:"absolute",top:_4["top"]+"px",left:_4["left"]+"px",height:"0",width:"0",zIndex:_1.zIndex||(s.zIndex||0),border:"0 solid "+_e,fontSize:"0",visibility:"hidden"};
var _15=[{},{top:_4["top"],left:_4["left"]}];
var _16={left:[leftConst,rightConst,topConst,bottomConst,widthConst,heightConst,"end"+heightConst+"Min",leftConst,"end"+heightConst+"Max"],right:[rightConst,leftConst,topConst,bottomConst,widthConst,heightConst,"end"+heightConst+"Min",leftConst,"end"+heightConst+"Max"],top:[topConst,bottomConst,leftConst,rightConst,heightConst,widthConst,"end"+widthConst+"Min",topConst,"end"+widthConst+"Max"],bottom:[bottomConst,topConst,leftConst,rightConst,heightConst,widthConst,"end"+widthConst+"Min",topConst,"end"+widthConst+"Max"]};
pn=_16[_c];
if(typeof _11!="undefined"){
_11=Math.max(0,Math.min(1,_11))/2;
_d=0.4+(0.5-_11);
}else{
_d=Math.min(0.9,Math.max(0.4,_4[pn[5].toLowerCase()]/_4[pn[4].toLowerCase()]));
}
var p0=_15[0];
for(var i=4;i<6;i++){
if(_10=="center"||_10=="cube"){
_4["end"+pn[i]+"Min"]=_4[pn[i].toLowerCase()]*_d;
_4["end"+pn[i]+"Max"]=_4[pn[i].toLowerCase()]/_d;
}else{
if(_10=="shortside"){
_4["end"+pn[i]+"Min"]=_4[pn[i].toLowerCase()];
_4["end"+pn[i]+"Max"]=_4[pn[i].toLowerCase()]/_d;
}else{
if(_10=="longside"){
_4["end"+pn[i]+"Min"]=_4[pn[i].toLowerCase()]*_d;
_4["end"+pn[i]+"Max"]=_4[pn[i].toLowerCase()];
}
}
}
}
if(_10=="center"){
p0[pn[2].toLowerCase()]=_4[pn[2].toLowerCase()]-(_4[pn[8]]-_4[pn[6]])/4;
}else{
if(_10=="shortside"){
p0[pn[2].toLowerCase()]=_4[pn[2].toLowerCase()]-(_4[pn[8]]-_4[pn[6]])/2;
}
}
_9[pn[5].toLowerCase()]=_4[pn[5].toLowerCase()]+"px";
_9[pn[4].toLowerCase()]="0";
_9[borderConst+pn[1]+widthConst]=_4[pn[4].toLowerCase()]+"px";
_9[borderConst+pn[1]+"Color"]=_7;
p0[borderConst+pn[1]+widthConst]=0;
p0[borderConst+pn[1]+"Color"]=_6;
p0[borderConst+pn[2]+widthConst]=p0[borderConst+pn[3]+widthConst]=_10!="cube"?(_4["end"+pn[5]+"Max"]-_4["end"+pn[5]+"Min"])/2:_4[pn[6]]/2;
p0[pn[7].toLowerCase()]=_4[pn[7].toLowerCase()]+_4[pn[4].toLowerCase()]/2+(_1.shift||0);
p0[pn[5].toLowerCase()]=_4[pn[6]];
var p1=_15[1];
p1[borderConst+pn[0]+"Color"]={start:_5,end:_8};
p1[borderConst+pn[0]+widthConst]=_4[pn[4].toLowerCase()];
p1[borderConst+pn[2]+widthConst]=0;
p1[borderConst+pn[3]+widthConst]=0;
p1[pn[5].toLowerCase()]={start:_4[pn[6]],end:_4[pn[5].toLowerCase()]};
dojo.mixin(hs,_9);
dojo.style(_2,hs);
dojo.body().appendChild(_2);
var _17=function(){
dojo.destroy(_2);
s.backgroundColor=_8;
s.visibility="visible";
};
if(_f=="last"){
for(i in p0){
p0[i]={start:p0[i]};
}
p0[borderConst+pn[1]+"Color"]={start:_6,end:_8};
p1=p0;
}
if(!_f||_f=="first"){
_a.push(dojo.animateProperty({node:_2,duration:_b,properties:p0}));
}
if(!_f||_f=="last"){
_a.push(dojo.animateProperty({node:_2,duration:_b,properties:p1,onEnd:_17}));
}
dojo.connect(_a[0],"play",function(){
_2.style.visibility="visible";
s.visibility="hidden";
});
return dojo.fx.chain(_a);
};
dojox.fx.flipCube=function(_18){
var _19=[],mb=dojo.marginBox(_18.node),_1a=mb.w/2,_1b=mb.h/2,_1c={top:{pName:"height",args:[{whichAnim:"first",dir:"top",shift:-_1b},{whichAnim:"last",dir:"bottom",shift:_1b}]},right:{pName:"width",args:[{whichAnim:"first",dir:"right",shift:_1a},{whichAnim:"last",dir:"left",shift:-_1a}]},bottom:{pName:"height",args:[{whichAnim:"first",dir:"bottom",shift:_1b},{whichAnim:"last",dir:"top",shift:-_1b}]},left:{pName:"width",args:[{whichAnim:"first",dir:"left",shift:-_1a},{whichAnim:"last",dir:"right",shift:_1a}]}};
var d=_1c[_18.dir||"left"],p=d.args;
_18.duration=_18.duration?_18.duration*2:500;
_18.depth=0.8;
_18.axis="cube";
for(var i=p.length-1;i>=0;i--){
dojo.mixin(_18,p[i]);
_19.push(dojox.fx.flip(_18));
}
return dojo.fx.combine(_19);
};
dojox.fx.flipPage=function(_1d){
var n=_1d.node,_1e=dojo.coords(n,true),x=_1e.x,y=_1e.y,w=_1e.w,h=_1e.h,_1f=dojo.style(n,"backgroundColor"),_20=_1d.lightColor||"#dddddd",_21=_1d.darkColor,_22=dojo.create("div"),_23=[],hn=[],dir=_1d.dir||"right",pn={left:["left","right","x","w"],top:["top","bottom","y","h"],right:["left","left","x","w"],bottom:["top","top","y","h"]},_24={right:[1,-1],left:[-1,1],top:[-1,1],bottom:[1,-1]};
dojo.style(_22,{position:"absolute",width:w+"px",height:h+"px",top:y+"px",left:x+"px",visibility:"hidden"});
var hs=[];
for(var i=0;i<2;i++){
var r=i%2,d=r?pn[dir][1]:dir,wa=r?"last":"first",_25=r?_1f:_20,_26=r?_25:_1d.startColor||n.style.backgroundColor;
hn[i]=dojo.clone(_22);
var _27=function(x){
return function(){
dojo.destroy(hn[x]);
};
}(i);
dojo.body().appendChild(hn[i]);
hs[i]={backgroundColor:r?_26:_1f};
hs[i][pn[dir][0]]=_1e[pn[dir][2]]+_24[dir][0]*i*_1e[pn[dir][3]]+"px";
dojo.style(hn[i],hs[i]);
_23.push(dojox.fx.flip({node:hn[i],dir:d,axis:"shortside",depth:_1d.depth,duration:_1d.duration/2,shift:_24[dir][i]*_1e[pn[dir][3]]/2,darkColor:_21,lightColor:_20,whichAnim:wa,endColor:_25}));
dojo.connect(_23[i],"onEnd",_27);
}
return dojo.fx.chain(_23);
};
dojox.fx.flipGrid=function(_28){
var _29=_28.rows||4,_2a=_28.cols||4,_2b=[],_2c=dojo.create("div"),n=_28.node,_2d=dojo.coords(n,true),x=_2d.x,y=_2d.y,nw=_2d.w,nh=_2d.h,w=_2d.w/_2a,h=_2d.h/_29,_2e=[];
dojo.style(_2c,{position:"absolute",width:w+"px",height:h+"px",backgroundColor:dojo.style(n,"backgroundColor")});
for(var i=0;i<_29;i++){
var r=i%2,d=r?"right":"left",_2f=r?1:-1;
var cn=dojo.clone(n);
dojo.style(cn,{position:"absolute",width:nw+"px",height:nh+"px",top:y+"px",left:x+"px",clip:"rect("+i*h+"px,"+nw+"px,"+nh+"px,0)"});
dojo.body().appendChild(cn);
_2b[i]=[];
for(var j=0;j<_2a;j++){
var hn=dojo.clone(_2c),l=r?j:_2a-(j+1);
var _30=function(xn,_31,_32){
return function(){
if(!(_31%2)){
dojo.style(xn,{clip:"rect("+_31*h+"px,"+(nw-(_32+1)*w)+"px,"+((_31+1)*h)+"px,0px)"});
}else{
dojo.style(xn,{clip:"rect("+_31*h+"px,"+nw+"px,"+((_31+1)*h)+"px,"+((_32+1)*w)+"px)"});
}
};
}(cn,i,j);
dojo.body().appendChild(hn);
dojo.style(hn,{left:x+l*w+"px",top:y+i*h+"px",visibility:"hidden"});
var a=dojox.fx.flipPage({node:hn,dir:d,duration:_28.duration||900,shift:_2f*w/2,depth:0.2,darkColor:_28.darkColor,lightColor:_28.lightColor,startColor:_28.startColor||_28.node.style.backgroundColor}),_33=function(xn){
return function(){
dojo.destroy(xn);
};
}(hn);
dojo.connect(a,"play",this,_30);
dojo.connect(a,"play",this,_33);
_2b[i].push(a);
}
_2e.push(dojo.fx.chain(_2b[i]));
}
dojo.connect(_2e[0],"play",function(){
dojo.style(n,{visibility:"hidden"});
});
return dojo.fx.combine(_2e);
};
}
