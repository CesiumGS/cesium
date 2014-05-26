/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/util/filter",["../../_base/lang"],function(_1){
var _2={};
_1.setObject("dojo.data.util.filter",_2);
_2.patternToRegExp=function(_3,_4){
var _5="^";
var c=null;
for(var i=0;i<_3.length;i++){
c=_3.charAt(i);
switch(c){
case "\\":
_5+=c;
i++;
_5+=_3.charAt(i);
break;
case "*":
_5+=".*";
break;
case "?":
_5+=".";
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
_5+="\\";
default:
_5+=c;
}
}
_5+="$";
if(_4){
return new RegExp(_5,"mi");
}else{
return new RegExp(_5,"m");
}
};
return _2;
});
