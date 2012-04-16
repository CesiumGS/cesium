/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.action2d.Magnify"]){
dojo._hasResource["dojox.charting.action2d.Magnify"]=true;
dojo.provide("dojox.charting.action2d.Magnify");
dojo.require("dojox.charting.action2d.Base");
dojo.require("dojox.gfx.matrix");
dojo.require("dojo.fx");
(function(){
var _1=2,m=dojox.gfx.matrix,gf=dojox.gfx.fx;
dojo.declare("dojox.charting.action2d.Magnify",dojox.charting.action2d.Base,{defaultParams:{duration:400,easing:dojo.fx.easing.backOut,scale:_1},optionalParams:{},constructor:function(_2,_3,_4){
this.scale=_4&&typeof _4.scale=="number"?_4.scale:_1;
this.connect();
},process:function(o){
if(!o.shape||!(o.type in this.overOutEvents)||!("cx" in o)||!("cy" in o)){
return;
}
var _5=o.run.name,_6=o.index,_7=[],_8,_9,_a;
if(_5 in this.anim){
_8=this.anim[_5][_6];
}else{
this.anim[_5]={};
}
if(_8){
_8.action.stop(true);
}else{
this.anim[_5][_6]=_8={};
}
if(o.type=="onmouseover"){
_9=m.identity;
_a=this.scale;
}else{
_9=m.scaleAt(this.scale,o.cx,o.cy);
_a=1/this.scale;
}
var _b={shape:o.shape,duration:this.duration,easing:this.easing,transform:[{name:"scaleAt",start:[1,o.cx,o.cy],end:[_a,o.cx,o.cy]},_9]};
if(o.shape){
_7.push(gf.animateTransform(_b));
}
if(o.oultine){
_b.shape=o.outline;
_7.push(gf.animateTransform(_b));
}
if(o.shadow){
_b.shape=o.shadow;
_7.push(gf.animateTransform(_b));
}
if(!_7.length){
delete this.anim[_5][_6];
return;
}
_8.action=dojo.fx.combine(_7);
if(o.type=="onmouseout"){
dojo.connect(_8.action,"onEnd",this,function(){
if(this.anim[_5]){
delete this.anim[_5][_6];
}
});
}
_8.action.play();
}});
})();
}
