/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/i18n",["./_base/kernel","require","./has","./_base/array","./_base/config","./_base/lang","./_base/xhr","./json","module"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
_3.add("dojo-preload-i18n-Api",1);
1||_3.add("dojo-v1x-i18n-Api",1);
var _a=_1.i18n={},_b=/(^.*(^|\/)nls)(\/|$)([^\/]*)\/?([^\/]*)/,_c=function(_d,_e,_f,_10){
for(var _11=[_f+_10],_12=_e.split("-"),_13="",i=0;i<_12.length;i++){
_13+=(_13?"-":"")+_12[i];
if(!_d||_d[_13]){
_11.push(_f+_13+"/"+_10);
_11.specificity=_13;
}
}
return _11;
},_14={},_15=function(_16,_17,_18){
_18=_18?_18.toLowerCase():_1.locale;
_16=_16.replace(/\./g,"/");
_17=_17.replace(/\./g,"/");
return (/root/i.test(_18))?(_16+"/nls/"+_17):(_16+"/nls/"+_18+"/"+_17);
},_19=_1.getL10nName=function(_1a,_1b,_1c){
return _1a=_9.id+"!"+_15(_1a,_1b,_1c);
},_1d=function(_1e,_1f,_20,_21,_22,_23){
_1e([_1f],function(_24){
var _25=_6.clone(_24.root||_24.ROOT),_26=_c(!_24._v1x&&_24,_22,_20,_21);
_1e(_26,function(){
for(var i=1;i<_26.length;i++){
_25=_6.mixin(_6.clone(_25),arguments[i]);
}
var _27=_1f+"/"+_22;
_14[_27]=_25;
_25.$locale=_26.specificity;
_23();
});
});
},_28=function(id,_29){
return /^\./.test(id)?_29(id):id;
},_2a=function(_2b){
var _2c=_5.extraLocale||[];
_2c=_6.isArray(_2c)?_2c:[_2c];
_2c.push(_2b);
return _2c;
},_2d=function(id,_2e,_2f){
if(_3("dojo-preload-i18n-Api")){
var _30=id.split("*"),_31=_30[1]=="preload";
if(_31){
if(!_14[id]){
_14[id]=1;
_32(_30[2],_8.parse(_30[3]),1,_2e);
}
_2f(1);
}
if(_31||_33(id,_2e,_2f)){
return;
}
}
var _34=_b.exec(id),_35=_34[1]+"/",_36=_34[5]||_34[4],_37=_35+_36,_38=(_34[5]&&_34[4]),_39=_38||_1.locale||"",_3a=_37+"/"+_39,_3b=_38?[_39]:_2a(_39),_3c=_3b.length,_3d=function(){
if(!--_3c){
_2f(_6.delegate(_14[_3a]));
}
};
_4.forEach(_3b,function(_3e){
var _3f=_37+"/"+_3e;
if(_3("dojo-preload-i18n-Api")){
_40(_3f);
}
if(!_14[_3f]){
_1d(_2e,_37,_35,_36,_3e,_3d);
}else{
_3d();
}
});
};
if(_3("dojo-unit-tests")){
var _41=_a.unitTests=[];
}
if(_3("dojo-preload-i18n-Api")||1){
var _42=_a.normalizeLocale=function(_43){
var _44=_43?_43.toLowerCase():_1.locale;
return _44=="root"?"ROOT":_44;
},_45=function(mid,_46){
return (1&&1)?_46.isXdUrl(_2.toUrl(mid+".js")):true;
},_47=0,_48=[],_32=_a._preloadLocalizations=function(_49,_4a,_4b,_4c){
_4c=_4c||_2;
function _4d(mid,_4e){
if(_45(mid,_4c)||_4b){
_4c([mid],_4e);
}else{
_6d([mid],_4e,_4c);
}
};
function _4f(_50,_51){
var _52=_50.split("-");
while(_52.length){
if(_51(_52.join("-"))){
return;
}
_52.pop();
}
_51("ROOT");
};
function _53(){
_47++;
};
function _54(){
--_47;
while(!_47&&_48.length){
_2d.apply(null,_48.shift());
}
};
function _55(_56,_57,loc,_58){
return _58.toAbsMid(_56+_57+"/"+loc);
};
function _59(_5a){
_5a=_42(_5a);
_4f(_5a,function(loc){
if(_4.indexOf(_4a,loc)>=0){
var mid=_49.replace(/\./g,"/")+"_"+loc;
_53();
_4d(mid,function(_5b){
for(var p in _5b){
var _5c=_5b[p],_5d=p.match(/(.+)\/([^\/]+)$/),_5e,_5f;
if(!_5d){
continue;
}
_5e=_5d[2];
_5f=_5d[1]+"/";
_5c._localized=_5c._localized||{};
var _60;
if(loc==="ROOT"){
var _61=_60=_5c._localized;
delete _5c._localized;
_61.root=_5c;
_14[_2.toAbsMid(p)]=_61;
}else{
_60=_5c._localized;
_14[_55(_5f,_5e,loc,_2)]=_5c;
}
if(loc!==_5a){
function _62(_63,_64,_65,_66){
var _67=[],_68=[];
_4f(_5a,function(loc){
if(_66[loc]){
_67.push(_2.toAbsMid(_63+loc+"/"+_64));
_68.push(_55(_63,_64,loc,_2));
}
});
if(_67.length){
_53();
_4c(_67,function(){
for(var i=0;i<_67.length;i++){
_65=_6.mixin(_6.clone(_65),arguments[i]);
_14[_68[i]]=_65;
}
_14[_55(_63,_64,_5a,_2)]=_6.clone(_65);
_54();
});
}else{
_14[_55(_63,_64,_5a,_2)]=_65;
}
};
_62(_5f,_5e,_5c,_60);
}
}
_54();
});
return true;
}
return false;
});
};
_59();
_4.forEach(_1.config.extraLocale,_59);
},_33=function(id,_69,_6a){
if(_47){
_48.push([id,_69,_6a]);
}
return _47;
},_40=function(){
};
}
if(1){
var _6b={},_6c=new Function("__bundle","__checkForLegacyModules","__mid","__amdValue","var define = function(mid, factory){define.called = 1; __amdValue.result = factory || mid;},"+"\t   require = function(){define.called = 1;};"+"try{"+"define.called = 0;"+"eval(__bundle);"+"if(define.called==1)"+"return __amdValue;"+"if((__checkForLegacyModules = __checkForLegacyModules(__mid)))"+"return __checkForLegacyModules;"+"}catch(e){}"+"try{"+"return eval('('+__bundle+')');"+"}catch(e){"+"return e;"+"}"),_6d=function(_6e,_6f,_70){
var _71=[];
_4.forEach(_6e,function(mid){
var url=_70.toUrl(mid+".js");
function _2d(_72){
var _73=_6c(_72,_40,mid,_6b);
if(_73===_6b){
_71.push(_14[url]=_6b.result);
}else{
if(_73 instanceof Error){
console.error("failed to evaluate i18n bundle; url="+url,_73);
_73={};
}
_71.push(_14[url]=(/nls\/[^\/]+\/[^\/]+$/.test(url)?_73:{root:_73,_v1x:1}));
}
};
if(_14[url]){
_71.push(_14[url]);
}else{
var _74=_70.syncLoadNls(mid);
if(_74){
_71.push(_74);
}else{
if(!_7){
try{
_70.getText(url,true,_2d);
}
catch(e){
_71.push(_14[url]={});
}
}else{
_7.get({url:url,sync:true,load:_2d,error:function(){
_71.push(_14[url]={});
}});
}
}
}
});
_6f&&_6f.apply(null,_71);
};
_40=function(_75){
for(var _76,_77=_75.split("/"),_78=_1.global[_77[0]],i=1;_78&&i<_77.length-1;_78=_78[_77[i++]]){
}
if(_78){
_76=_78[_77[i]];
if(!_76){
_76=_78[_77[i].replace(/-/g,"_")];
}
if(_76){
_14[_75]=_76;
}
}
return _76;
};
_a.getLocalization=function(_79,_7a,_7b){
var _7c,_7d=_15(_79,_7a,_7b);
_2d(_7d,(!_45(_7d,_2)?function(_7e,_7f){
_6d(_7e,_7f,_2);
}:_2),function(_80){
_7c=_80;
});
return _7c;
};
if(_3("dojo-unit-tests")){
_41.push(function(doh){
doh.register("tests.i18n.unit",function(t){
var _81;
_81=_6c("{prop:1}",_40,"nonsense",_6b);
t.is({prop:1},_81);
t.is(undefined,_81[1]);
_81=_6c("({prop:1})",_40,"nonsense",_6b);
t.is({prop:1},_81);
t.is(undefined,_81[1]);
_81=_6c("{'prop-x':1}",_40,"nonsense",_6b);
t.is({"prop-x":1},_81);
t.is(undefined,_81[1]);
_81=_6c("({'prop-x':1})",_40,"nonsense",_6b);
t.is({"prop-x":1},_81);
t.is(undefined,_81[1]);
_81=_6c("define({'prop-x':1})",_40,"nonsense",_6b);
t.is(_6b,_81);
t.is({"prop-x":1},_6b.result);
_81=_6c("define('some/module', {'prop-x':1})",_40,"nonsense",_6b);
t.is(_6b,_81);
t.is({"prop-x":1},_6b.result);
_81=_6c("this is total nonsense and should throw an error",_40,"nonsense",_6b);
t.is(_81 instanceof Error,true);
});
});
}
}
return _6.mixin(_a,{dynamic:true,normalize:_28,load:_2d,cache:_14,getL10nName:_19});
});
