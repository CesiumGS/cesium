/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.string"]){
dojo._hasResource["dojo.string"]=true;
dojo.provide("dojo.string");
dojo.getObject("string",true,dojo);
dojo.string.rep=function(_1,_2){
if(_2<=0||!_1){
return "";
}
var _3=[];
for(;;){
if(_2&1){
_3.push(_1);
}
if(!(_2>>=1)){
break;
}
_1+=_1;
}
return _3.join("");
};
dojo.string.pad=function(_4,_5,ch,_6){
if(!ch){
ch="0";
}
var _7=String(_4),_8=dojo.string.rep(ch,Math.ceil((_5-_7.length)/ch.length));
return _6?_7+_8:_8+_7;
};
dojo.string.substitute=function(_9,_a,_b,_c){
_c=_c||dojo.global;
_b=_b?dojo.hitch(_c,_b):function(v){
return v;
};
return _9.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,function(_d,_e,_f){
var _10=dojo.getObject(_e,false,_a);
if(_f){
_10=dojo.getObject(_f,false,_c).call(_c,_10,_e);
}
return _b(_10,_e).toString();
});
};
dojo.string.trim=String.prototype.trim?dojo.trim:function(str){
str=str.replace(/^\s+/,"");
for(var i=str.length-1;i>=0;i--){
if(/\S/.test(str.charAt(i))){
str=str.substring(0,i+1);
break;
}
}
return str;
};
}
