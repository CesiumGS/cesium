/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/NodeList-traverse",["./query","./_base/lang","./_base/array"],function(_1,_2,_3){
var _4=_1.NodeList;
_2.extend(_4,{_buildArrayFromCallback:function(_5){
var _6=[];
for(var i=0;i<this.length;i++){
var _7=_5.call(this[i],this[i],_6);
if(_7){
_6=_6.concat(_7);
}
}
return _6;
},_getUniqueAsNodeList:function(_8){
var _9=[];
for(var i=0,_a;_a=_8[i];i++){
if(_a.nodeType==1&&_3.indexOf(_9,_a)==-1){
_9.push(_a);
}
}
return this._wrap(_9,null,this._NodeListCtor);
},_getUniqueNodeListWithParent:function(_b,_c){
var _d=this._getUniqueAsNodeList(_b);
_d=(_c?_1._filterResult(_d,_c):_d);
return _d._stash(this);
},_getRelatedUniqueNodes:function(_e,_f){
return this._getUniqueNodeListWithParent(this._buildArrayFromCallback(_f),_e);
},children:function(_10){
return this._getRelatedUniqueNodes(_10,function(_11,ary){
return _2._toArray(_11.childNodes);
});
},closest:function(_12,_13){
return this._getRelatedUniqueNodes(null,function(_14,ary){
do{
if(_1._filterResult([_14],_12,_13).length){
return _14;
}
}while(_14!=_13&&(_14=_14.parentNode)&&_14.nodeType==1);
return null;
});
},parent:function(_15){
return this._getRelatedUniqueNodes(_15,function(_16,ary){
return _16.parentNode;
});
},parents:function(_17){
return this._getRelatedUniqueNodes(_17,function(_18,ary){
var _19=[];
while(_18.parentNode){
_18=_18.parentNode;
_19.push(_18);
}
return _19;
});
},siblings:function(_1a){
return this._getRelatedUniqueNodes(_1a,function(_1b,ary){
var _1c=[];
var _1d=(_1b.parentNode&&_1b.parentNode.childNodes);
for(var i=0;i<_1d.length;i++){
if(_1d[i]!=_1b){
_1c.push(_1d[i]);
}
}
return _1c;
});
},next:function(_1e){
return this._getRelatedUniqueNodes(_1e,function(_1f,ary){
var _20=_1f.nextSibling;
while(_20&&_20.nodeType!=1){
_20=_20.nextSibling;
}
return _20;
});
},nextAll:function(_21){
return this._getRelatedUniqueNodes(_21,function(_22,ary){
var _23=[];
var _24=_22;
while((_24=_24.nextSibling)){
if(_24.nodeType==1){
_23.push(_24);
}
}
return _23;
});
},prev:function(_25){
return this._getRelatedUniqueNodes(_25,function(_26,ary){
var _27=_26.previousSibling;
while(_27&&_27.nodeType!=1){
_27=_27.previousSibling;
}
return _27;
});
},prevAll:function(_28){
return this._getRelatedUniqueNodes(_28,function(_29,ary){
var _2a=[];
var _2b=_29;
while((_2b=_2b.previousSibling)){
if(_2b.nodeType==1){
_2a.push(_2b);
}
}
return _2a;
});
},andSelf:function(){
return this.concat(this._parent);
},first:function(){
return this._wrap(((this[0]&&[this[0]])||[]),this);
},last:function(){
return this._wrap((this.length?[this[this.length-1]]:[]),this);
},even:function(){
return this.filter(function(_2c,i){
return i%2!=0;
});
},odd:function(){
return this.filter(function(_2d,i){
return i%2==0;
});
}});
return _4;
});
