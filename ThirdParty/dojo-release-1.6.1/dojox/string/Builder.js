/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.string.Builder"]){
dojo._hasResource["dojox.string.Builder"]=true;
dojo.provide("dojox.string.Builder");
dojox.string.Builder=function(_1){
var b="";
this.length=0;
this.append=function(s){
if(arguments.length>1){
var _2="",l=arguments.length;
switch(l){
case 9:
_2=""+arguments[8]+_2;
case 8:
_2=""+arguments[7]+_2;
case 7:
_2=""+arguments[6]+_2;
case 6:
_2=""+arguments[5]+_2;
case 5:
_2=""+arguments[4]+_2;
case 4:
_2=""+arguments[3]+_2;
case 3:
_2=""+arguments[2]+_2;
case 2:
b+=""+arguments[0]+arguments[1]+_2;
break;
default:
var i=0;
while(i<arguments.length){
_2+=arguments[i++];
}
b+=_2;
}
}else{
b+=s;
}
this.length=b.length;
return this;
};
this.concat=function(s){
return this.append.apply(this,arguments);
};
this.appendArray=function(_3){
return this.append.apply(this,_3);
};
this.clear=function(){
b="";
this.length=0;
return this;
};
this.replace=function(_4,_5){
b=b.replace(_4,_5);
this.length=b.length;
return this;
};
this.remove=function(_6,_7){
if(_7===undefined){
_7=b.length;
}
if(_7==0){
return this;
}
b=b.substr(0,_6)+b.substr(_6+_7);
this.length=b.length;
return this;
};
this.insert=function(_8,_9){
if(_8==0){
b=_9+b;
}else{
b=b.slice(0,_8)+_9+b.slice(_8);
}
this.length=b.length;
return this;
};
this.toString=function(){
return b;
};
if(_1){
this.append(_1);
}
};
}
