/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.filter.lists"]){
dojo._hasResource["dojox.dtl.filter.lists"]=true;
dojo.provide("dojox.dtl.filter.lists");
dojo.require("dojox.dtl._base");
dojo.mixin(dojox.dtl.filter.lists,{_dictsort:function(a,b){
if(a[0]==b[0]){
return 0;
}
return (a[0]<b[0])?-1:1;
},dictsort:function(_1,_2){
if(!_2){
return _1;
}
var i,_3,_4=[];
if(!dojo.isArray(_1)){
var _5=_1,_1=[];
for(var _6 in _5){
_1.push(_5[_6]);
}
}
for(i=0;i<_1.length;i++){
_4.push([new dojox.dtl._Filter("var."+_2).resolve(new dojox.dtl._Context({"var":_1[i]})),_1[i]]);
}
_4.sort(dojox.dtl.filter.lists._dictsort);
var _7=[];
for(i=0;_3=_4[i];i++){
_7.push(_3[1]);
}
return _7;
},dictsortreversed:function(_8,_9){
if(!_9){
return _8;
}
var _a=dojox.dtl.filter.lists.dictsort(_8,_9);
return _a.reverse();
},first:function(_b){
return (_b.length)?_b[0]:"";
},join:function(_c,_d){
return _c.join(_d||",");
},length:function(_e){
return (isNaN(_e.length))?(_e+"").length:_e.length;
},length_is:function(_f,arg){
return _f.length==parseInt(arg);
},random:function(_10){
return _10[Math.floor(Math.random()*_10.length)];
},slice:function(_11,arg){
arg=arg||"";
var _12=arg.split(":");
var _13=[];
for(var i=0;i<_12.length;i++){
if(!_12[i].length){
_13.push(null);
}else{
_13.push(parseInt(_12[i]));
}
}
if(_13[0]===null){
_13[0]=0;
}
if(_13[0]<0){
_13[0]=_11.length+_13[0];
}
if(_13.length<2||_13[1]===null){
_13[1]=_11.length;
}
if(_13[1]<0){
_13[1]=_11.length+_13[1];
}
return _11.slice(_13[0],_13[1]);
},_unordered_list:function(_14,_15){
var ddl=dojox.dtl.filter.lists;
var i,_16="";
for(i=0;i<_15;i++){
_16+="\t";
}
if(_14[1]&&_14[1].length){
var _17=[];
for(i=0;i<_14[1].length;i++){
_17.push(ddl._unordered_list(_14[1][i],_15+1));
}
return _16+"<li>"+_14[0]+"\n"+_16+"<ul>\n"+_17.join("\n")+"\n"+_16+"</ul>\n"+_16+"</li>";
}else{
return _16+"<li>"+_14[0]+"</li>";
}
},unordered_list:function(_18){
return dojox.dtl.filter.lists._unordered_list(_18,1);
}});
}
