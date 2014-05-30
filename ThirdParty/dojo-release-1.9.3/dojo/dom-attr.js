/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-attr",["exports","./sniff","./_base/lang","./dom","./dom-style","./dom-prop"],function(_1,_2,_3,_4,_5,_6){
var _7={innerHTML:1,className:1,htmlFor:_2("ie"),value:1},_8={classname:"class",htmlfor:"for",tabindex:"tabIndex",readonly:"readOnly"};
function _9(_a,_b){
var _c=_a.getAttributeNode&&_a.getAttributeNode(_b);
return _c&&_c.specified;
};
_1.has=function hasAttr(_d,_e){
var lc=_e.toLowerCase();
return _7[_6.names[lc]||_e]||_9(_4.byId(_d),_8[lc]||_e);
};
_1.get=function getAttr(_f,_10){
_f=_4.byId(_f);
var lc=_10.toLowerCase(),_11=_6.names[lc]||_10,_12=_7[_11],_13=_f[_11];
if(_12&&typeof _13!="undefined"){
return _13;
}
if(_11!="href"&&(typeof _13=="boolean"||_3.isFunction(_13))){
return _13;
}
var _14=_8[lc]||_10;
return _9(_f,_14)?_f.getAttribute(_14):null;
};
_1.set=function setAttr(_15,_16,_17){
_15=_4.byId(_15);
if(arguments.length==2){
for(var x in _16){
_1.set(_15,x,_16[x]);
}
return _15;
}
var lc=_16.toLowerCase(),_18=_6.names[lc]||_16,_19=_7[_18];
if(_18=="style"&&typeof _17!="string"){
_5.set(_15,_17);
return _15;
}
if(_19||typeof _17=="boolean"||_3.isFunction(_17)){
return _6.set(_15,_16,_17);
}
_15.setAttribute(_8[lc]||_16,_17);
return _15;
};
_1.remove=function removeAttr(_1a,_1b){
_4.byId(_1a).removeAttribute(_8[_1b.toLowerCase()]||_1b);
};
_1.getNodeProp=function getNodeProp(_1c,_1d){
_1c=_4.byId(_1c);
var lc=_1d.toLowerCase(),_1e=_6.names[lc]||_1d;
if((_1e in _1c)&&_1e!="href"){
return _1c[_1e];
}
var _1f=_8[lc]||_1d;
return _9(_1c,_1f)?_1c.getAttribute(_1f):null;
};
});
