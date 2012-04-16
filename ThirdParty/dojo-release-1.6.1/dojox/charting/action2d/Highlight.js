/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.action2d.Highlight"]){
dojo._hasResource["dojox.charting.action2d.Highlight"]=true;
dojo.provide("dojox.charting.action2d.Highlight");
dojo.require("dojox.charting.action2d.Base");
dojo.require("dojox.color");
(function(){
var _1=100,_2=75,_3=50,c=dojox.color,cc=function(_4){
return function(){
return _4;
};
},hl=function(_5){
var a=new c.Color(_5),x=a.toHsl();
if(x.s==0){
x.l=x.l<50?100:0;
}else{
x.s=_1;
if(x.l<_3){
x.l=_2;
}else{
if(x.l>_2){
x.l=_3;
}else{
x.l=x.l-_3>_2-x.l?_3:_2;
}
}
}
return c.fromHsl(x);
};
dojo.declare("dojox.charting.action2d.Highlight",dojox.charting.action2d.Base,{defaultParams:{duration:400,easing:dojo.fx.easing.backOut},optionalParams:{highlight:"red"},constructor:function(_6,_7,_8){
var a=_8&&_8.highlight;
this.colorFun=a?(dojo.isFunction(a)?a:cc(a)):hl;
this.connect();
},process:function(o){
if(!o.shape||!(o.type in this.overOutEvents)){
return;
}
var _9=o.run.name,_a=o.index,_b,_c,_d;
if(_9 in this.anim){
_b=this.anim[_9][_a];
}else{
this.anim[_9]={};
}
if(_b){
_b.action.stop(true);
}else{
var _e=o.shape.getFill();
if(!_e||!(_e instanceof dojo.Color)){
return;
}
this.anim[_9][_a]=_b={start:_e,end:this.colorFun(_e)};
}
var _f=_b.start,end=_b.end;
if(o.type=="onmouseout"){
var t=_f;
_f=end;
end=t;
}
_b.action=dojox.gfx.fx.animateFill({shape:o.shape,duration:this.duration,easing:this.easing,color:{start:_f,end:end}});
if(o.type=="onmouseout"){
dojo.connect(_b.action,"onEnd",this,function(){
if(this.anim[_9]){
delete this.anim[_9][_a];
}
});
}
_b.action.play();
}});
})();
}
