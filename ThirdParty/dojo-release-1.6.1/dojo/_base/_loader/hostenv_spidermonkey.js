/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(dojo.config["baseUrl"]){
dojo.baseUrl=dojo.config["baseUrl"];
}else{
dojo.baseUrl="./";
}
dojo._name="spidermonkey";
dojo.isSpidermonkey=true;
dojo.exit=function(_1){
quit(_1);
};
if(typeof print=="function"){
console.debug=print;
}
if(typeof line2pc=="undefined"){
throw new Error("attempt to use SpiderMonkey host environment when no 'line2pc' global");
}
dojo._spidermonkeyCurrentFile=function(_2){
var s="";
try{
throw Error("whatever");
}
catch(e){
s=e.stack;
}
var _3=s.match(/[^@]*\.js/gi);
if(!_3){
throw Error("could not parse stack string: '"+s+"'");
}
var _4=(typeof _2!="undefined"&&_2)?_3[_2+1]:_3[_3.length-1];
if(!_4){
throw Error("could not find file name in stack string '"+s+"'");
}
return _4;
};
dojo._loadUri=function(_5){
var ok=load(_5);
return 1;
};
if(dojo.config["modulePaths"]){
for(var param in dojo.config["modulePaths"]){
dojo.registerModulePath(param,dojo.config["modulePaths"][param]);
}
}
