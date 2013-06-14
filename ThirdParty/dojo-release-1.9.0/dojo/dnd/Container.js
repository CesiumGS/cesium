/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/Container",["../_base/array","../_base/declare","../_base/kernel","../_base/lang","../_base/window","../dom","../dom-class","../dom-construct","../Evented","../has","../on","../query","../touch","./common"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,on,_b,_c,_d){
var _e=_2("dojo.dnd.Container",_9,{skipForm:false,allowNested:false,constructor:function(_f,_10){
this.node=_6.byId(_f);
if(!_10){
_10={};
}
this.creator=_10.creator||null;
this.skipForm=_10.skipForm;
this.parent=_10.dropParent&&_6.byId(_10.dropParent);
this.map={};
this.current=null;
this.containerState="";
_7.add(this.node,"dojoDndContainer");
if(!(_10&&_10._skipStartup)){
this.startup();
}
this.events=[on(this.node,_c.over,_4.hitch(this,"onMouseOver")),on(this.node,_c.out,_4.hitch(this,"onMouseOut")),on(this.node,"dragstart",_4.hitch(this,"onSelectStart")),on(this.node,"selectstart",_4.hitch(this,"onSelectStart"))];
},creator:function(){
},getItem:function(key){
return this.map[key];
},setItem:function(key,_11){
this.map[key]=_11;
},delItem:function(key){
delete this.map[key];
},forInItems:function(f,o){
o=o||_3.global;
var m=this.map,e=_d._empty;
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
return _b((this.allowNested?"":"> ")+".dojoDndItem",this.parent);
},sync:function(){
var map={};
this.getAllNodes().forEach(function(_12){
if(_12.id){
var _13=this.getItem(_12.id);
if(_13){
map[_12.id]=_13;
return;
}
}else{
_12.id=_d.getUniqueId();
}
var _14=_12.getAttribute("dndType"),_15=_12.getAttribute("dndData");
map[_12.id]={data:_15||_12.innerHTML,type:_14?_14.split(/\s*,\s*/):["text"]};
},this);
this.map=map;
return this;
},insertNodes:function(_16,_17,_18){
if(!this.parent.firstChild){
_18=null;
}else{
if(_17){
if(!_18){
_18=this.parent.firstChild;
}
}else{
if(_18){
_18=_18.nextSibling;
}
}
}
var i,t;
if(_18){
for(i=0;i<_16.length;++i){
t=this._normalizedCreator(_16[i]);
this.setItem(t.node.id,{data:t.data,type:t.type});
_18.parentNode.insertBefore(t.node,_18);
}
}else{
for(i=0;i<_16.length;++i){
t=this._normalizedCreator(_16[i]);
this.setItem(t.node.id,{data:t.data,type:t.type});
this.parent.appendChild(t.node);
}
}
return this;
},destroy:function(){
_1.forEach(this.events,function(_19){
_19.remove();
});
this.clearItems();
this.node=this.parent=this.current=null;
},markupFactory:function(_1a,_1b,_1c){
_1a._skipStartup=true;
return new _1c(_1b,_1a);
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
this.defaultCreator=_d._defaultCreator(this.parent);
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
if(!this.skipForm||!_d.isFormElement(e)){
e.stopPropagation();
e.preventDefault();
}
},onOverEvent:function(){
},onOutEvent:function(){
},_changeState:function(_1d,_1e){
var _1f="dojoDnd"+_1d;
var _20=_1d.toLowerCase()+"State";
_7.replace(this.node,_1f+_1e,_1f+this[_20]);
this[_20]=_1e;
},_addItemClass:function(_21,_22){
_7.add(_21,"dojoDndItem"+_22);
},_removeItemClass:function(_23,_24){
_7.remove(_23,"dojoDndItem"+_24);
},_getChildByEvent:function(e){
var _25=e.target;
if(_25){
for(var _26=_25.parentNode;_26;_25=_26,_26=_25.parentNode){
if((_26==this.parent||this.allowNested)&&_7.contains(_25,"dojoDndItem")){
return _25;
}
}
}
return null;
},_normalizedCreator:function(_27,_28){
var t=(this.creator||this.defaultCreator).call(this,_27,_28);
if(!_4.isArray(t.type)){
t.type=["text"];
}
if(!t.node.id){
t.node.id=_d.getUniqueId();
}
_7.add(t.node,"dojoDndItem");
return t;
}});
_d._createNode=function(tag){
if(!tag){
return _d._createSpan;
}
return function(_29){
return _8.create(tag,{innerHTML:_29});
};
};
_d._createTrTd=function(_2a){
var tr=_8.create("tr");
_8.create("td",{innerHTML:_2a},tr);
return tr;
};
_d._createSpan=function(_2b){
return _8.create("span",{innerHTML:_2b});
};
_d._defaultCreatorNodes={ul:"li",ol:"li",div:"div",p:"div"};
_d._defaultCreator=function(_2c){
var tag=_2c.tagName.toLowerCase();
var c=tag=="tbody"||tag=="thead"?_d._createTrTd:_d._createNode(_d._defaultCreatorNodes[tag]);
return function(_2d,_2e){
var _2f=_2d&&_4.isObject(_2d),_30,_31,n;
if(_2f&&_2d.tagName&&_2d.nodeType&&_2d.getAttribute){
_30=_2d.getAttribute("dndData")||_2d.innerHTML;
_31=_2d.getAttribute("dndType");
_31=_31?_31.split(/\s*,\s*/):["text"];
n=_2d;
}else{
_30=(_2f&&_2d.data)?_2d.data:_2d;
_31=(_2f&&_2d.type)?_2d.type:["text"];
n=(_2e=="avatar"?_d._createSpan:c)(String(_30));
}
if(!n.id){
n.id=_d.getUniqueId();
}
return {node:n,data:_30,type:_31};
};
};
return _e;
});
