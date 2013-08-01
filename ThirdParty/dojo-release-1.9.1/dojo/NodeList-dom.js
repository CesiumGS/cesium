/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/NodeList-dom",["./_base/kernel","./query","./_base/array","./_base/lang","./dom-class","./dom-construct","./dom-geometry","./dom-attr","./dom-style"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
var _a=function(a){
return a.length==1&&(typeof a[0]=="string");
};
var _b=function(_c){
var p=_c.parentNode;
if(p){
p.removeChild(_c);
}
};
var _d=_2.NodeList,_e=_d._adaptWithCondition,_f=_d._adaptAsForEach,aam=_d._adaptAsMap;
function _10(_11){
return function(_12,_13,_14){
if(arguments.length==2){
return _11[typeof _13=="string"?"get":"set"](_12,_13);
}
return _11.set(_12,_13,_14);
};
};
_4.extend(_d,{_normalize:function(_15,_16){
var _17=_15.parse===true;
if(typeof _15.template=="string"){
var _18=_15.templateFunc||(_1.string&&_1.string.substitute);
_15=_18?_18(_15.template,_15):_15;
}
var _19=(typeof _15);
if(_19=="string"||_19=="number"){
_15=_6.toDom(_15,(_16&&_16.ownerDocument));
if(_15.nodeType==11){
_15=_4._toArray(_15.childNodes);
}else{
_15=[_15];
}
}else{
if(!_4.isArrayLike(_15)){
_15=[_15];
}else{
if(!_4.isArray(_15)){
_15=_4._toArray(_15);
}
}
}
if(_17){
_15._runParse=true;
}
return _15;
},_cloneNode:function(_1a){
return _1a.cloneNode(true);
},_place:function(ary,_1b,_1c,_1d){
if(_1b.nodeType!=1&&_1c=="only"){
return;
}
var _1e=_1b,_1f;
var _20=ary.length;
for(var i=_20-1;i>=0;i--){
var _21=(_1d?this._cloneNode(ary[i]):ary[i]);
if(ary._runParse&&_1.parser&&_1.parser.parse){
if(!_1f){
_1f=_1e.ownerDocument.createElement("div");
}
_1f.appendChild(_21);
_1.parser.parse(_1f);
_21=_1f.firstChild;
while(_1f.firstChild){
_1f.removeChild(_1f.firstChild);
}
}
if(i==_20-1){
_6.place(_21,_1e,_1c);
}else{
_1e.parentNode.insertBefore(_21,_1e);
}
_1e=_21;
}
},position:aam(_7.position),attr:_e(_10(_8),_a),style:_e(_10(_9),_a),addClass:_f(_5.add),removeClass:_f(_5.remove),toggleClass:_f(_5.toggle),replaceClass:_f(_5.replace),empty:_f(_6.empty),removeAttr:_f(_8.remove),marginBox:aam(_7.getMarginBox),place:function(_22,_23){
var _24=_2(_22)[0];
return this.forEach(function(_25){
_6.place(_25,_24,_23);
});
},orphan:function(_26){
return (_26?_2._filterResult(this,_26):this).forEach(_b);
},adopt:function(_27,_28){
return _2(_27).place(this[0],_28)._stash(this);
},query:function(_29){
if(!_29){
return this;
}
var ret=new _d;
this.map(function(_2a){
_2(_29,_2a).forEach(function(_2b){
if(_2b!==undefined){
ret.push(_2b);
}
});
});
return ret._stash(this);
},filter:function(_2c){
var a=arguments,_2d=this,_2e=0;
if(typeof _2c=="string"){
_2d=_2._filterResult(this,a[0]);
if(a.length==1){
return _2d._stash(this);
}
_2e=1;
}
return this._wrap(_3.filter(_2d,a[_2e],a[_2e+1]),this);
},addContent:function(_2f,_30){
_2f=this._normalize(_2f,this[0]);
for(var i=0,_31;(_31=this[i]);i++){
if(_2f.length){
this._place(_2f,_31,_30,i>0);
}else{
_6.empty(_31);
}
}
return this;
}});
return _d;
});
