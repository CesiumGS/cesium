/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/handlers",["../json","../_base/kernel","../_base/array","../has","../selector/_loader"],function(_1,_2,_3,_4){
_4.add("activex",typeof ActiveXObject!=="undefined");
_4.add("dom-parser",function(_5){
return "DOMParser" in _5;
});
var _6;
if(_4("activex")){
var dp=["Msxml2.DOMDocument.6.0","Msxml2.DOMDocument.4.0","MSXML2.DOMDocument.3.0","MSXML.DOMDocument"];
_6=function(_7){
var _8=_7.data;
if(_8&&_4("dom-qsa2.1")&&!_8.querySelectorAll&&_4("dom-parser")){
_8=new DOMParser().parseFromString(_7.text,"application/xml");
}
if(!_8||!_8.documentElement){
var _9=_7.text;
_3.some(dp,function(p){
try{
var _a=new ActiveXObject(p);
_a.async=false;
_a.loadXML(_9);
_8=_a;
}
catch(e){
return false;
}
return true;
});
}
return _8;
};
}
var _b={"javascript":function(_c){
return _2.eval(_c.text||"");
},"json":function(_d){
return _1.parse(_d.text||null);
},"xml":_6};
function _e(_f){
var _10=_b[_f.options.handleAs];
_f.data=_10?_10(_f):(_f.data||_f.text);
return _f;
};
_e.register=function(_11,_12){
_b[_11]=_12;
};
return _e;
});
