/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.filter.misc"]){
dojo._hasResource["dojox.dtl.filter.misc"]=true;
dojo.provide("dojox.dtl.filter.misc");
dojo.mixin(dojox.dtl.filter.misc,{filesizeformat:function(_1){
_1=parseFloat(_1);
if(_1<1024){
return (_1==1)?_1+" byte":_1+" bytes";
}else{
if(_1<1024*1024){
return (_1/1024).toFixed(1)+" KB";
}else{
if(_1<1024*1024*1024){
return (_1/1024/1024).toFixed(1)+" MB";
}
}
}
return (_1/1024/1024/1024).toFixed(1)+" GB";
},pluralize:function(_2,_3){
_3=_3||"s";
if(_3.indexOf(",")==-1){
_3=","+_3;
}
var _4=_3.split(",");
if(_4.length>2){
return "";
}
var _5=_4[0];
var _6=_4[1];
if(parseInt(_2,10)!=1){
return _6;
}
return _5;
},_phone2numeric:{a:2,b:2,c:2,d:3,e:3,f:3,g:4,h:4,i:4,j:5,k:5,l:5,m:6,n:6,o:6,p:7,r:7,s:7,t:8,u:8,v:8,w:9,x:9,y:9},phone2numeric:function(_7){
var dm=dojox.dtl.filter.misc;
_7=_7+"";
var _8="";
for(var i=0;i<_7.length;i++){
var _9=_7.charAt(i).toLowerCase();
(dm._phone2numeric[_9])?_8+=dm._phone2numeric[_9]:_8+=_7.charAt(i);
}
return _8;
},pprint:function(_a){
return dojo.toJson(_a);
}});
}
