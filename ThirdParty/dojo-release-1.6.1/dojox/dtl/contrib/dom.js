/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.contrib.dom"]){
dojo._hasResource["dojox.dtl.contrib.dom"]=true;
dojo.provide("dojox.dtl.contrib.dom");
dojo.require("dojox.dtl.dom");
(function(){
var dd=dojox.dtl;
var _1=dd.contrib.dom;
var _2={render:function(){
return this.contents;
}};
_1.StyleNode=dojo.extend(function(_3){
this.contents={};
this._current={};
this._styles=_3;
for(var _4 in _3){
if(_3[_4].indexOf("{{")!=-1){
var _5=new dd.Template(_3[_4]);
}else{
var _5=dojo.delegate(_2);
_5.contents=_3[_4];
}
this.contents[_4]=_5;
}
},{render:function(_6,_7){
for(var _8 in this.contents){
var _9=this.contents[_8].render(_6);
if(this._current[_8]!=_9){
dojo.style(_7.getParent(),_8,this._current[_8]=_9);
}
}
return _7;
},unrender:function(_a,_b){
this._current={};
return _b;
},clone:function(_c){
return new this.constructor(this._styles);
}});
_1.BufferNode=dojo.extend(function(_d,_e){
this.nodelist=_d;
this.options=_e;
},{_swap:function(_f,_10){
if(!this.swapped&&this.parent.parentNode){
if(_f=="node"){
if((_10.nodeType==3&&!this.options.text)||(_10.nodeType==1&&!this.options.node)){
return;
}
}else{
if(_f=="class"){
if(_f!="class"){
return;
}
}
}
this.onAddNode&&dojo.disconnect(this.onAddNode);
this.onRemoveNode&&dojo.disconnect(this.onRemoveNode);
this.onChangeAttribute&&dojo.disconnect(this.onChangeAttribute);
this.onChangeData&&dojo.disconnect(this.onChangeData);
this.swapped=this.parent.cloneNode(true);
this.parent.parentNode.replaceChild(this.swapped,this.parent);
}
},render:function(_11,_12){
this.parent=_12.getParent();
if(this.options.node){
this.onAddNode=dojo.connect(_12,"onAddNode",dojo.hitch(this,"_swap","node"));
this.onRemoveNode=dojo.connect(_12,"onRemoveNode",dojo.hitch(this,"_swap","node"));
}
if(this.options.text){
this.onChangeData=dojo.connect(_12,"onChangeData",dojo.hitch(this,"_swap","node"));
}
if(this.options["class"]){
this.onChangeAttribute=dojo.connect(_12,"onChangeAttribute",dojo.hitch(this,"_swap","class"));
}
_12=this.nodelist.render(_11,_12);
if(this.swapped){
this.swapped.parentNode.replaceChild(this.parent,this.swapped);
dojo.destroy(this.swapped);
}else{
this.onAddNode&&dojo.disconnect(this.onAddNode);
this.onRemoveNode&&dojo.disconnect(this.onRemoveNode);
this.onChangeAttribute&&dojo.disconnect(this.onChangeAttribute);
this.onChangeData&&dojo.disconnect(this.onChangeData);
}
delete this.parent;
delete this.swapped;
return _12;
},unrender:function(_13,_14){
return this.nodelist.unrender(_13,_14);
},clone:function(_15){
return new this.constructor(this.nodelist.clone(_15),this.options);
}});
dojo.mixin(_1,{buffer:function(_16,_17){
var _18=_17.contents.split().slice(1);
var _19={};
var _1a=false;
for(var i=_18.length;i--;){
_1a=true;
_19[_18[i]]=true;
}
if(!_1a){
_19.node=true;
}
var _1b=_16.parse(["endbuffer"]);
_16.next_token();
return new _1.BufferNode(_1b,_19);
},html:function(_1c,_1d){
dojo.deprecated("{% html someVariable %}","Use {{ someVariable|safe }} instead");
return _1c.create_variable_node(_1d.contents.slice(5)+"|safe");
},style_:function(_1e,_1f){
var _20={};
_1f=_1f.contents.replace(/^style\s+/,"");
var _21=_1f.split(/\s*;\s*/g);
for(var i=0,_22;_22=_21[i];i++){
var _23=_22.split(/\s*:\s*/g);
var key=_23[0];
var _24=dojo.trim(_23[1]);
if(_24){
_20[key]=_24;
}
}
return new _1.StyleNode(_20);
}});
dd.register.tags("dojox.dtl.contrib",{"dom":["html","attr:style","buffer"]});
})();
}
