/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.plugins._Plugin"]){
dojo._hasResource["dojox.drawing.plugins._Plugin"]=true;
dojo.provide("dojox.drawing.plugins._Plugin");
dojox.drawing.plugins._Plugin=dojox.drawing.util.oo.declare(function(_1){
this._cons=[];
dojo.mixin(this,_1);
if(this.button&&this.onClick){
this.connect(this.button,"onClick",this,"onClick");
}
},{util:null,keys:null,mouse:null,drawing:null,stencils:null,anchors:null,canvas:null,node:null,button:null,type:"dojox.drawing.plugins._Plugin",connect:function(){
this._cons.push(dojo.connect.apply(dojo,arguments));
},disconnect:function(_2){
if(!_2){
return;
}
if(!dojo.isArray(_2)){
_2=[_2];
}
dojo.forEach(_2,dojo.disconnect,dojo);
}});
}
