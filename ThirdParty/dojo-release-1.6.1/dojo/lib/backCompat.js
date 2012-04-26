/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


define(["require","dojo/_base/_loader/bootstrap"],function(_1,_2){
var _3=["_moduleHasPrefix","_loadPath","_loadUri","_loadUriAndCheck","loaded","_callLoaded","_getModuleSymbols","_loadModule","require","provide","platformRequire","requireIf","requireAfterIf","registerModulePath"],i,_4;
for(i=0;i<_3.length;){
_4=_3[i++];
_2[_4]=(function(_5){
return function(){
console.warn("dojo."+_5+" not available when using an AMD loader.");
};
})(_4);
}
var _6=function(_7){
var _8=[],i;
for(i=0;i<_7.length;){
_8.push(_7[i++]);
}
return _8;
},_9=function(_a,_b){
if(_b){
return (typeof _b=="string")?function(){
_a[_b]();
}:function(){
_b.call(_a);
};
}else{
return _a;
}
};
_2.ready=_2.addOnLoad=function(_c,_d){
_1.ready(_d?_9(_c,_d):_c);
};
_2.addOnLoad(function(){
_2.postLoad=_2.config.afterOnLoad=true;
});
var _e=_2.config.addOnLoad;
if(_e){
_2.addOnLoad[(_e instanceof Array?"apply":"call")](_2,_e);
}
var _f=_2._loaders=[],_10=function(){
var _11=_f.slice(0);
Array.prototype.splice.apply(_f,[0,_f.length]);
while(_11.length){
_11.shift().call();
}
};
_f.unshift=function(){
Array.prototype.unshift.apply(_f,_6(arguments));
_1.ready(_10);
};
_f.splice=function(){
Array.prototype.splice.apply(_f,_6(arguments));
_1.ready(_10);
};
var _12=_2._unloaders=[];
_2.unloaded=function(){
while(_12.length){
_12.pop().call();
}
};
_2._onto=function(arr,obj,fn){
arr.push(fn?_9(obj,fn):obj);
};
_2._modulesLoaded=function(){
};
_2.loadInit=function(_13){
_13();
};
var _14=function(_15){
return _15.replace(/\./g,"/");
};
_2.getL10nName=function(_16,_17,_18){
_18=_18?_18.toLowerCase():_2.locale;
_16="i18n!"+_14(_16);
return (/root/i.test(_18))?(_16+"/nls/"+_17):(_16+"/nls/"+_18+"/"+_17);
};
_2.requireLocalization=function(_19,_1a,_1b){
if(_1.vendor!="altoviso.com"){
_1b=!_1b||_1b.toLowerCase()===_2.locale?"root":_1b;
}
return _1(_2.getL10nName(_19,_1a,_1b));
};
_2.i18n={getLocalization:_2.requireLocalization,normalizeLocale:function(_1c){
var _1d=_1c?_1c.toLowerCase():_2.locale;
if(_1d=="root"){
_1d="ROOT";
}
return _1d;
}};
var ore=new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),ire=new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$");
_2._Url=function(){
var n=null,_1e=arguments,uri=[_1e[0]];
for(var i=1;i<_1e.length;i++){
if(!_1e[i]){
continue;
}
var _1f=new _2._Url(_1e[i]+""),_20=new _2._Url(uri[0]+"");
if(_1f.path==""&&!_1f.scheme&&!_1f.authority&&!_1f.query){
if(_1f.fragment!=n){
_20.fragment=_1f.fragment;
}
_1f=_20;
}else{
if(!_1f.scheme){
_1f.scheme=_20.scheme;
if(!_1f.authority){
_1f.authority=_20.authority;
if(_1f.path.charAt(0)!="/"){
var _21=_20.path.substring(0,_20.path.lastIndexOf("/")+1)+_1f.path;
var _22=_21.split("/");
for(var j=0;j<_22.length;j++){
if(_22[j]=="."){
if(j==_22.length-1){
_22[j]="";
}else{
_22.splice(j,1);
j--;
}
}else{
if(j>0&&!(j==1&&_22[0]=="")&&_22[j]==".."&&_22[j-1]!=".."){
if(j==(_22.length-1)){
_22.splice(j,1);
_22[j-1]="";
}else{
_22.splice(j-1,2);
j-=2;
}
}
}
}
_1f.path=_22.join("/");
}
}
}
}
uri=[];
if(_1f.scheme){
uri.push(_1f.scheme,":");
}
if(_1f.authority){
uri.push("//",_1f.authority);
}
uri.push(_1f.path);
if(_1f.query){
uri.push("?",_1f.query);
}
if(_1f.fragment){
uri.push("#",_1f.fragment);
}
}
this.uri=uri.join("");
var r=this.uri.match(ore);
this.scheme=r[2]||(r[1]?"":n);
this.authority=r[4]||(r[3]?"":n);
this.path=r[5];
this.query=r[7]||(r[6]?"":n);
this.fragment=r[9]||(r[8]?"":n);
if(this.authority!=n){
r=this.authority.match(ire);
this.user=r[3]||n;
this.password=r[4]||n;
this.host=r[6]||r[7];
this.port=r[9]||n;
}
};
_2._Url.prototype.toString=function(){
return this.uri;
};
_2.moduleUrl=function(_23,url){
if(!_23){
return null;
}
_23=_14(_23)+(url?("/"+url):"");
var _24="",_25=_23.match(/(.+)(\.[^\/]*)$/);
if(_25){
_23=_25[1];
_24=_25[2];
}
return new _2._Url(_1.nameToUrl(_23,_24));
};
return _2;
});
