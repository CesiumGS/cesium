/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/kernel",["../has","./config","require","module"],function(_1,_2,_3,_4){
var i,p,_5={},_6={},_7={config:_2,global:this,dijit:_5,dojox:_6};
var _8={dojo:["dojo",_7],dijit:["dijit",_5],dojox:["dojox",_6]},_9=(_3.map&&_3.map[_4.id.match(/[^\/]+/)[0]]),_a;
for(p in _9){
if(_8[p]){
_8[p][0]=_9[p];
}else{
_8[p]=[_9[p],{}];
}
}
for(p in _8){
_a=_8[p];
_a[1]._scopeName=_a[0];
if(!_2.noGlobals){
this[_a[0]]=_a[1];
}
}
_7.scopeMap=_8;
_7.baseUrl=_7.config.baseUrl=_3.baseUrl;
_7.isAsync=!1||_3.async;
_7.locale=_2.locale;
var _b="$Rev: 31379 $".match(/\d+/);
_7.version={major:1,minor:9,patch:0,flag:"",revision:_b?+_b[0]:NaN,toString:function(){
var v=_7.version;
return v.major+"."+v.minor+"."+v.patch+v.flag+" ("+v.revision+")";
}};
1||_1.add("extend-dojo",1);
(Function("d","d.eval = function(){return d.global.eval ? d.global.eval(arguments[0]) : eval(arguments[0]);}"))(_7);
if(0){
_7.exit=function(_c){
quit(_c);
};
}else{
_7.exit=function(){
};
}
1||_1.add("dojo-guarantee-console",1);
if(1){
typeof console!="undefined"||(console={});
var cn=["assert","count","debug","dir","dirxml","error","group","groupEnd","info","profile","profileEnd","time","timeEnd","trace","warn","log"];
var tn;
i=0;
while((tn=cn[i++])){
if(!console[tn]){
(function(){
var _d=tn+"";
console[_d]=("log" in console)?function(){
var a=Array.apply({},arguments);
a.unshift(_d+":");
console["log"](a.join(" "));
}:function(){
};
console[_d]._fake=true;
})();
}
}
}
_1.add("dojo-debug-messages",!!_2.isDebug);
_7.deprecated=_7.experimental=function(){
};
if(_1("dojo-debug-messages")){
_7.deprecated=function(_e,_f,_10){
var _11="DEPRECATED: "+_e;
if(_f){
_11+=" "+_f;
}
if(_10){
_11+=" -- will be removed in version: "+_10;
}
console.warn(_11);
};
_7.experimental=function(_12,_13){
var _14="EXPERIMENTAL: "+_12+" -- APIs subject to change without notice.";
if(_13){
_14+=" "+_13;
}
console.warn(_14);
};
}
1||_1.add("dojo-modulePaths",1);
if(1){
if(_2.modulePaths){
_7.deprecated("dojo.modulePaths","use paths configuration");
var _15={};
for(p in _2.modulePaths){
_15[p.replace(/\./g,"/")]=_2.modulePaths[p];
}
_3({paths:_15});
}
}
1||_1.add("dojo-moduleUrl",1);
if(1){
_7.moduleUrl=function(_16,url){
_7.deprecated("dojo.moduleUrl()","use require.toUrl","2.0");
var _17=null;
if(_16){
_17=_3.toUrl(_16.replace(/\./g,"/")+(url?("/"+url):"")+"/*.*").replace(/\/\*\.\*/,"")+(url?"":"/");
}
return _17;
};
}
_7._hasResource={};
return _7;
});
