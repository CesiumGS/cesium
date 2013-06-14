/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/query",["./_base/kernel","./has","./dom","./on","./_base/array","./_base/lang","./selector/_loader","./selector/_loader!default"],function(_1,_2,_3,on,_4,_5,_6,_7){
"use strict";
_2.add("array-extensible",function(){
return _5.delegate([],{length:1}).length==1&&!_2("bug-for-in-skips-shadowed");
});
var ap=Array.prototype,_8=ap.slice,_9=ap.concat,_a=_4.forEach;
var _b=function(a,_c,_d){
var _e=new (_d||this._NodeListCtor||nl)(a);
return _c?_e._stash(_c):_e;
};
var _f=function(f,a,o){
a=[0].concat(_8.call(a,0));
o=o||_1.global;
return function(_10){
a[0]=_10;
return f.apply(o,a);
};
};
var _11=function(f,o){
return function(){
this.forEach(_f(f,arguments,o));
return this;
};
};
var _12=function(f,o){
return function(){
return this.map(_f(f,arguments,o));
};
};
var _13=function(f,o){
return function(){
return this.filter(_f(f,arguments,o));
};
};
var _14=function(f,g,o){
return function(){
var a=arguments,_15=_f(f,a,o);
if(g.call(o||_1.global,a)){
return this.map(_15);
}
this.forEach(_15);
return this;
};
};
var _16=function(_17){
var _18=this instanceof nl&&_2("array-extensible");
if(typeof _17=="number"){
_17=Array(_17);
}
var _19=(_17&&"length" in _17)?_17:arguments;
if(_18||!_19.sort){
var _1a=_18?this:[],l=_1a.length=_19.length;
for(var i=0;i<l;i++){
_1a[i]=_19[i];
}
if(_18){
return _1a;
}
_19=_1a;
}
_5._mixin(_19,nlp);
_19._NodeListCtor=function(_1b){
return nl(_1b);
};
return _19;
};
var nl=_16,nlp=nl.prototype=_2("array-extensible")?[]:{};
nl._wrap=nlp._wrap=_b;
nl._adaptAsMap=_12;
nl._adaptAsForEach=_11;
nl._adaptAsFilter=_13;
nl._adaptWithCondition=_14;
_a(["slice","splice"],function(_1c){
var f=ap[_1c];
nlp[_1c]=function(){
return this._wrap(f.apply(this,arguments),_1c=="slice"?this:null);
};
});
_a(["indexOf","lastIndexOf","every","some"],function(_1d){
var f=_4[_1d];
nlp[_1d]=function(){
return f.apply(_1,[this].concat(_8.call(arguments,0)));
};
});
_5.extend(_16,{constructor:nl,_NodeListCtor:nl,toString:function(){
return this.join(",");
},_stash:function(_1e){
this._parent=_1e;
return this;
},on:function(_1f,_20){
var _21=this.map(function(_22){
return on(_22,_1f,_20);
});
_21.remove=function(){
for(var i=0;i<_21.length;i++){
_21[i].remove();
}
};
return _21;
},end:function(){
if(this._parent){
return this._parent;
}else{
return new this._NodeListCtor(0);
}
},concat:function(_23){
var t=_8.call(this,0),m=_4.map(arguments,function(a){
return _8.call(a,0);
});
return this._wrap(_9.apply(t,m),this);
},map:function(_24,obj){
return this._wrap(_4.map(this,_24,obj),this);
},forEach:function(_25,_26){
_a(this,_25,_26);
return this;
},filter:function(_27){
var a=arguments,_28=this,_29=0;
if(typeof _27=="string"){
_28=_2a._filterResult(this,a[0]);
if(a.length==1){
return _28._stash(this);
}
_29=1;
}
return this._wrap(_4.filter(_28,a[_29],a[_29+1]),this);
},instantiate:function(_2b,_2c){
var c=_5.isFunction(_2b)?_2b:_5.getObject(_2b);
_2c=_2c||{};
return this.forEach(function(_2d){
new c(_2c,_2d);
});
},at:function(){
var t=new this._NodeListCtor(0);
_a(arguments,function(i){
if(i<0){
i=this.length+i;
}
if(this[i]){
t.push(this[i]);
}
},this);
return t._stash(this);
}});
function _2e(_2f,_30){
var _31=function(_32,_33){
if(typeof _33=="string"){
_33=_3.byId(_33);
if(!_33){
return new _30([]);
}
}
var _34=typeof _32=="string"?_2f(_32,_33):_32?(_32.end&&_32.on)?_32:[_32]:[];
if(_34.end&&_34.on){
return _34;
}
return new _30(_34);
};
_31.matches=_2f.match||function(_35,_36,_37){
return _31.filter([_35],_36,_37).length>0;
};
_31.filter=_2f.filter||function(_38,_39,_3a){
return _31(_39,_3a).filter(function(_3b){
return _4.indexOf(_38,_3b)>-1;
});
};
if(typeof _2f!="function"){
var _3c=_2f.search;
_2f=function(_3d,_3e){
return _3c(_3e||document,_3d);
};
}
return _31;
};
var _2a=_2e(_7,_16);
_1.query=_2e(_7,function(_3f){
return _16(_3f);
});
_2a.load=function(id,_40,_41){
_6.load(id,_40,function(_42){
_41(_2e(_42,_16));
});
};
_1._filterQueryResult=_2a._filterResult=function(_43,_44,_45){
return new _16(_2a.filter(_43,_44,_45));
};
_1.NodeList=_2a.NodeList=_16;
return _2a;
});
