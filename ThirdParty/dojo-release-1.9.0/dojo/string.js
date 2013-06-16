/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/string",["./_base/kernel","./_base/lang"],function(_1,_2){
var _3={};
_2.setObject("dojo.string",_3);
_3.rep=function(_4,_5){
if(_5<=0||!_4){
return "";
}
var _6=[];
for(;;){
if(_5&1){
_6.push(_4);
}
if(!(_5>>=1)){
break;
}
_4+=_4;
}
return _6.join("");
};
_3.pad=function(_7,_8,ch,_9){
if(!ch){
ch="0";
}
var _a=String(_7),_b=_3.rep(ch,Math.ceil((_8-_a.length)/ch.length));
return _9?_a+_b:_b+_a;
};
_3.substitute=function(_c,_d,_e,_f){
_f=_f||_1.global;
_e=_e?_2.hitch(_f,_e):function(v){
return v;
};
return _c.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,function(_10,key,_11){
var _12=_2.getObject(key,false,_d);
if(_11){
_12=_2.getObject(_11,false,_f).call(_f,_12,key);
}
return _e(_12,key).toString();
});
};
_3.trim=String.prototype.trim?_2.trim:function(str){
str=str.replace(/^\s+/,"");
for(var i=str.length-1;i>=0;i--){
if(/\S/.test(str.charAt(i))){
str=str.substring(0,i+1);
break;
}
}
return str;
};
return _3;
});
