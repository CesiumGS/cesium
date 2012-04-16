/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.data.util.filter"]){
dojo._hasResource["dojo.data.util.filter"]=true;
dojo.provide("dojo.data.util.filter");
dojo.getObject("data.util.filter",true,dojo);
dojo.data.util.filter.patternToRegExp=function(_1,_2){
var _3="^";
var c=null;
for(var i=0;i<_1.length;i++){
c=_1.charAt(i);
switch(c){
case "\\":
_3+=c;
i++;
_3+=_1.charAt(i);
break;
case "*":
_3+=".*";
break;
case "?":
_3+=".";
break;
case "$":
case "^":
case "/":
case "+":
case ".":
case "|":
case "(":
case ")":
case "{":
case "}":
case "[":
case "]":
_3+="\\";
default:
_3+=c;
}
}
_3+="$";
if(_2){
return new RegExp(_3,"mi");
}else{
return new RegExp(_3,"m");
}
};
}
