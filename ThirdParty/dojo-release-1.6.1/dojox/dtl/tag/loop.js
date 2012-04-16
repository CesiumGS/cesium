/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.tag.loop"]){
dojo._hasResource["dojox.dtl.tag.loop"]=true;
dojo.provide("dojox.dtl.tag.loop");
dojo.require("dojox.dtl._base");
dojo.require("dojox.string.tokenize");
(function(){
var dd=dojox.dtl;
var _1=dd.tag.loop;
_1.CycleNode=dojo.extend(function(_2,_3,_4,_5){
this.cyclevars=_2;
this.name=_3;
this.contents=_4;
this.shared=_5||{counter:-1,map:{}};
},{render:function(_6,_7){
if(_6.forloop&&!_6.forloop.counter0){
this.shared.counter=-1;
}
++this.shared.counter;
var _8=this.cyclevars[this.shared.counter%this.cyclevars.length];
var _9=this.shared.map;
if(!_9[_8]){
_9[_8]=new dd._Filter(_8);
}
_8=_9[_8].resolve(_6,_7);
if(this.name){
_6[this.name]=_8;
}
this.contents.set(_8);
return this.contents.render(_6,_7);
},unrender:function(_a,_b){
return this.contents.unrender(_a,_b);
},clone:function(_c){
return new this.constructor(this.cyclevars,this.name,this.contents.clone(_c),this.shared);
}});
_1.IfChangedNode=dojo.extend(function(_d,_e,_f){
this.nodes=_d;
this._vars=_e;
this.shared=_f||{last:null,counter:0};
this.vars=dojo.map(_e,function(_10){
return new dojox.dtl._Filter(_10);
});
},{render:function(_11,_12){
if(_11.forloop){
if(_11.forloop.counter<=this.shared.counter){
this.shared.last=null;
}
this.shared.counter=_11.forloop.counter;
}
var _13;
if(this.vars.length){
_13=dojo.toJson(dojo.map(this.vars,function(_14){
return _14.resolve(_11);
}));
}else{
_13=this.nodes.dummyRender(_11,_12);
}
if(_13!=this.shared.last){
var _15=(this.shared.last===null);
this.shared.last=_13;
_11=_11.push();
_11.ifchanged={firstloop:_15};
_12=this.nodes.render(_11,_12);
_11=_11.pop();
}else{
_12=this.nodes.unrender(_11,_12);
}
return _12;
},unrender:function(_16,_17){
return this.nodes.unrender(_16,_17);
},clone:function(_18){
return new this.constructor(this.nodes.clone(_18),this._vars,this.shared);
}});
_1.RegroupNode=dojo.extend(function(_19,key,_1a){
this._expression=_19;
this.expression=new dd._Filter(_19);
this.key=key;
this.alias=_1a;
},{_push:function(_1b,_1c,_1d){
if(_1d.length){
_1b.push({grouper:_1c,list:_1d});
}
},render:function(_1e,_1f){
_1e[this.alias]=[];
var _20=this.expression.resolve(_1e);
if(_20){
var _21=null;
var _22=[];
for(var i=0;i<_20.length;i++){
var id=_20[i][this.key];
if(_21!==id){
this._push(_1e[this.alias],_21,_22);
_21=id;
_22=[_20[i]];
}else{
_22.push(_20[i]);
}
}
this._push(_1e[this.alias],_21,_22);
}
return _1f;
},unrender:function(_23,_24){
return _24;
},clone:function(_25,_26){
return this;
}});
dojo.mixin(_1,{cycle:function(_27,_28){
var _29=_28.split_contents();
if(_29.length<2){
throw new Error("'cycle' tag requires at least two arguments");
}
if(_29[1].indexOf(",")!=-1){
var _2a=_29[1].split(",");
_29=[_29[0]];
for(var i=0;i<_2a.length;i++){
_29.push("\""+_2a[i]+"\"");
}
}
if(_29.length==2){
var _2b=_29[_29.length-1];
if(!_27._namedCycleNodes){
throw new Error("No named cycles in template: '"+_2b+"' is not defined");
}
if(!_27._namedCycleNodes[_2b]){
throw new Error("Named cycle '"+_2b+"' does not exist");
}
return _27._namedCycleNodes[_2b];
}
if(_29.length>4&&_29[_29.length-2]=="as"){
var _2b=_29[_29.length-1];
var _2c=new _1.CycleNode(_29.slice(1,_29.length-2),_2b,_27.create_text_node());
if(!_27._namedCycleNodes){
_27._namedCycleNodes={};
}
_27._namedCycleNodes[_2b]=_2c;
}else{
_2c=new _1.CycleNode(_29.slice(1),null,_27.create_text_node());
}
return _2c;
},ifchanged:function(_2d,_2e){
var _2f=_2e.contents.split();
var _30=_2d.parse(["endifchanged"]);
_2d.delete_first_token();
return new _1.IfChangedNode(_30,_2f.slice(1));
},regroup:function(_31,_32){
var _33=dojox.string.tokenize(_32.contents,/(\s+)/g,function(_34){
return _34;
});
if(_33.length<11||_33[_33.length-3]!="as"||_33[_33.length-7]!="by"){
throw new Error("Expected the format: regroup list by key as newList");
}
var _35=_33.slice(2,-8).join("");
var key=_33[_33.length-5];
var _36=_33[_33.length-1];
return new _1.RegroupNode(_35,key,_36);
}});
})();
}
