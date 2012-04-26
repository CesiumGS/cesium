/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.DropIndicator"]){
dojo._hasResource["dojox.mdnd.DropIndicator"]=true;
dojo.provide("dojox.mdnd.DropIndicator");
dojo.require("dojox.mdnd.AreaManager");
dojo.declare("dojox.mdnd.DropIndicator",null,{node:null,constructor:function(){
var _1=document.createElement("div");
var _2=document.createElement("div");
_1.appendChild(_2);
dojo.addClass(_1,"dropIndicator");
this.node=_1;
},place:function(_3,_4,_5){
if(_5){
this.node.style.height=_5.h+"px";
}
try{
if(_4){
_3.insertBefore(this.node,_4);
}else{
_3.appendChild(this.node);
}
return this.node;
}
catch(e){
return null;
}
},remove:function(){
if(this.node){
this.node.style.height="";
if(this.node.parentNode){
this.node.parentNode.removeChild(this.node);
}
}
},destroy:function(){
if(this.node){
if(this.node.parentNode){
this.node.parentNode.removeChild(this.node);
}
dojo._destroyElement(this.node);
delete this.node;
}
}});
(function(){
dojox.mdnd.areaManager()._dropIndicator=new dojox.mdnd.DropIndicator();
}());
}
