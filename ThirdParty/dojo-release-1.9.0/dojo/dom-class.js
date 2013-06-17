/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-class",["./_base/lang","./_base/array","./dom"],function(_1,_2,_3){
var _4="className";
var _5,_6=/\s+/,a1=[""];
function _7(s){
if(typeof s=="string"||s instanceof String){
if(s&&!_6.test(s)){
a1[0]=s;
return a1;
}
var a=s.split(_6);
if(a.length&&!a[0]){
a.shift();
}
if(a.length&&!a[a.length-1]){
a.pop();
}
return a;
}
if(!s){
return [];
}
return _2.filter(s,function(x){
return x;
});
};
var _8={};
_5={contains:function containsClass(_9,_a){
return ((" "+_3.byId(_9)[_4]+" ").indexOf(" "+_a+" ")>=0);
},add:function addClass(_b,_c){
_b=_3.byId(_b);
_c=_7(_c);
var _d=_b[_4],_e;
_d=_d?" "+_d+" ":" ";
_e=_d.length;
for(var i=0,_f=_c.length,c;i<_f;++i){
c=_c[i];
if(c&&_d.indexOf(" "+c+" ")<0){
_d+=c+" ";
}
}
if(_e<_d.length){
_b[_4]=_d.substr(1,_d.length-2);
}
},remove:function removeClass(_10,_11){
_10=_3.byId(_10);
var cls;
if(_11!==undefined){
_11=_7(_11);
cls=" "+_10[_4]+" ";
for(var i=0,len=_11.length;i<len;++i){
cls=cls.replace(" "+_11[i]+" "," ");
}
cls=_1.trim(cls);
}else{
cls="";
}
if(_10[_4]!=cls){
_10[_4]=cls;
}
},replace:function replaceClass(_12,_13,_14){
_12=_3.byId(_12);
_8[_4]=_12[_4];
_5.remove(_8,_14);
_5.add(_8,_13);
if(_12[_4]!==_8[_4]){
_12[_4]=_8[_4];
}
},toggle:function toggleClass(_15,_16,_17){
_15=_3.byId(_15);
if(_17===undefined){
_16=_7(_16);
for(var i=0,len=_16.length,c;i<len;++i){
c=_16[i];
_5[_5.contains(_15,c)?"remove":"add"](_15,c);
}
}else{
_5[_17?"add":"remove"](_15,_16);
}
return _17;
}};
return _5;
});
