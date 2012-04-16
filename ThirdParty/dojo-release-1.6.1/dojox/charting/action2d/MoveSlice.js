/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.action2d.MoveSlice"]){
dojo._hasResource["dojox.charting.action2d.MoveSlice"]=true;
dojo.provide("dojox.charting.action2d.MoveSlice");
dojo.require("dojox.charting.action2d.Base");
dojo.require("dojox.gfx.matrix");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.scan");
dojo.require("dojox.lang.functional.fold");
(function(){
var _1=1.05,_2=7,m=dojox.gfx.matrix,gf=dojox.gfx.fx,df=dojox.lang.functional;
dojo.declare("dojox.charting.action2d.MoveSlice",dojox.charting.action2d.Base,{defaultParams:{duration:400,easing:dojo.fx.easing.backOut,scale:_1,shift:_2},optionalParams:{},constructor:function(_3,_4,_5){
if(!_5){
_5={};
}
this.scale=typeof _5.scale=="number"?_5.scale:_1;
this.shift=typeof _5.shift=="number"?_5.shift:_2;
this.connect();
},process:function(o){
if(!o.shape||o.element!="slice"||!(o.type in this.overOutEvents)){
return;
}
if(!this.angles){
var _6=m._degToRad(o.plot.opt.startAngle);
if(typeof o.run.data[0]=="number"){
this.angles=df.map(df.scanl(o.run.data,"+",_6),"* 2 * Math.PI / this",df.foldl(o.run.data,"+",0));
}else{
this.angles=df.map(df.scanl(o.run.data,"a + b.y",_6),"* 2 * Math.PI / this",df.foldl(o.run.data,"a + b.y",0));
}
}
var _7=o.index,_8,_9,_a,_b,_c,_d=(this.angles[_7]+this.angles[_7+1])/2,_e=m.rotateAt(-_d,o.cx,o.cy),_f=m.rotateAt(_d,o.cx,o.cy);
_8=this.anim[_7];
if(_8){
_8.action.stop(true);
}else{
this.anim[_7]=_8={};
}
if(o.type=="onmouseover"){
_b=0;
_c=this.shift;
_9=1;
_a=this.scale;
}else{
_b=this.shift;
_c=0;
_9=this.scale;
_a=1;
}
_8.action=dojox.gfx.fx.animateTransform({shape:o.shape,duration:this.duration,easing:this.easing,transform:[_f,{name:"translate",start:[_b,0],end:[_c,0]},{name:"scaleAt",start:[_9,o.cx,o.cy],end:[_a,o.cx,o.cy]},_e]});
if(o.type=="onmouseout"){
dojo.connect(_8.action,"onEnd",this,function(){
delete this.anim[_7];
});
}
_8.action.play();
},reset:function(){
delete this.angles;
}});
})();
}
