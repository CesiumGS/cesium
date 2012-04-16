/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.foo"]){
dojo._hasResource["dojo.foo"]=true;
(function(){
var d=dojo,_1;
d.mixin(d,{_loadedModules:{},_inFlightCount:0,_hasResource:{},_modulePrefixes:{dojo:{name:"dojo",value:"."},doh:{name:"doh",value:"../util/doh"},tests:{name:"tests",value:"tests"}},_moduleHasPrefix:function(_2){
var mp=d._modulePrefixes;
return !!(mp[_2]&&mp[_2].value);
},_getModulePrefix:function(_3){
var mp=d._modulePrefixes;
if(d._moduleHasPrefix(_3)){
return mp[_3].value;
}
return _3;
},_loadedUrls:[],_postLoad:false,_loaders:[],_unloaders:[],_loadNotifying:false});
dojo._loadPath=function(_4,_5,cb){
var _6=((_4.charAt(0)=="/"||_4.match(/^\w+:/))?"":d.baseUrl)+_4;
try{
_1=_5;
return !_5?d._loadUri(_6,cb):d._loadUriAndCheck(_6,_5,cb);
}
catch(e){
console.error(e);
return false;
}
finally{
_1=null;
}
};
dojo._loadUri=function(_7,cb){
if(d._loadedUrls[_7]){
return true;
}
d._inFlightCount++;
var _8=d._getText(_7,true);
if(_8){
d._loadedUrls[_7]=true;
d._loadedUrls.push(_7);
if(cb){
_8=/^define\(/.test(_8)?_8:"("+_8+")";
}else{
_8=d._scopePrefix+_8+d._scopeSuffix;
}
if(!d.isIE){
_8+="\r\n//@ sourceURL="+_7;
}
var _9=d["eval"](_8);
if(cb){
cb(_9);
}
}
if(--d._inFlightCount==0&&d._postLoad&&d._loaders.length){
setTimeout(function(){
if(d._inFlightCount==0){
d._callLoaded();
}
},0);
}
return !!_8;
};
dojo._loadUriAndCheck=function(_a,_b,cb){
var ok=false;
try{
ok=d._loadUri(_a,cb);
}
catch(e){
console.error("failed loading "+_a+" with error: "+e);
}
return !!(ok&&d._loadedModules[_b]);
};
dojo.loaded=function(){
d._loadNotifying=true;
d._postLoad=true;
var _c=d._loaders;
d._loaders=[];
for(var x=0;x<_c.length;x++){
_c[x]();
}
d._loadNotifying=false;
if(d._postLoad&&d._inFlightCount==0&&_c.length){
d._callLoaded();
}
};
dojo.unloaded=function(){
var _d=d._unloaders;
while(_d.length){
(_d.pop())();
}
};
d._onto=function(_e,_f,fn){
if(!fn){
_e.push(_f);
}else{
if(fn){
var _10=(typeof fn=="string")?_f[fn]:fn;
_e.push(function(){
_10.call(_f);
});
}
}
};
dojo.ready=dojo.addOnLoad=function(obj,_11){
d._onto(d._loaders,obj,_11);
if(d._postLoad&&d._inFlightCount==0&&!d._loadNotifying){
d._callLoaded();
}
};
var dca=d.config.addOnLoad;
if(dca){
d.addOnLoad[(dca instanceof Array?"apply":"call")](d,dca);
}
dojo._modulesLoaded=function(){
if(d._postLoad){
return;
}
if(d._inFlightCount>0){
console.warn("files still in flight!");
return;
}
d._callLoaded();
};
dojo._callLoaded=function(){
if(typeof setTimeout=="object"||(d.config.useXDomain&&d.isOpera)){
setTimeout(d.isAIR?function(){
d.loaded();
}:d._scopeName+".loaded();",0);
}else{
d.loaded();
}
};
dojo._getModuleSymbols=function(_12){
var _13=_12.split(".");
for(var i=_13.length;i>0;i--){
var _14=_13.slice(0,i).join(".");
if(i==1&&!d._moduleHasPrefix(_14)){
_13[0]="../"+_13[0];
}else{
var _15=d._getModulePrefix(_14);
if(_15!=_14){
_13.splice(0,i,_15);
break;
}
}
}
return _13;
};
dojo._global_omit_module_check=false;
dojo.loadInit=function(_16){
_16();
};
dojo._loadModule=dojo.require=function(_17,_18){
_18=d._global_omit_module_check||_18;
var _19=d._loadedModules[_17];
if(_19){
return _19;
}
var _1a=d._getModuleSymbols(_17).join("/")+".js";
var _1b=!_18?_17:null;
var ok=d._loadPath(_1a,_1b);
if(!ok&&!_18){
throw new Error("Could not load '"+_17+"'; last tried '"+_1a+"'");
}
if(!_18&&!d._isXDomain){
_19=d._loadedModules[_17];
if(!_19){
throw new Error("symbol '"+_17+"' is not defined after loading '"+_1a+"'");
}
}
return _19;
};
dojo.provide=function(_1c){
_1c=_1c+"";
return (d._loadedModules[_1c]=d.getObject(_1c,true));
};
dojo.platformRequire=function(_1d){
var _1e=_1d.common||[];
var _1f=_1e.concat(_1d[d._name]||_1d["default"]||[]);
for(var x=0;x<_1f.length;x++){
var _20=_1f[x];
if(_20.constructor==Array){
d._loadModule.apply(d,_20);
}else{
d._loadModule(_20);
}
}
};
dojo.requireIf=function(_21,_22){
if(_21===true){
var _23=[];
for(var i=1;i<arguments.length;i++){
_23.push(arguments[i]);
}
d.require.apply(d,_23);
}
};
dojo.requireAfterIf=d.requireIf;
dojo.registerModulePath=function(_24,_25){
d._modulePrefixes[_24]={name:_24,value:_25};
};
dojo.requireLocalization=function(_26,_27,_28,_29){
d.require("dojo.i18n");
d.i18n._requireLocalization.apply(d.hostenv,arguments);
};
var ore=new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),ire=new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$");
dojo._Url=function(){
var n=null,_2a=arguments,uri=[_2a[0]];
for(var i=1;i<_2a.length;i++){
if(!_2a[i]){
continue;
}
var _2b=new d._Url(_2a[i]+""),_2c=new d._Url(uri[0]+"");
if(_2b.path==""&&!_2b.scheme&&!_2b.authority&&!_2b.query){
if(_2b.fragment!=n){
_2c.fragment=_2b.fragment;
}
_2b=_2c;
}else{
if(!_2b.scheme){
_2b.scheme=_2c.scheme;
if(!_2b.authority){
_2b.authority=_2c.authority;
if(_2b.path.charAt(0)!="/"){
var _2d=_2c.path.substring(0,_2c.path.lastIndexOf("/")+1)+_2b.path;
var _2e=_2d.split("/");
for(var j=0;j<_2e.length;j++){
if(_2e[j]=="."){
if(j==_2e.length-1){
_2e[j]="";
}else{
_2e.splice(j,1);
j--;
}
}else{
if(j>0&&!(j==1&&_2e[0]=="")&&_2e[j]==".."&&_2e[j-1]!=".."){
if(j==(_2e.length-1)){
_2e.splice(j,1);
_2e[j-1]="";
}else{
_2e.splice(j-1,2);
j-=2;
}
}
}
}
_2b.path=_2e.join("/");
}
}
}
}
uri=[];
if(_2b.scheme){
uri.push(_2b.scheme,":");
}
if(_2b.authority){
uri.push("//",_2b.authority);
}
uri.push(_2b.path);
if(_2b.query){
uri.push("?",_2b.query);
}
if(_2b.fragment){
uri.push("#",_2b.fragment);
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
dojo._Url.prototype.toString=function(){
return this.uri;
};
dojo.moduleUrl=function(_2f,url){
var loc=d._getModuleSymbols(_2f).join("/");
if(!loc){
return null;
}
if(loc.lastIndexOf("/")!=loc.length-1){
loc+="/";
}
var _30=loc.indexOf(":");
if(loc.charAt(0)!="/"&&(_30==-1||_30>loc.indexOf("/"))){
loc=d.baseUrl+loc;
}
return new d._Url(loc,url);
};
})();
}
