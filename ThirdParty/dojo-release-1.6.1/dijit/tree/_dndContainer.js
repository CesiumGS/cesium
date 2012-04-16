/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.tree._dndContainer"]){
dojo._hasResource["dijit.tree._dndContainer"]=true;
dojo.provide("dijit.tree._dndContainer");
dojo.require("dojo.dnd.common");
dojo.require("dojo.dnd.Container");
dojo.getObject("tree",true,dojo);
dijit.tree._compareNodes=function(n1,n2){
if(n1===n2){
return 0;
}
if("sourceIndex" in document.documentElement){
return n1.sourceIndex-n2.sourceIndex;
}else{
if("compareDocumentPosition" in document.documentElement){
return n1.compareDocumentPosition(n2)&2?1:-1;
}else{
if(document.createRange){
var r1=doc.createRange();
r1.setStartBefore(n1);
var r2=doc.createRange();
r2.setStartBefore(n2);
return r1.compareBoundaryPoints(r1.END_TO_END,r2);
}else{
throw Error("dijit.tree._compareNodes don't know how to compare two different nodes in this browser");
}
}
}
};
dojo.declare("dijit.tree._dndContainer",null,{constructor:function(_1,_2){
this.tree=_1;
this.node=_1.domNode;
dojo.mixin(this,_2);
this.map={};
this.current=null;
this.containerState="";
dojo.addClass(this.node,"dojoDndContainer");
this.events=[dojo.connect(this.node,"onmouseenter",this,"onOverEvent"),dojo.connect(this.node,"onmouseleave",this,"onOutEvent"),dojo.connect(this.tree,"_onNodeMouseEnter",this,"onMouseOver"),dojo.connect(this.tree,"_onNodeMouseLeave",this,"onMouseOut"),dojo.connect(this.node,"ondragstart",dojo,"stopEvent"),dojo.connect(this.node,"onselectstart",dojo,"stopEvent")];
},getItem:function(_3){
var _4=this.selection[_3],_5={data:_4,type:["treeNode"]};
return _5;
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
this.node=this.parent=null;
},onMouseOver:function(_6,_7){
this.current=_6;
},onMouseOut:function(_8,_9){
this.current=null;
},_changeState:function(_a,_b){
var _c="dojoDnd"+_a;
var _d=_a.toLowerCase()+"State";
dojo.replaceClass(this.node,_c+_b,_c+this[_d]);
this[_d]=_b;
},_addItemClass:function(_e,_f){
dojo.addClass(_e,"dojoDndItem"+_f);
},_removeItemClass:function(_10,_11){
dojo.removeClass(_10,"dojoDndItem"+_11);
},onOverEvent:function(){
this._changeState("Container","Over");
},onOutEvent:function(){
this._changeState("Container","");
}});
}
