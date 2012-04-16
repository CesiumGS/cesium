/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.regexp"]){
dojo._hasResource["dojo.regexp"]=true;
dojo.provide("dojo.regexp");
dojo.getObject("regexp",true,dojo);
dojo.regexp.escapeString=function(_1,_2){
return _1.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g,function(ch){
if(_2&&_2.indexOf(ch)!=-1){
return ch;
}
return "\\"+ch;
});
};
dojo.regexp.buildGroupRE=function(_3,re,_4){
if(!(_3 instanceof Array)){
return re(_3);
}
var b=[];
for(var i=0;i<_3.length;i++){
b.push(re(_3[i]));
}
return dojo.regexp.group(b.join("|"),_4);
};
dojo.regexp.group=function(_5,_6){
return "("+(_6?"?:":"")+_5+")";
};
}
