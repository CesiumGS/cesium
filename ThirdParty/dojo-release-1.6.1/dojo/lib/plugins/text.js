/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


define(["dojo","dojo/cache"],function(_1){
var _2={},_3=function(_4,_5,_6){
_2[_4]=_6;
_1.cache({toString:function(){
return _5;
}},_6);
},_7=function(_8){
if(_8){
_8=_8.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,"");
var _9=_8.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
if(_9){
_8=_9[1];
}
}else{
_8="";
}
return _8;
};
return {load:function(id,_a,_b){
var _c,_d,_e,_f=id.split("!");
if(_a.toAbsMid){
_c=_f[0].match(/(.+)(\.[^\/]*)$/);
_d=_c?_a.toAbsMid(_c[1])+_c[2]:_a.toAbsMid(_f[0]);
if(_d in _2){
_b(_f[1]=="strip"?_7(_2[_d]):_2[_d]);
return;
}
}
_e=_a.toUrl(_f[0]);
_1.xhrGet({url:_e,load:function(_10){
_d&&_3(_d,_e,_10);
_b(_f[1]=="strip"?_7(_10):_10);
}});
},cache:function(_11,mid,_12,_13){
_3(_11,require.nameToUrl(mid)+_12,_13);
}};
});
