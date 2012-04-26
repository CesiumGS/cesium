/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.httpParse"]){
dojo._hasResource["dojox.io.httpParse"]=true;
dojo.provide("dojox.io.httpParse");
dojox.io.httpParse=function(_1,_2,_3){
var _4=[];
var _5=_1.length;
do{
var _6={};
var _7=_1.match(/(\n*[^\n]+)/);
if(!_7){
return null;
}
_1=_1.substring(_7[0].length+1);
_7=_7[1];
var _8=_1.match(/([^\n]+\n)*/)[0];
_1=_1.substring(_8.length);
var _9=_1.substring(0,1);
_1=_1.substring(1);
_8=(_2||"")+_8;
var _a=_8;
_8=_8.match(/[^:\n]+:[^\n]+\n/g);
for(var j=0;j<_8.length;j++){
var _b=_8[j].indexOf(":");
_6[_8[j].substring(0,_b)]=_8[j].substring(_b+1).replace(/(^[ \r\n]*)|([ \r\n]*)$/g,"");
}
_7=_7.split(" ");
var _c={status:parseInt(_7[1],10),statusText:_7[2],readyState:3,getAllResponseHeaders:function(){
return _a;
},getResponseHeader:function(_d){
return _6[_d];
}};
var _e=_6["Content-Length"];
var _f;
if(_e){
if(_e<=_1.length){
_f=_1.substring(0,_e);
}else{
return _4;
}
}else{
if((_f=_1.match(/(.*)HTTP\/\d\.\d \d\d\d[\w\s]*\n/))){
_f=_f[0];
}else{
if(!_3||_9=="\n"){
_f=_1;
}else{
return _4;
}
}
}
_4.push(_c);
_1=_1.substring(_f.length);
_c.responseText=_f;
_c.readyState=4;
_c._lastIndex=_5-_1.length;
}while(_1);
return _4;
};
}
