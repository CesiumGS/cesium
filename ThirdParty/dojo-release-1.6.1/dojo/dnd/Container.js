/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.dnd.Container"]){
dojo._hasResource["dojo.dnd.Container"]=true;
dojo.provide("dojo.dnd.Container");
dojo.require("dojo.dnd.common");
dojo.require("dojo.parser");
dojo.declare("dojo.dnd.Container",null,{skipForm:false,constructor:function(_1,_2){
this.node=dojo.byId(_1);
if(!_2){
_2={};
}
this.creator=_2.creator||null;
this.skipForm=_2.skipForm;
this.parent=_2.dropParent&&dojo.byId(_2.dropParent);
this.map={};
this.current=null;
this.containerState="";
dojo.addClass(this.node,"dojoDndContainer");
if(!(_2&&_2._skipStartup)){
this.startup();
}
this.events=[dojo.connect(this.node,"onmouseover",this,"onMouseOver"),dojo.connect(this.node,"onmouseout",this,"onMouseOut"),dojo.connect(this.node,"ondragstart",this,"onSelectStart"),dojo.connect(this.node,"onselectstart",this,"onSelectStart")];
},creator:function(){
},getItem:function(_3){
return this.map[_3];
},setItem:function(_4,_5){
this.map[_4]=_5;
},delItem:function(_6){
delete this.map[_6];
},forInItems:function(f,o){
o=o||dojo.global;
var m=this.map,e=dojo.dnd._empty;
for(var i in m){
if(i in e){
continue;
}
f.call(o,m[i],i,this);
}
return o;
},clearItems:function(){
this.map={};
},getAllNodes:function(){
return dojo.query("> .dojoDndItem",this.parent);
},sync:function(){
var _7={};
this.getAllNodes().forEach(function(_8){
if(_8.id){
var _9=this.getItem(_8.id);
if(_9){
_7[_8.id]=_9;
return;
}
}else{
_8.id=dojo.dnd.getUniqueId();
}
var _a=_8.getAttribute("dndType"),_b=_8.getAttribute("dndData");
_7[_8.id]={data:_b||_8.innerHTML,type:_a?_a.split(/\s*,\s*/):["text"]};
},this);
this.map=_7;
return this;
},insertNodes:function(_c,_d,_e){
if(!this.parent.firstChild){
_e=null;
}else{
if(_d){
if(!_e){
_e=this.parent.firstChild;
}
}else{
if(_e){
_e=_e.nextSibling;
}
}
}
if(_e){
for(var i=0;i<_c.length;++i){
var t=this._normalizedCreator(_c[i]);
this.setItem(t.node.id,{data:t.data,type:t.type});
this.parent.insertBefore(t.node,_e);
}
}else{
for(var i=0;i<_c.length;++i){
var t=this._normalizedCreator(_c[i]);
this.setItem(t.node.id,{data:t.data,type:t.type});
this.parent.appendChild(t.node);
}
}
return this;
},destroy:function(){
dojo.forEach(this.events,dojo.disconnect);
this.clearItems();
this.node=this.parent=this.current=null;
},markupFactory:function(_f,_10){
_f._skipStartup=true;
return new dojo.dnd.Container(_10,_f);
},startup:function(){
if(!this.parent){
this.parent=this.node;
if(this.parent.tagName.toLowerCase()=="table"){
var c=this.parent.getElementsByTagName("tbody");
if(c&&c.length){
this.parent=c[0];
}
}
}
this.defaultCreator=dojo.dnd._defaultCreator(this.parent);
this.sync();
},onMouseOver:function(e){
var n=e.relatedTarget;
while(n){
if(n==this.node){
break;
}
try{
n=n.parentNode;
}
catch(x){
n=null;
}
}
if(!n){
this._changeState("Container","Over");
this.onOverEvent();
}
n=this._getChildByEvent(e);
if(this.current==n){
return;
}
if(this.current){
this._removeItemClass(this.current,"Over");
}
if(n){
this._addItemClass(n,"Over");
}
this.current=n;
},onMouseOut:function(e){
for(var n=e.relatedTarget;n;){
if(n==this.node){
return;
}
try{
n=n.parentNode;
}
catch(x){
n=null;
}
}
if(this.current){
this._removeItemClass(this.current,"Over");
this.current=null;
}
this._changeState("Container","");
this.onOutEvent();
},onSelectStart:function(e){
if(!this.skipForm||!dojo.dnd.isFormElement(e)){
dojo.stopEvent(e);
}
},onOverEvent:function(){
},onOutEvent:function(){
},_changeState:function(_11,_12){
var _13="dojoDnd"+_11;
var _14=_11.toLowerCase()+"State";
dojo.replaceClass(this.node,_13+_12,_13+this[_14]);
this[_14]=_12;
},_addItemClass:function(_15,_16){
dojo.addClass(_15,"dojoDndItem"+_16);
},_removeItemClass:function(_17,_18){
dojo.removeClass(_17,"dojoDndItem"+_18);
},_getChildByEvent:function(e){
var _19=e.target;
if(_19){
for(var _1a=_19.parentNode;_1a;_19=_1a,_1a=_19.parentNode){
if(_1a==this.parent&&dojo.hasClass(_19,"dojoDndItem")){
return _19;
}
}
}
return null;
},_normalizedCreator:function(_1b,_1c){
var t=(this.creator||this.defaultCreator).call(this,_1b,_1c);
if(!dojo.isArray(t.type)){
t.type=["text"];
}
if(!t.node.id){
t.node.id=dojo.dnd.getUniqueId();
}
dojo.addClass(t.node,"dojoDndItem");
return t;
}});
dojo.dnd._createNode=function(tag){
if(!tag){
return dojo.dnd._createSpan;
}
return function(_1d){
return dojo.create(tag,{innerHTML:_1d});
};
};
dojo.dnd._createTrTd=function(_1e){
var tr=dojo.create("tr");
dojo.create("td",{innerHTML:_1e},tr);
return tr;
};
dojo.dnd._createSpan=function(_1f){
return dojo.create("span",{innerHTML:_1f});
};
dojo.dnd._defaultCreatorNodes={ul:"li",ol:"li",div:"div",p:"div"};
dojo.dnd._defaultCreator=function(_20){
var tag=_20.tagName.toLowerCase();
var c=tag=="tbody"||tag=="thead"?dojo.dnd._createTrTd:dojo.dnd._createNode(dojo.dnd._defaultCreatorNodes[tag]);
return function(_21,_22){
var _23=_21&&dojo.isObject(_21),_24,_25,n;
if(_23&&_21.tagName&&_21.nodeType&&_21.getAttribute){
_24=_21.getAttribute("dndData")||_21.innerHTML;
_25=_21.getAttribute("dndType");
_25=_25?_25.split(/\s*,\s*/):["text"];
n=_21;
}else{
_24=(_23&&_21.data)?_21.data:_21;
_25=(_23&&_21.type)?_21.type:["text"];
n=(_22=="avatar"?dojo.dnd._createSpan:c)(String(_24));
}
if(!n.id){
n.id=dojo.dnd.getUniqueId();
}
return {node:n,data:_24,type:_25};
};
};
}
