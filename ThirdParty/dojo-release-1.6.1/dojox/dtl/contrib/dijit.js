/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.contrib.dijit"]){
dojo._hasResource["dojox.dtl.contrib.dijit"]=true;
dojo.provide("dojox.dtl.contrib.dijit");
dojo.require("dojox.dtl.dom");
dojo.require("dojo.parser");
(function(){
var dd=dojox.dtl;
var _1=dd.contrib.dijit;
_1.AttachNode=dojo.extend(function(_2,_3){
this._keys=_2;
this._object=_3;
},{render:function(_4,_5){
if(!this._rendered){
this._rendered=true;
for(var i=0,_6;_6=this._keys[i];i++){
_4.getThis()[_6]=this._object||_5.getParent();
}
}
return _5;
},unrender:function(_7,_8){
if(this._rendered){
this._rendered=false;
for(var i=0,_9;_9=this._keys[i];i++){
if(_7.getThis()[_9]===(this._object||_8.getParent())){
delete _7.getThis()[_9];
}
}
}
return _8;
},clone:function(_a){
return new this.constructor(this._keys,this._object);
}});
_1.EventNode=dojo.extend(function(_b,_c){
this._command=_b;
var _d,_e=_b.split(/\s*,\s*/);
var _f=dojo.trim;
var _10=[];
var fns=[];
while(_d=_e.pop()){
if(_d){
var fn=null;
if(_d.indexOf(":")!=-1){
var _11=_d.split(":");
_d=_f(_11[0]);
fn=_f(_11.slice(1).join(":"));
}else{
_d=_f(_d);
}
if(!fn){
fn=_d;
}
_10.push(_d);
fns.push(fn);
}
}
this._types=_10;
this._fns=fns;
this._object=_c;
this._rendered=[];
},{_clear:false,render:function(_12,_13){
for(var i=0,_14;_14=this._types[i];i++){
if(!this._clear&&!this._object){
_13.getParent()[_14]=null;
}
var fn=this._fns[i];
var _15;
if(fn.indexOf(" ")!=-1){
if(this._rendered[i]){
dojo.disconnect(this._rendered[i]);
this._rendered[i]=false;
}
_15=dojo.map(fn.split(" ").slice(1),function(_16){
return new dd._Filter(_16).resolve(_12);
});
fn=fn.split(" ",2)[0];
}
if(!this._rendered[i]){
if(!this._object){
this._rendered[i]=_13.addEvent(_12,_14,fn,_15);
}else{
this._rendered[i]=dojo.connect(this._object,_14,_12.getThis(),fn);
}
}
}
this._clear=true;
return _13;
},unrender:function(_17,_18){
while(this._rendered.length){
dojo.disconnect(this._rendered.pop());
}
return _18;
},clone:function(){
return new this.constructor(this._command,this._object);
}});
function _19(n1){
var n2=n1.cloneNode(true);
if(dojo.isIE){
dojo.query("script",n2).forEach("item.text = this[index].text;",dojo.query("script",n1));
}
return n2;
};
_1.DojoTypeNode=dojo.extend(function(_1a,_1b){
this._node=_1a;
this._parsed=_1b;
var _1c=_1a.getAttribute("dojoAttachEvent");
if(_1c){
this._events=new _1.EventNode(dojo.trim(_1c));
}
var _1d=_1a.getAttribute("dojoAttachPoint");
if(_1d){
this._attach=new _1.AttachNode(dojo.trim(_1d).split(/\s*,\s*/));
}
if(!_1b){
this._dijit=dojo.parser.instantiate([_19(_1a)])[0];
}else{
_1a=_19(_1a);
var old=_1.widgetsInTemplate;
_1.widgetsInTemplate=false;
this._template=new dd.DomTemplate(_1a);
_1.widgetsInTemplate=old;
}
},{render:function(_1e,_1f){
if(this._parsed){
var _20=new dd.DomBuffer();
this._template.render(_1e,_20);
var _21=_19(_20.getRootNode());
var div=document.createElement("div");
div.appendChild(_21);
var _22=div.innerHTML;
div.removeChild(_21);
if(_22!=this._rendered){
this._rendered=_22;
if(this._dijit){
this._dijit.destroyRecursive();
}
this._dijit=dojo.parser.instantiate([_21])[0];
}
}
var _23=this._dijit.domNode;
if(this._events){
this._events._object=this._dijit;
this._events.render(_1e,_1f);
}
if(this._attach){
this._attach._object=this._dijit;
this._attach.render(_1e,_1f);
}
return _1f.concat(_23);
},unrender:function(_24,_25){
return _25.remove(this._dijit.domNode);
},clone:function(){
return new this.constructor(this._node,this._parsed);
}});
dojo.mixin(_1,{widgetsInTemplate:true,dojoAttachPoint:function(_26,_27){
return new _1.AttachNode(_27.contents.slice(16).split(/\s*,\s*/));
},dojoAttachEvent:function(_28,_29){
return new _1.EventNode(_29.contents.slice(16));
},dojoType:function(_2a,_2b){
var _2c=false;
if(_2b.contents.slice(-7)==" parsed"){
_2c=true;
}
var _2d=_2b.contents.slice(9);
var _2e=_2c?_2d.slice(0,-7):_2d.toString();
if(_1.widgetsInTemplate){
var _2f=_2a.swallowNode();
_2f.setAttribute("dojoType",_2e);
return new _1.DojoTypeNode(_2f,_2c);
}
return new dd.AttributeNode("dojoType",_2e);
},on:function(_30,_31){
var _32=_31.contents.split();
return new _1.EventNode(_32[0]+":"+_32.slice(1).join(" "));
}});
dd.register.tags("dojox.dtl.contrib",{"dijit":["attr:dojoType","attr:dojoAttachPoint",["attr:attach","dojoAttachPoint"],"attr:dojoAttachEvent",[/(attr:)?on(click|key(up))/i,"on"]]});
})();
}
