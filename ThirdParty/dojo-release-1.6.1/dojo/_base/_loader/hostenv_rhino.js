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
dojo.locale=dojo.locale||String(java.util.Locale.getDefault().toString().replace("_","-").toLowerCase());
dojo._name="rhino";
dojo.isRhino=true;
if(typeof print=="function"){
console.debug=print;
}
if(!("byId" in dojo)){
dojo.byId=function(id,_1){
if(id&&(typeof id=="string"||id instanceof String)){
if(!_1){
_1=document;
}
return _1.getElementById(id);
}
return id;
};
}
dojo._isLocalUrl=function(_2){
var _3=(new java.io.File(_2)).exists();
if(!_3){
var _4;
try{
_4=(new java.net.URL(_2)).openStream();
_4.close();
}
finally{
if(_4&&_4.close){
_4.close();
}
}
}
return _3;
};
dojo._loadUri=function(_5,cb){
if(dojo._loadedUrls[_5]){
return true;
}
try{
var _6;
try{
_6=dojo._isLocalUrl(_5);
}
catch(e){
return false;
}
dojo._loadedUrls[_5]=true;
if(cb){
var _7=(_6?readText:readUri)(_5,"UTF-8");
if(!eval("'‏'").length){
_7=String(_7).replace(/[\u200E\u200F\u202A-\u202E]/g,function(_8){
return "\\u"+_8.charCodeAt(0).toString(16);
});
}
_7=/^define\(/.test(_7)?_7:"("+_7+")";
cb(eval(_7));
}else{
load(_5);
}
dojo._loadedUrls.push(_5);
return true;
}
catch(e){
dojo._loadedUrls[_5]=false;
return false;
}
};
dojo.exit=function(_9){
quit(_9);
};
function readText(_a,_b){
_b=_b||"utf-8";
var jf=new java.io.File(_a);
var is=new java.io.FileInputStream(jf);
return dj_readInputStream(is,_b);
};
function readUri(_c,_d){
var _e=(new java.net.URL(_c)).openConnection();
_d=_d||_e.getContentEncoding()||"utf-8";
var is=_e.getInputStream();
return dj_readInputStream(is,_d);
};
function dj_readInputStream(is,_f){
var _10=new java.io.BufferedReader(new java.io.InputStreamReader(is,_f));
try{
var sb=new java.lang.StringBuffer();
var _11="";
while((_11=_10.readLine())!==null){
sb.append(_11);
sb.append(java.lang.System.getProperty("line.separator"));
}
return sb.toString();
}
finally{
_10.close();
}
};
dojo._getText=function(uri,_12){
try{
var _13=dojo._isLocalUrl(uri);
var _14=(_13?readText:readUri)(uri,"UTF-8");
if(_14!==null){
_14+="";
}
return _14;
}
catch(e){
if(_12){
return null;
}else{
throw e;
}
}
};
dojo.doc=typeof document!="undefined"?document:null;
dojo.body=function(){
return document.body;
};
if(typeof setTimeout=="undefined"||typeof clearTimeout=="undefined"){
dojo._timeouts=[];
clearTimeout=function(idx){
if(!dojo._timeouts[idx]){
return;
}
dojo._timeouts[idx].stop();
};
setTimeout=function(_15,_16){
var def={sleepTime:_16,hasSlept:false,run:function(){
if(!this.hasSlept){
this.hasSlept=true;
java.lang.Thread.currentThread().sleep(this.sleepTime);
}
try{
_15();
}
catch(e){
}
}};
var _17=new java.lang.Runnable(def);
var _18=new java.lang.Thread(_17);
_18.start();
return dojo._timeouts.push(_18)-1;
};
}
if(dojo.config["modulePaths"]){
for(var param in dojo.config["modulePaths"]){
dojo.registerModulePath(param,dojo.config["modulePaths"][param]);
}
}
