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
var _25=_6.clone(_24.root),_26=_c(!_24._v1x&&_24,_22,_20,_21);
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
var _34=_b.exec(id),_35=_34[1]+"/",_36=_34[5]||_34[4],_37=_35+_36,_38=(_34[5]&&_34[4]),_39=_38||_1.locale,_3a=_37+"/"+_39,_3b=_38?[_39]:_2a(_39),_3c=_3b.length,_3d=function(){
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
_5a([mid],_4e,_4c);
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
function _53(_54){
_54=_42(_54);
_4f(_54,function(loc){
if(_4.indexOf(_4a,loc)>=0){
var mid=_49.replace(/\./g,"/")+"_"+loc;
_47++;
_4d(mid,function(_55){
for(var p in _55){
_14[_2.toAbsMid(p)+"/"+loc]=_55[p];
}
--_47;
while(!_47&&_48.length){
_2d.apply(null,_48.shift());
}
});
return true;
}
return false;
});
};
_53();
_4.forEach(_1.config.extraLocale,_53);
},_33=function(id,_56,_57){
if(_47){
_48.push([id,_56,_57]);
}
return _47;
},_40=function(){
};
}
if(1){
var _58={},_59=new Function("__bundle","__checkForLegacyModules","__mid","__amdValue","var define = function(mid, factory){define.called = 1; __amdValue.result = factory || mid;},"+"\t   require = function(){define.called = 1;};"+"try{"+"define.called = 0;"+"eval(__bundle);"+"if(define.called==1)"+"return __amdValue;"+"if((__checkForLegacyModules = __checkForLegacyModules(__mid)))"+"return __checkForLegacyModules;"+"}catch(e){}"+"try{"+"return eval('('+__bundle+')');"+"}catch(e){"+"return e;"+"}"),_5a=function(_5b,_5c,_5d){
var _5e=[];
_4.forEach(_5b,function(mid){
var url=_5d.toUrl(mid+".js");
function _2d(_5f){
var _60=_59(_5f,_40,mid,_58);
if(_60===_58){
_5e.push(_14[url]=_58.result);
}else{
if(_60 instanceof Error){
console.error("failed to evaluate i18n bundle; url="+url,_60);
_60={};
}
_5e.push(_14[url]=(/nls\/[^\/]+\/[^\/]+$/.test(url)?_60:{root:_60,_v1x:1}));
}
};
if(_14[url]){
_5e.push(_14[url]);
}else{
var _61=_5d.syncLoadNls(mid);
if(_61){
_5e.push(_61);
}else{
if(!_7){
try{
_5d.getText(url,true,_2d);
}
catch(e){
_5e.push(_14[url]={});
}
}else{
_7.get({url:url,sync:true,load:_2d,error:function(){
_5e.push(_14[url]={});
}});
}
}
}
});
_5c&&_5c.apply(null,_5e);
};
_40=function(_62){
for(var _63,_64=_62.split("/"),_65=_1.global[_64[0]],i=1;_65&&i<_64.length-1;_65=_65[_64[i++]]){
}
if(_65){
_63=_65[_64[i]];
if(!_63){
_63=_65[_64[i].replace(/-/g,"_")];
}
if(_63){
_14[_62]=_63;
}
}
return _63;
};
_a.getLocalization=function(_66,_67,_68){
var _69,_6a=_15(_66,_67,_68);
_2d(_6a,(!_45(_6a,_2)?function(_6b,_6c){
_5a(_6b,_6c,_2);
}:_2),function(_6d){
_69=_6d;
});
return _69;
};
if(_3("dojo-unit-tests")){
_41.push(function(doh){
doh.register("tests.i18n.unit",function(t){
var _6e;
_6e=_59("{prop:1}",_40,"nonsense",_58);
t.is({prop:1},_6e);
t.is(undefined,_6e[1]);
_6e=_59("({prop:1})",_40,"nonsense",_58);
t.is({prop:1},_6e);
t.is(undefined,_6e[1]);
_6e=_59("{'prop-x':1}",_40,"nonsense",_58);
t.is({"prop-x":1},_6e);
t.is(undefined,_6e[1]);
_6e=_59("({'prop-x':1})",_40,"nonsense",_58);
t.is({"prop-x":1},_6e);
t.is(undefined,_6e[1]);
_6e=_59("define({'prop-x':1})",_40,"nonsense",_58);
t.is(_58,_6e);
t.is({"prop-x":1},_58.result);
_6e=_59("define('some/module', {'prop-x':1})",_40,"nonsense",_58);
t.is(_58,_6e);
t.is({"prop-x":1},_58.result);
_6e=_59("this is total nonsense and should throw an error",_40,"nonsense",_58);
t.is(_6e instanceof Error,true);
});
});
}
}
return _6.mixin(_a,{dynamic:true,normalize:_28,load:_2d,cache:_14,getL10nName:_19});
});
