/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot3d.Bars"]){
dojo._hasResource["dojox.charting.plot3d.Bars"]=true;
dojo.provide("dojox.charting.plot3d.Bars");
dojo.require("dojox.charting.plot3d.Base");
(function(){
var _1=function(a,f,o){
a=typeof a=="string"?a.split(""):a;
o=o||dojo.global;
var z=a[0];
for(var i=1;i<a.length;z=f.call(o,z,a[i++])){
}
return z;
};
dojo.declare("dojox.charting.plot3d.Bars",dojox.charting.plot3d.Base,{constructor:function(_2,_3,_4){
this.depth="auto";
this.gap=0;
this.data=[];
this.material={type:"plastic",finish:"dull",color:"lime"};
if(_4){
if("depth" in _4){
this.depth=_4.depth;
}
if("gap" in _4){
this.gap=_4.gap;
}
if("material" in _4){
var m=_4.material;
if(typeof m=="string"||m instanceof dojo.Color){
this.material.color=m;
}else{
this.material=m;
}
}
}
},getDepth:function(){
if(this.depth=="auto"){
var w=this.width;
if(this.data&&this.data.length){
w=w/this.data.length;
}
return w-2*this.gap;
}
return this.depth;
},generate:function(_5,_6){
if(!this.data){
return this;
}
var _7=this.width/this.data.length,_8=0,_9=this.depth=="auto"?_7-2*this.gap:this.depth,_a=this.height/_1(this.data,Math.max);
if(!_6){
_6=_5.view;
}
for(var i=0;i<this.data.length;++i,_8+=_7){
_6.createCube({bottom:{x:_8+this.gap,y:0,z:0},top:{x:_8+_7-this.gap,y:this.data[i]*_a,z:_9}}).setFill(this.material);
}
}});
})();
}
