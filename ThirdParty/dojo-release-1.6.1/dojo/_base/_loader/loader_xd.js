/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base._loader.loader_xd"]){
dojo._hasResource["dojo._base._loader.loader_xd"]=true;
dojo.provide("dojo._base._loader.loader_xd");
dojo._xdReset=function(){
dojo._isXDomain=dojo.config.useXDomain||false;
dojo._xdClearInterval();
dojo._xdInFlight={};
dojo._xdOrderedReqs=[];
dojo._xdDepMap={};
dojo._xdContents=[];
dojo._xdDefList=[];
};
dojo._xdClearInterval=function(){
if(dojo._xdTimer){
clearInterval(dojo._xdTimer);
dojo._xdTimer=0;
}
};
dojo._xdReset();
dojo._xdCreateResource=function(_1,_2,_3){
var _4=_1.replace(/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg,"");
var _5=[];
var _6=/dojo.(require|requireIf|provide|requireAfterIf|platformRequire|requireLocalization)\s*\(([\w\W]*?)\)/mg;
var _7;
while((_7=_6.exec(_4))!=null){
if(_7[1]=="requireLocalization"){
eval(_7[0]);
}else{
_5.push("\""+_7[1]+"\", "+_7[2]);
}
}
var _8=[];
_8.push(dojo._scopeName+"._xdResourceLoaded(function("+dojo._scopePrefixArgs+"){\n");
var _9=dojo._xdExtractLoadInits(_1);
if(_9){
_1=_9[0];
for(var i=1;i<_9.length;i++){
_8.push(_9[i]+";\n");
}
}
_8.push("return {");
if(_5.length>0){
_8.push("depends: [");
for(i=0;i<_5.length;i++){
if(i>0){
_8.push(",\n");
}
_8.push("["+_5[i]+"]");
}
_8.push("],");
}
_8.push("\ndefineResource: function("+dojo._scopePrefixArgs+"){");
if(!dojo.config["debugAtAllCosts"]||_2=="dojo._base._loader.loader_debug"){
_8.push(_1);
}
_8.push("\n}, resourceName: '"+_2+"', resourcePath: '"+_3+"'};});");
return _8.join("");
};
dojo._xdExtractLoadInits=function(_a){
var _b=/dojo.loadInit\s*\(/g;
_b.lastIndex=0;
var _c=/[\(\)]/g;
_c.lastIndex=0;
var _d=[];
var _e;
while((_e=_b.exec(_a))){
_c.lastIndex=_b.lastIndex;
var _f=1;
var _10;
while((_10=_c.exec(_a))){
if(_10[0]==")"){
_f-=1;
}else{
_f+=1;
}
if(_f==0){
break;
}
}
if(_f!=0){
throw "unmatched paren around character "+_c.lastIndex+" in: "+_a;
}
var _11=_b.lastIndex-_e[0].length;
_d.push(_a.substring(_11,_c.lastIndex));
var _12=_c.lastIndex-_11;
_a=_a.substring(0,_11)+_a.substring(_c.lastIndex,_a.length);
_b.lastIndex=_c.lastIndex-_12;
_b.lastIndex=_c.lastIndex;
}
if(_d.length>0){
_d.unshift(_a);
}
return (_d.length?_d:null);
};
dojo._xdIsXDomainPath=function(_13){
var _14=_13.indexOf(":");
var _15=_13.indexOf("/");
if(_14>0&&_14<_15||_13.indexOf("//")===0){
return true;
}else{
var url=dojo.baseUrl;
_14=url.indexOf(":");
_15=url.indexOf("/");
if(url.indexOf("//")===0||(_14>0&&_14<_15&&(!location.host||url.indexOf("http://"+location.host)!=0))){
return true;
}
}
return false;
};
dojo._loadPath=function(_16,_17,cb){
var _18=dojo._xdIsXDomainPath(_16);
dojo._isXDomain|=_18;
var uri=((_16.charAt(0)=="/"||_16.match(/^\w+:/))?"":dojo.baseUrl)+_16;
try{
return ((!_17||dojo._isXDomain)?dojo._loadUri(uri,cb,_18,_17):dojo._loadUriAndCheck(uri,_17,cb));
}
catch(e){
console.error(e);
return false;
}
};
dojo._xdCharSet="utf-8";
dojo._loadUri=function(uri,cb,_19,_1a){
if(dojo._loadedUrls[uri]){
return 1;
}
if(dojo._isXDomain&&_1a&&_1a!="dojo.i18n"){
dojo._xdOrderedReqs.push(_1a);
if(_19||uri.indexOf("/nls/")==-1){
dojo._xdInFlight[_1a]=true;
dojo._inFlightCount++;
}
if(!dojo._xdTimer){
if(dojo.isAIR){
dojo._xdTimer=setInterval(function(){
dojo._xdWatchInFlight();
},100);
}else{
dojo._xdTimer=setInterval(dojo._scopeName+"._xdWatchInFlight();",100);
}
}
dojo._xdStartTime=(new Date()).getTime();
}
if(_19){
var _1b=uri.lastIndexOf(".");
if(_1b<=0){
_1b=uri.length-1;
}
var _1c=uri.substring(0,_1b)+".xd";
if(_1b!=uri.length-1){
_1c+=uri.substring(_1b,uri.length);
}
if(dojo.isAIR){
_1c=_1c.replace("app:/","/");
}
var _1d=document.createElement("script");
_1d.type="text/javascript";
if(dojo._xdCharSet){
_1d.charset=dojo._xdCharSet;
}
_1d.src=_1c;
if(!dojo.headElement){
dojo._headElement=document.getElementsByTagName("head")[0];
if(!dojo._headElement){
dojo._headElement=document.getElementsByTagName("html")[0];
}
}
dojo._headElement.appendChild(_1d);
}else{
var _1e=dojo._getText(uri,null,true);
if(_1e==null){
return 0;
}
if(dojo._isXDomain&&uri.indexOf("/nls/")==-1&&_1a!="dojo.i18n"){
var res=dojo._xdCreateResource(_1e,_1a,uri);
dojo.eval(res);
}else{
if(cb){
_1e="("+_1e+")";
}else{
_1e=dojo._scopePrefix+_1e+dojo._scopeSuffix;
}
var _1f=dojo["eval"](_1e+"\r\n//@ sourceURL="+uri);
if(cb){
cb(_1f);
}
}
}
dojo._loadedUrls[uri]=true;
dojo._loadedUrls.push(uri);
return true;
};
dojo._xdResourceLoaded=function(res){
res=res.apply(dojo.global,dojo._scopeArgs);
var _20=res.depends;
var _21=null;
var _22=null;
var _23=[];
if(_20&&_20.length>0){
var dep=null;
var _24=0;
var _25=false;
for(var i=0;i<_20.length;i++){
dep=_20[i];
if(dep[0]=="provide"){
_23.push(dep[1]);
}else{
if(!_21){
_21=[];
}
if(!_22){
_22=[];
}
var _26=dojo._xdUnpackDependency(dep);
if(_26.requires){
_21=_21.concat(_26.requires);
}
if(_26.requiresAfter){
_22=_22.concat(_26.requiresAfter);
}
}
var _27=dep[0];
var _28=_27.split(".");
if(_28.length==2){
dojo[_28[0]][_28[1]].apply(dojo[_28[0]],dep.slice(1));
}else{
dojo[_27].apply(dojo,dep.slice(1));
}
}
if(_23.length==1&&_23[0]=="dojo._base._loader.loader_debug"){
res.defineResource(dojo);
}else{
var _29=dojo._xdContents.push({content:res.defineResource,resourceName:res["resourceName"],resourcePath:res["resourcePath"],isDefined:false})-1;
for(i=0;i<_23.length;i++){
dojo._xdDepMap[_23[i]]={requires:_21,requiresAfter:_22,contentIndex:_29};
}
}
for(i=0;i<_23.length;i++){
dojo._xdInFlight[_23[i]]=false;
}
}
};
dojo._xdLoadFlattenedBundle=function(_2a,_2b,_2c,_2d){
_2c=_2c||"root";
var _2e=dojo.i18n.normalizeLocale(_2c).replace("-","_");
var _2f=[_2a,"nls",_2b].join(".");
var _30=dojo["provide"](_2f);
_30[_2e]=_2d;
var _31=[_2a,_2e,_2b].join(".");
var _32=dojo._xdBundleMap[_31];
if(_32){
for(var _33 in _32){
_30[_33]=_2d;
}
}
};
dojo._xdInitExtraLocales=function(){
var _34=dojo.config.extraLocale;
if(_34){
if(!_34 instanceof Array){
_34=[_34];
}
dojo._xdReqLoc=dojo.xdRequireLocalization;
dojo.xdRequireLocalization=function(m,b,_35,_36){
dojo._xdReqLoc(m,b,_35,_36);
if(_35){
return;
}
for(var i=0;i<_34.length;i++){
dojo._xdReqLoc(m,b,_34[i],_36);
}
};
}
};
dojo._xdBundleMap={};
dojo.xdRequireLocalization=function(_37,_38,_39,_3a){
if(dojo._xdInitExtraLocales){
dojo._xdInitExtraLocales();
dojo._xdInitExtraLocales=null;
dojo.xdRequireLocalization.apply(dojo,arguments);
return;
}
var _3b=_3a.split(",");
var _3c=dojo.i18n.normalizeLocale(_39);
var _3d="";
for(var i=0;i<_3b.length;i++){
if(_3c.indexOf(_3b[i])==0){
if(_3b[i].length>_3d.length){
_3d=_3b[i];
}
}
}
var _3e=_3d.replace("-","_");
var _3f=dojo.getObject([_37,"nls",_38].join("."));
if(!_3f||!_3f[_3e]){
var _40=[_37,(_3e||"root"),_38].join(".");
var _41=dojo._xdBundleMap[_40];
if(!_41){
_41=dojo._xdBundleMap[_40]={};
}
_41[_3c.replace("-","_")]=true;
dojo.require(_37+".nls"+(_3d?"."+_3d:"")+"."+_38);
}
};
dojo._xdRealRequireLocalization=dojo.requireLocalization;
dojo.requireLocalization=function(_42,_43,_44,_45){
var _46=dojo.moduleUrl(_42).toString();
if(dojo._xdIsXDomainPath(_46)){
return dojo.xdRequireLocalization.apply(dojo,arguments);
}else{
return dojo._xdRealRequireLocalization.apply(dojo,arguments);
}
};
dojo._xdUnpackDependency=function(dep){
var _47=null;
var _48=null;
switch(dep[0]){
case "requireIf":
case "requireAfterIf":
if(dep[1]===true){
_47=[{name:dep[2],content:null}];
}
break;
case "platformRequire":
var _49=dep[1];
var _4a=_49["common"]||[];
_47=(_49[dojo.hostenv.name_])?_4a.concat(_49[dojo.hostenv.name_]||[]):_4a.concat(_49["default"]||[]);
if(_47){
for(var i=0;i<_47.length;i++){
if(_47[i] instanceof Array){
_47[i]={name:_47[i][0],content:null};
}else{
_47[i]={name:_47[i],content:null};
}
}
}
break;
case "require":
_47=[{name:dep[1],content:null}];
break;
case "i18n._preloadLocalizations":
dojo.i18n._preloadLocalizations.apply(dojo.i18n._preloadLocalizations,dep.slice(1));
break;
}
if(dep[0]=="requireAfterIf"||dep[0]=="requireIf"){
_48=_47;
_47=null;
}
return {requires:_47,requiresAfter:_48};
};
dojo._xdWalkReqs=function(){
var _4b=null;
var req;
for(var i=0;i<dojo._xdOrderedReqs.length;i++){
req=dojo._xdOrderedReqs[i];
if(dojo._xdDepMap[req]){
_4b=[req];
_4b[req]=true;
dojo._xdEvalReqs(_4b);
}
}
};
dojo._xdEvalReqs=function(_4c){
while(_4c.length>0){
var req=_4c[_4c.length-1];
var res=dojo._xdDepMap[req];
var i,_4d,_4e;
if(res){
_4d=res.requires;
if(_4d&&_4d.length>0){
for(i=0;i<_4d.length;i++){
_4e=_4d[i].name;
if(_4e&&!_4c[_4e]){
_4c.push(_4e);
_4c[_4e]=true;
dojo._xdEvalReqs(_4c);
}
}
}
var _4f=dojo._xdContents[res.contentIndex];
if(!_4f.isDefined){
var _50=_4f.content;
_50["resourceName"]=_4f["resourceName"];
_50["resourcePath"]=_4f["resourcePath"];
dojo._xdDefList.push(_50);
_4f.isDefined=true;
}
dojo._xdDepMap[req]=null;
_4d=res.requiresAfter;
if(_4d&&_4d.length>0){
for(i=0;i<_4d.length;i++){
_4e=_4d[i].name;
if(_4e&&!_4c[_4e]){
_4c.push(_4e);
_4c[_4e]=true;
dojo._xdEvalReqs(_4c);
}
}
}
}
_4c.pop();
}
};
dojo._xdWatchInFlight=function(){
var _51="";
var _52=(dojo.config.xdWaitSeconds||15)*1000;
var _53=(dojo._xdStartTime+_52)<(new Date()).getTime();
for(var _54 in dojo._xdInFlight){
if(dojo._xdInFlight[_54]===true){
if(_53){
_51+=_54+" ";
}else{
return;
}
}
}
dojo._xdClearInterval();
if(_53){
throw "Could not load cross-domain resources: "+_51;
}
dojo._xdWalkReqs();
var _55=dojo._xdDefList.length;
for(var i=0;i<_55;i++){
var _56=dojo._xdDefList[i];
if(dojo.config["debugAtAllCosts"]&&_56["resourceName"]){
if(!dojo["_xdDebugQueue"]){
dojo._xdDebugQueue=[];
}
dojo._xdDebugQueue.push({resourceName:_56.resourceName,resourcePath:_56.resourcePath});
}else{
_56.apply(dojo.global,dojo._scopeArgs);
}
}
for(i=0;i<dojo._xdContents.length;i++){
var _57=dojo._xdContents[i];
if(_57.content&&!_57.isDefined){
_57.content.apply(dojo.global,dojo._scopeArgs);
}
}
dojo._xdReset();
if(dojo["_xdDebugQueue"]&&dojo._xdDebugQueue.length>0){
dojo._xdDebugFileLoaded();
}else{
dojo._xdNotifyLoaded();
}
};
dojo._xdNotifyLoaded=function(){
for(var _58 in dojo._xdInFlight){
if(typeof dojo._xdInFlight[_58]=="boolean"){
return;
}
}
dojo._inFlightCount=0;
if(dojo._initFired&&!dojo._loadNotifying){
dojo._callLoaded();
}
};
}
