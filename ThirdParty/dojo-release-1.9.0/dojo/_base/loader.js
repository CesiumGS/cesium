/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/loader",["./kernel","../has","require","module","../json","./lang","./array"],function(_1,_2,_3,_4,_5,_6,_7){
if(!1){
console.error("cannot load the Dojo v1.x loader with a foreign loader");
return 0;
}
1||_2.add("dojo-fast-sync-require",1);
var _8=function(id){
return {src:_4.id,id:id};
},_9=function(_a){
return _a.replace(/\./g,"/");
},_b=/\/\/>>built/,_c=[],_d=[],_e=function(_f,_10,_11){
_c.push(_11);
_7.forEach(_f.split(","),function(mid){
var _12=_13(mid,_10.module);
_d.push(_12);
_14(_12);
});
_15();
},_15=(1?function(){
var _16,mid;
for(mid in _17){
_16=_17[mid];
if(_16.noReqPluginCheck===undefined){
_16.noReqPluginCheck=/loadInit\!/.test(mid)||/require\!/.test(mid)?1:0;
}
if(!_16.executed&&!_16.noReqPluginCheck&&_16.injected==_18){
return;
}
}
_19(function(){
var _1a=_c;
_c=[];
_7.forEach(_1a,function(cb){
cb(1);
});
});
}:(function(){
var _1b,_1c=function(m){
_1b[m.mid]=1;
for(var t,_1d,_1e=m.deps||[],i=0;i<_1e.length;i++){
_1d=_1e[i];
if(!(t=_1b[_1d.mid])){
if(t===0||!_1c(_1d)){
_1b[m.mid]=0;
return false;
}
}
}
return true;
};
return function(){
var _1f,mid;
_1b={};
for(mid in _17){
_1f=_17[mid];
if(_1f.executed||_1f.noReqPluginCheck){
_1b[mid]=1;
}else{
if(_1f.noReqPluginCheck!==0){
_1f.noReqPluginCheck=/loadInit\!/.test(mid)||/require\!/.test(mid)?1:0;
}
if(_1f.noReqPluginCheck){
_1b[mid]=1;
}else{
if(_1f.injected!==_51){
_1b[mid]=0;
}
}
}
}
for(var t,i=0,end=_d.length;i<end;i++){
_1f=_d[i];
if(!(t=_1b[_1f.mid])){
if(t===0||!_1c(_1f)){
return;
}
}
}
_19(function(){
var _20=_c;
_c=[];
_7.forEach(_20,function(cb){
cb(1);
});
});
};
})()),_21=function(mid,_22,_23){
_22([mid],function(_24){
_22(_24.names,function(){
for(var _25="",_26=[],i=0;i<arguments.length;i++){
_25+="var "+_24.names[i]+"= arguments["+i+"]; ";
_26.push(arguments[i]);
}
eval(_25);
var _27=_22.module,_28=[],_29,_2a={provide:function(_2b){
_2b=_9(_2b);
var _2c=_13(_2b,_27);
if(_2c!==_27){
_57(_2c);
}
},require:function(_2d,_2e){
_2d=_9(_2d);
_2e&&(_13(_2d,_27).result=_52);
_28.push(_2d);
},requireLocalization:function(_2f,_30,_31){
if(!_29){
_29=["dojo/i18n"];
}
_31=(_31||_1.locale).toLowerCase();
_2f=_9(_2f)+"/nls/"+(/root/i.test(_31)?"":_31+"/")+_9(_30);
if(_13(_2f,_27).isXd){
_29.push("dojo/i18n!"+_2f);
}
},loadInit:function(f){
f();
}},_32={},p;
try{
for(p in _2a){
_32[p]=_1[p];
_1[p]=_2a[p];
}
_24.def.apply(null,_26);
}
catch(e){
_33("error",[_8("failedDojoLoadInit"),e]);
}
finally{
for(p in _2a){
_1[p]=_32[p];
}
}
if(_29){
_28=_28.concat(_29);
}
if(_28.length){
_e(_28.join(","),_22,_23);
}else{
_23();
}
});
});
},_34=function(_35,_36,_37){
var _38=/\(|\)/g,_39=1,_3a;
_38.lastIndex=_36;
while((_3a=_38.exec(_35))){
if(_3a[0]==")"){
_39-=1;
}else{
_39+=1;
}
if(_39==0){
break;
}
}
if(_39!=0){
throw "unmatched paren around character "+_38.lastIndex+" in: "+_35;
}
return [_1.trim(_35.substring(_37,_38.lastIndex))+";\n",_38.lastIndex];
},_3b=/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg,_3c=/(^|\s)dojo\.(loadInit|require|provide|requireLocalization|requireIf|requireAfterIf|platformRequire)\s*\(/mg,_3d=/(^|\s)(require|define)\s*\(/m,_3e=function(_3f,_40){
var _41,_42,_43,_44,_45=[],_46=[],_47=[];
_40=_40||_3f.replace(_3b,function(_48){
_3c.lastIndex=_3d.lastIndex=0;
return (_3c.test(_48)||_3d.test(_48))?"":_48;
});
while((_41=_3c.exec(_40))){
_42=_3c.lastIndex;
_43=_42-_41[0].length;
_44=_34(_40,_42,_43);
if(_41[2]=="loadInit"){
_45.push(_44[0]);
}else{
_46.push(_44[0]);
}
_3c.lastIndex=_44[1];
}
_47=_45.concat(_46);
if(_47.length||!_3d.test(_40)){
return [_3f.replace(/(^|\s)dojo\.loadInit\s*\(/g,"\n0 && dojo.loadInit("),_47.join(""),_47];
}else{
return 0;
}
},_49=function(_4a,_4b){
var _4c,id,_4d=[],_4e=[];
if(_b.test(_4b)||!(_4c=_3e(_4b))){
return 0;
}
id=_4a.mid+"-*loadInit";
for(var p in _13("dojo",_4a).result.scopeMap){
_4d.push(p);
_4e.push("\""+p+"\"");
}
return "// xdomain rewrite of "+_4a.mid+"\n"+"define('"+id+"',{\n"+"\tnames:"+_5.stringify(_4d)+",\n"+"\tdef:function("+_4d.join(",")+"){"+_4c[1]+"}"+"});\n\n"+"define("+_5.stringify(_4d.concat(["dojo/loadInit!"+id]))+", function("+_4d.join(",")+"){\n"+_4c[0]+"});";
},_4f=_3.initSyncLoader(_e,_15,_49),_50=_4f.sync,_18=_4f.requested,_51=_4f.arrived,_52=_4f.nonmodule,_53=_4f.executing,_54=_4f.executed,_55=_4f.syncExecStack,_17=_4f.modules,_56=_4f.execQ,_13=_4f.getModule,_14=_4f.injectModule,_57=_4f.setArrived,_33=_4f.signal,_58=_4f.finishExec,_59=_4f.execModule,_5a=_4f.getLegacyMode,_19=_4f.guardCheckComplete;
_e=_4f.dojoRequirePlugin;
_1.provide=function(mid){
var _5b=_55[0],_5c=_6.mixin(_13(_9(mid),_3.module),{executed:_53,result:_6.getObject(mid,true)});
_57(_5c);
if(_5b){
(_5b.provides||(_5b.provides=[])).push(function(){
_5c.result=_6.getObject(mid);
delete _5c.provides;
_5c.executed!==_54&&_58(_5c);
});
}
return _5c.result;
};
_2.add("config-publishRequireResult",1,0,0);
_1.require=function(_5d,_5e){
function _5f(mid,_60){
var _61=_13(_9(mid),_3.module);
if(_55.length&&_55[0].finish){
_55[0].finish.push(mid);
return undefined;
}
if(_61.executed){
return _61.result;
}
_60&&(_61.result=_52);
var _62=_5a();
_14(_61);
_62=_5a();
if(_61.executed!==_54&&_61.injected===_51){
_4f.guardCheckComplete(function(){
_59(_61);
});
}
if(_61.executed){
return _61.result;
}
if(_62==_50){
if(_61.cjs){
_56.unshift(_61);
}else{
_55.length&&(_55[0].finish=[mid]);
}
}else{
_56.push(_61);
}
return undefined;
};
var _63=_5f(_5d,_5e);
if(_2("config-publishRequireResult")&&!_6.exists(_5d)&&_63!==undefined){
_6.setObject(_5d,_63);
}
return _63;
};
_1.loadInit=function(f){
f();
};
_1.registerModulePath=function(_64,_65){
var _66={};
_66[_64.replace(/\./g,"/")]=_65;
_3({paths:_66});
};
_1.platformRequire=function(_67){
var _68=(_67.common||[]).concat(_67[_1._name]||_67["default"]||[]),_69;
while(_68.length){
if(_6.isArray(_69=_68.shift())){
_1.require.apply(_1,_69);
}else{
_1.require(_69);
}
}
};
_1.requireIf=_1.requireAfterIf=function(_6a,_6b,_6c){
if(_6a){
_1.require(_6b,_6c);
}
};
_1.requireLocalization=function(_6d,_6e,_6f){
_3(["../i18n"],function(_70){
_70.getLocalization(_6d,_6e,_6f);
});
};
return {extractLegacyApiApplications:_3e,require:_e,loadInit:_21};
});
