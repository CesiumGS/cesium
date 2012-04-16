/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.NodeList"]){
dojo._hasResource["dojo._base.NodeList"]=true;
dojo.provide("dojo._base.NodeList");
dojo.require("dojo._base.lang");
dojo.require("dojo._base.array");
dojo.require("dojo._base.connect");
dojo.require("dojo._base.html");
(function(){
var d=dojo;
var ap=Array.prototype,_1=ap.slice,_2=ap.concat;
var _3=function(a,_4,_5){
if(!a.sort){
a=_1.call(a,0);
}
var _6=_5||this._NodeListCtor||d._NodeListCtor;
a.constructor=_6;
dojo._mixin(a,_6.prototype);
a._NodeListCtor=_6;
return _4?a._stash(_4):a;
};
var _7=function(f,a,o){
a=[0].concat(_1.call(a,0));
o=o||d.global;
return function(_8){
a[0]=_8;
return f.apply(o,a);
};
};
var _9=function(f,o){
return function(){
this.forEach(_7(f,arguments,o));
return this;
};
};
var _a=function(f,o){
return function(){
return this.map(_7(f,arguments,o));
};
};
var _b=function(f,o){
return function(){
return this.filter(_7(f,arguments,o));
};
};
var _c=function(f,g,o){
return function(){
var a=arguments,_d=_7(f,a,o);
if(g.call(o||d.global,a)){
return this.map(_d);
}
this.forEach(_d);
return this;
};
};
var _e=function(a){
return a.length==1&&(typeof a[0]=="string");
};
var _f=function(_10){
var p=_10.parentNode;
if(p){
p.removeChild(_10);
}
};
dojo.NodeList=function(){
return _3(Array.apply(null,arguments));
};
d._NodeListCtor=d.NodeList;
var nl=d.NodeList,nlp=nl.prototype;
nl._wrap=nlp._wrap=_3;
nl._adaptAsMap=_a;
nl._adaptAsForEach=_9;
nl._adaptAsFilter=_b;
nl._adaptWithCondition=_c;
d.forEach(["slice","splice"],function(_11){
var f=ap[_11];
nlp[_11]=function(){
return this._wrap(f.apply(this,arguments),_11=="slice"?this:null);
};
});
d.forEach(["indexOf","lastIndexOf","every","some"],function(_12){
var f=d[_12];
nlp[_12]=function(){
return f.apply(d,[this].concat(_1.call(arguments,0)));
};
});
d.forEach(["attr","style"],function(_13){
nlp[_13]=_c(d[_13],_e);
});
d.forEach(["connect","addClass","removeClass","replaceClass","toggleClass","empty","removeAttr"],function(_14){
nlp[_14]=_9(d[_14]);
});
dojo.extend(dojo.NodeList,{_normalize:function(_15,_16){
var _17=_15.parse===true?true:false;
if(typeof _15.template=="string"){
var _18=_15.templateFunc||(dojo.string&&dojo.string.substitute);
_15=_18?_18(_15.template,_15):_15;
}
var _19=(typeof _15);
if(_19=="string"||_19=="number"){
_15=dojo._toDom(_15,(_16&&_16.ownerDocument));
if(_15.nodeType==11){
_15=dojo._toArray(_15.childNodes);
}else{
_15=[_15];
}
}else{
if(!dojo.isArrayLike(_15)){
_15=[_15];
}else{
if(!dojo.isArray(_15)){
_15=dojo._toArray(_15);
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
if(ary._runParse&&dojo.parser&&dojo.parser.parse){
if(!_1f){
_1f=_1e.ownerDocument.createElement("div");
}
_1f.appendChild(_21);
dojo.parser.parse(_1f);
_21=_1f.firstChild;
while(_1f.firstChild){
_1f.removeChild(_1f.firstChild);
}
}
if(i==_20-1){
dojo.place(_21,_1e,_1c);
}else{
_1e.parentNode.insertBefore(_21,_1e);
}
_1e=_21;
}
},_stash:function(_22){
this._parent=_22;
return this;
},end:function(){
if(this._parent){
return this._parent;
}else{
return new this._NodeListCtor();
}
},concat:function(_23){
var t=d.isArray(this)?this:_1.call(this,0),m=d.map(arguments,function(a){
return a&&!d.isArray(a)&&(typeof NodeList!="undefined"&&a.constructor===NodeList||a.constructor===this._NodeListCtor)?_1.call(a,0):a;
});
return this._wrap(_2.apply(t,m),this);
},map:function(_24,obj){
return this._wrap(d.map(this,_24,obj),this);
},forEach:function(_25,_26){
d.forEach(this,_25,_26);
return this;
},coords:_a(d.coords),position:_a(d.position),place:function(_27,_28){
var _29=d.query(_27)[0];
return this.forEach(function(_2a){
d.place(_2a,_29,_28);
});
},orphan:function(_2b){
return (_2b?d._filterQueryResult(this,_2b):this).forEach(_f);
},adopt:function(_2c,_2d){
return d.query(_2c).place(this[0],_2d)._stash(this);
},query:function(_2e){
if(!_2e){
return this;
}
var ret=this.map(function(_2f){
return d.query(_2e,_2f).filter(function(_30){
return _30!==undefined;
});
});
return this._wrap(_2.apply([],ret),this);
},filter:function(_31){
var a=arguments,_32=this,_33=0;
if(typeof _31=="string"){
_32=d._filterQueryResult(this,a[0]);
if(a.length==1){
return _32._stash(this);
}
_33=1;
}
return this._wrap(d.filter(_32,a[_33],a[_33+1]),this);
},addContent:function(_34,_35){
_34=this._normalize(_34,this[0]);
for(var i=0,_36;(_36=this[i]);i++){
this._place(_34,_36,_35,i>0);
}
return this;
},instantiate:function(_37,_38){
var c=d.isFunction(_37)?_37:d.getObject(_37);
_38=_38||{};
return this.forEach(function(_39){
new c(_38,_39);
});
},at:function(){
var t=new this._NodeListCtor();
d.forEach(arguments,function(i){
if(i<0){
i=this.length+i;
}
if(this[i]){
t.push(this[i]);
}
},this);
return t._stash(this);
}});
nl.events=["blur","focus","change","click","error","keydown","keypress","keyup","load","mousedown","mouseenter","mouseleave","mousemove","mouseout","mouseover","mouseup","submit"];
d.forEach(nl.events,function(evt){
var _3a="on"+evt;
nlp[_3a]=function(a,b){
return this.connect(_3a,a,b);
};
});
})();
}
