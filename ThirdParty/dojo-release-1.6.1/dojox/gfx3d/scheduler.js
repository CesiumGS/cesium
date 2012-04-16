/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx3d.scheduler"]){
dojo._hasResource["dojox.gfx3d.scheduler"]=true;
dojo.provide("dojox.gfx3d.scheduler");
dojo.provide("dojox.gfx3d.drawer");
dojo.require("dojox.gfx3d.vector");
dojo.mixin(dojox.gfx3d.scheduler,{zOrder:function(_1,_2){
_2=_2?_2:dojox.gfx3d.scheduler.order;
_1.sort(function(a,b){
return _2(b)-_2(a);
});
return _1;
},bsp:function(_3,_4){
_4=_4?_4:dojox.gfx3d.scheduler.outline;
var p=new dojox.gfx3d.scheduler.BinarySearchTree(_3[0],_4);
dojo.forEach(_3.slice(1),function(_5){
p.add(_5,_4);
});
return p.iterate(_4);
},order:function(it){
return it.getZOrder();
},outline:function(it){
return it.getOutline();
}});
dojo.declare("dojox.gfx3d.scheduler.BinarySearchTree",null,{constructor:function(_6,_7){
this.plus=null;
this.minus=null;
this.object=_6;
var o=_7(_6);
this.orient=o[0];
this.normal=dojox.gfx3d.vector.normalize(o);
},add:function(_8,_9){
var _a=0.5,o=_9(_8),v=dojox.gfx3d.vector,n=this.normal,a=this.orient,_b=dojox.gfx3d.scheduler.BinarySearchTree;
if(dojo.every(o,function(_c){
return Math.floor(_a+v.dotProduct(n,v.substract(_c,a)))<=0;
})){
if(this.minus){
this.minus.add(_8,_9);
}else{
this.minus=new _b(_8,_9);
}
}else{
if(dojo.every(o,function(_d){
return Math.floor(_a+v.dotProduct(n,v.substract(_d,a)))>=0;
})){
if(this.plus){
this.plus.add(_8,_9);
}else{
this.plus=new _b(_8,_9);
}
}else{
throw "The case: polygon cross siblings' plate is not implemneted yet";
}
}
},iterate:function(_e){
var _f=0.5;
var v=dojox.gfx3d.vector;
var _10=[];
var _11=null;
var _12={x:0,y:0,z:-10000};
if(Math.floor(_f+v.dotProduct(this.normal,v.substract(_12,this.orient)))<=0){
_11=[this.plus,this.minus];
}else{
_11=[this.minus,this.plus];
}
if(_11[0]){
_10=_10.concat(_11[0].iterate());
}
_10.push(this.object);
if(_11[1]){
_10=_10.concat(_11[1].iterate());
}
return _10;
}});
dojo.mixin(dojox.gfx3d.drawer,{conservative:function(_13,_14,_15){
dojo.forEach(this.objects,function(_16){
_16.destroy();
});
dojo.forEach(_14,function(_17){
_17.draw(_15.lighting);
});
},chart:function(_18,_19,_1a){
dojo.forEach(this.todos,function(_1b){
_1b.draw(_1a.lighting);
});
}});
}
