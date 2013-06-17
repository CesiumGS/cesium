/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/regexp",["./_base/kernel","./_base/lang"],function(_1,_2){
var _3={};
_2.setObject("dojo.regexp",_3);
_3.escapeString=function(_4,_5){
return _4.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g,function(ch){
if(_5&&_5.indexOf(ch)!=-1){
return ch;
}
return "\\"+ch;
});
};
_3.buildGroupRE=function(_6,re,_7){
if(!(_6 instanceof Array)){
return re(_6);
}
var b=[];
for(var i=0;i<_6.length;i++){
b.push(re(_6[i]));
}
return _3.group(b.join("|"),_7);
};
_3.group=function(_8,_9){
return "("+(_9?"?:":"")+_8+")";
};
return _3;
});
