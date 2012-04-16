/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.action2d.Shake"]){
dojo._hasResource["dojox.charting.action2d.Shake"]=true;
dojo.provide("dojox.charting.action2d.Shake");
dojo.require("dojox.charting.action2d.Base");
dojo.require("dojox.gfx.matrix");
dojo.require("dojo.fx");
(function(){
var _1=3,m=dojox.gfx.matrix,gf=dojox.gfx.fx;
dojo.declare("dojox.charting.action2d.Shake",dojox.charting.action2d.Base,{defaultParams:{duration:400,easing:dojo.fx.easing.backOut,shiftX:_1,shiftY:_1},optionalParams:{},constructor:function(_2,_3,_4){
if(!_4){
_4={};
}
this.shiftX=typeof _4.shiftX=="number"?_4.shiftX:_1;
this.shiftY=typeof _4.shiftY=="number"?_4.shiftY:_1;
this.connect();
},process:function(o){
if(!o.shape||!(o.type in this.overOutEvents)){
return;
}
var _5=o.run.name,_6=o.index,_7=[],_8,_9=o.type=="onmouseover"?this.shiftX:-this.shiftX,_a=o.type=="onmouseover"?this.shiftY:-this.shiftY;
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
var _b={shape:o.shape,duration:this.duration,easing:this.easing,transform:[{name:"translate",start:[this.shiftX,this.shiftY],end:[0,0]},m.identity]};
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
