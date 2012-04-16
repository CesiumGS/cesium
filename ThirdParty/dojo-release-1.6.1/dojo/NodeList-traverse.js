/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.NodeList-traverse"]){
dojo._hasResource["dojo.NodeList-traverse"]=true;
dojo.provide("dojo.NodeList-traverse");
dojo.extend(dojo.NodeList,{_buildArrayFromCallback:function(_1){
var _2=[];
for(var i=0;i<this.length;i++){
var _3=_1.call(this[i],this[i],_2);
if(_3){
_2=_2.concat(_3);
}
}
return _2;
},_getUniqueAsNodeList:function(_4){
var _5=[];
for(var i=0,_6;_6=_4[i];i++){
if(_6.nodeType==1&&dojo.indexOf(_5,_6)==-1){
_5.push(_6);
}
}
return this._wrap(_5,null,this._NodeListCtor);
},_getUniqueNodeListWithParent:function(_7,_8){
var _9=this._getUniqueAsNodeList(_7);
_9=(_8?dojo._filterQueryResult(_9,_8):_9);
return _9._stash(this);
},_getRelatedUniqueNodes:function(_a,_b){
return this._getUniqueNodeListWithParent(this._buildArrayFromCallback(_b),_a);
},children:function(_c){
return this._getRelatedUniqueNodes(_c,function(_d,_e){
return dojo._toArray(_d.childNodes);
});
},closest:function(_f,_10){
return this._getRelatedUniqueNodes(null,function(_11,ary){
do{
if(dojo._filterQueryResult([_11],_f,_10).length){
return _11;
}
}while(_11!=_10&&(_11=_11.parentNode)&&_11.nodeType==1);
return null;
});
},parent:function(_12){
return this._getRelatedUniqueNodes(_12,function(_13,ary){
return _13.parentNode;
});
},parents:function(_14){
return this._getRelatedUniqueNodes(_14,function(_15,ary){
var _16=[];
while(_15.parentNode){
_15=_15.parentNode;
_16.push(_15);
}
return _16;
});
},siblings:function(_17){
return this._getRelatedUniqueNodes(_17,function(_18,ary){
var _19=[];
var _1a=(_18.parentNode&&_18.parentNode.childNodes);
for(var i=0;i<_1a.length;i++){
if(_1a[i]!=_18){
_19.push(_1a[i]);
}
}
return _19;
});
},next:function(_1b){
return this._getRelatedUniqueNodes(_1b,function(_1c,ary){
var _1d=_1c.nextSibling;
while(_1d&&_1d.nodeType!=1){
_1d=_1d.nextSibling;
}
return _1d;
});
},nextAll:function(_1e){
return this._getRelatedUniqueNodes(_1e,function(_1f,ary){
var _20=[];
var _21=_1f;
while((_21=_21.nextSibling)){
if(_21.nodeType==1){
_20.push(_21);
}
}
return _20;
});
},prev:function(_22){
return this._getRelatedUniqueNodes(_22,function(_23,ary){
var _24=_23.previousSibling;
while(_24&&_24.nodeType!=1){
_24=_24.previousSibling;
}
return _24;
});
},prevAll:function(_25){
return this._getRelatedUniqueNodes(_25,function(_26,ary){
var _27=[];
var _28=_26;
while((_28=_28.previousSibling)){
if(_28.nodeType==1){
_27.push(_28);
}
}
return _27;
});
},andSelf:function(){
return this.concat(this._parent);
},first:function(){
return this._wrap(((this[0]&&[this[0]])||[]),this);
},last:function(){
return this._wrap((this.length?[this[this.length-1]]:[]),this);
},even:function(){
return this.filter(function(_29,i){
return i%2!=0;
});
},odd:function(){
return this.filter(function(_2a,i){
return i%2==0;
});
}});
}
