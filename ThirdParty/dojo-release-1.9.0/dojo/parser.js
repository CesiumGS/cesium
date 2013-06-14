/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/parser",["require","./_base/kernel","./_base/lang","./_base/array","./_base/config","./dom","./_base/window","./_base/url","./aspect","./promise/all","./date/stamp","./Deferred","./has","./query","./on","./ready"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,_e,_f,_10){
new Date("X");
function _11(_12){
return eval("("+_12+")");
};
var _13=0;
_9.after(_3,"extend",function(){
_13++;
},true);
function _14(_15){
var map=_15._nameCaseMap,_16=_15.prototype;
if(!map||map._extendCnt<_13){
map=_15._nameCaseMap={};
for(var _17 in _16){
if(_17.charAt(0)==="_"){
continue;
}
map[_17.toLowerCase()]=_17;
}
map._extendCnt=_13;
}
return map;
};
var _18={};
function _19(_1a,_1b){
var ts=_1a.join();
if(!_18[ts]){
var _1c=[];
for(var i=0,l=_1a.length;i<l;i++){
var t=_1a[i];
_1c[_1c.length]=(_18[t]=_18[t]||(_3.getObject(t)||(~t.indexOf("/")&&(_1b?_1b(t):_1(t)))));
}
var _1d=_1c.shift();
_18[ts]=_1c.length?(_1d.createSubclass?_1d.createSubclass(_1c):_1d.extend.apply(_1d,_1c)):_1d;
}
return _18[ts];
};
var _1e={_clearCache:function(){
_13++;
_18={};
},_functionFromScript:function(_1f,_20){
var _21="",_22="",_23=(_1f.getAttribute(_20+"args")||_1f.getAttribute("args")),_24=_1f.getAttribute("with");
var _25=(_23||"").split(/\s*,\s*/);
if(_24&&_24.length){
_4.forEach(_24.split(/\s*,\s*/),function(_26){
_21+="with("+_26+"){";
_22+="}";
});
}
return new Function(_25,_21+_1f.innerHTML+_22);
},instantiate:function(_27,_28,_29){
_28=_28||{};
_29=_29||{};
var _2a=(_29.scope||_2._scopeName)+"Type",_2b="data-"+(_29.scope||_2._scopeName)+"-",_2c=_2b+"type",_2d=_2b+"mixins";
var _2e=[];
_4.forEach(_27,function(_2f){
var _30=_2a in _28?_28[_2a]:_2f.getAttribute(_2c)||_2f.getAttribute(_2a);
if(_30){
var _31=_2f.getAttribute(_2d),_32=_31?[_30].concat(_31.split(/\s*,\s*/)):[_30];
_2e.push({node:_2f,types:_32});
}
});
return this._instantiate(_2e,_28,_29);
},_instantiate:function(_33,_34,_35,_36){
var _37=_4.map(_33,function(obj){
var _38=obj.ctor||_19(obj.types,_35.contextRequire);
if(!_38){
throw new Error("Unable to resolve constructor for: '"+obj.types.join()+"'");
}
return this.construct(_38,obj.node,_34,_35,obj.scripts,obj.inherited);
},this);
function _39(_3a){
if(!_34._started&&!_35.noStart){
_4.forEach(_3a,function(_3b){
if(typeof _3b.startup==="function"&&!_3b._started){
_3b.startup();
}
});
}
return _3a;
};
if(_36){
return _a(_37).then(_39);
}else{
return _39(_37);
}
},construct:function(_3c,_3d,_3e,_3f,_40,_41){
var _42=_3c&&_3c.prototype;
_3f=_3f||{};
var _43={};
if(_3f.defaults){
_3.mixin(_43,_3f.defaults);
}
if(_41){
_3.mixin(_43,_41);
}
var _44;
if(_d("dom-attributes-explicit")){
_44=_3d.attributes;
}else{
if(_d("dom-attributes-specified-flag")){
_44=_4.filter(_3d.attributes,function(a){
return a.specified;
});
}else{
var _45=/^input$|^img$/i.test(_3d.nodeName)?_3d:_3d.cloneNode(false),_46=_45.outerHTML.replace(/=[^\s"']+|="[^"]*"|='[^']*'/g,"").replace(/^\s*<[a-zA-Z0-9]*\s*/,"").replace(/\s*>.*$/,"");
_44=_4.map(_46.split(/\s+/),function(_47){
var _48=_47.toLowerCase();
return {name:_47,value:(_3d.nodeName=="LI"&&_47=="value")||_48=="enctype"?_3d.getAttribute(_48):_3d.getAttributeNode(_48).value};
});
}
}
var _49=_3f.scope||_2._scopeName,_4a="data-"+_49+"-",_4b={};
if(_49!=="dojo"){
_4b[_4a+"props"]="data-dojo-props";
_4b[_4a+"type"]="data-dojo-type";
_4b[_4a+"mixins"]="data-dojo-mixins";
_4b[_49+"type"]="dojoType";
_4b[_4a+"id"]="data-dojo-id";
}
var i=0,_4c,_4d=[],_4e,_4f;
while(_4c=_44[i++]){
var _50=_4c.name,_51=_50.toLowerCase(),_52=_4c.value;
switch(_4b[_51]||_51){
case "data-dojo-type":
case "dojotype":
case "data-dojo-mixins":
break;
case "data-dojo-props":
_4f=_52;
break;
case "data-dojo-id":
case "jsid":
_4e=_52;
break;
case "data-dojo-attach-point":
case "dojoattachpoint":
_43.dojoAttachPoint=_52;
break;
case "data-dojo-attach-event":
case "dojoattachevent":
_43.dojoAttachEvent=_52;
break;
case "class":
_43["class"]=_3d.className;
break;
case "style":
_43["style"]=_3d.style&&_3d.style.cssText;
break;
default:
if(!(_50 in _42)){
var map=_14(_3c);
_50=map[_51]||_50;
}
if(_50 in _42){
switch(typeof _42[_50]){
case "string":
_43[_50]=_52;
break;
case "number":
_43[_50]=_52.length?Number(_52):NaN;
break;
case "boolean":
_43[_50]=_52.toLowerCase()!="false";
break;
case "function":
if(_52===""||_52.search(/[^\w\.]+/i)!=-1){
_43[_50]=new Function(_52);
}else{
_43[_50]=_3.getObject(_52,false)||new Function(_52);
}
_4d.push(_50);
break;
default:
var _53=_42[_50];
_43[_50]=(_53&&"length" in _53)?(_52?_52.split(/\s*,\s*/):[]):(_53 instanceof Date)?(_52==""?new Date(""):_52=="now"?new Date():_b.fromISOString(_52)):(_53 instanceof _8)?(_2.baseUrl+_52):_11(_52);
}
}else{
_43[_50]=_52;
}
}
}
for(var j=0;j<_4d.length;j++){
var _54=_4d[j].toLowerCase();
_3d.removeAttribute(_54);
_3d[_54]=null;
}
if(_4f){
try{
_4f=_11.call(_3f.propsThis,"{"+_4f+"}");
_3.mixin(_43,_4f);
}
catch(e){
throw new Error(e.toString()+" in data-dojo-props='"+_4f+"'");
}
}
_3.mixin(_43,_3e);
if(!_40){
_40=(_3c&&(_3c._noScript||_42._noScript)?[]:_e("> script[type^='dojo/']",_3d));
}
var _55=[],_56=[],_57=[],ons=[];
if(_40){
for(i=0;i<_40.length;i++){
var _58=_40[i];
_3d.removeChild(_58);
var _59=(_58.getAttribute(_4a+"event")||_58.getAttribute("event")),_5a=_58.getAttribute(_4a+"prop"),_5b=_58.getAttribute(_4a+"method"),_5c=_58.getAttribute(_4a+"advice"),_5d=_58.getAttribute("type"),nf=this._functionFromScript(_58,_4a);
if(_59){
if(_5d=="dojo/connect"){
_55.push({method:_59,func:nf});
}else{
if(_5d=="dojo/on"){
ons.push({event:_59,func:nf});
}else{
_43[_59]=nf;
}
}
}else{
if(_5d=="dojo/aspect"){
_55.push({method:_5b,advice:_5c,func:nf});
}else{
if(_5d=="dojo/watch"){
_57.push({prop:_5a,func:nf});
}else{
_56.push(nf);
}
}
}
}
}
var _5e=_3c.markupFactory||_42.markupFactory;
var _5f=_5e?_5e(_43,_3d,_3c):new _3c(_43,_3d);
function _60(_61){
if(_4e){
_3.setObject(_4e,_61);
}
for(i=0;i<_55.length;i++){
_9[_55[i].advice||"after"](_61,_55[i].method,_3.hitch(_61,_55[i].func),true);
}
for(i=0;i<_56.length;i++){
_56[i].call(_61);
}
for(i=0;i<_57.length;i++){
_61.watch(_57[i].prop,_57[i].func);
}
for(i=0;i<ons.length;i++){
_f(_61,ons[i].event,ons[i].func);
}
return _61;
};
if(_5f.then){
return _5f.then(_60);
}else{
return _60(_5f);
}
},scan:function(_62,_63){
var _64=[],_65=[],_66={};
var _67=(_63.scope||_2._scopeName)+"Type",_68="data-"+(_63.scope||_2._scopeName)+"-",_69=_68+"type",_6a=_68+"textdir",_6b=_68+"mixins";
var _6c=_62.firstChild;
var _6d=_63.inherited;
if(!_6d){
function _6e(_6f,_70){
return (_6f.getAttribute&&_6f.getAttribute(_70))||(_6f.parentNode&&_6e(_6f.parentNode,_70));
};
_6d={dir:_6e(_62,"dir"),lang:_6e(_62,"lang"),textDir:_6e(_62,_6a)};
for(var key in _6d){
if(!_6d[key]){
delete _6d[key];
}
}
}
var _71={inherited:_6d};
var _72;
var _73;
function _74(_75){
if(!_75.inherited){
_75.inherited={};
var _76=_75.node,_77=_74(_75.parent);
var _78={dir:_76.getAttribute("dir")||_77.dir,lang:_76.getAttribute("lang")||_77.lang,textDir:_76.getAttribute(_6a)||_77.textDir};
for(var key in _78){
if(_78[key]){
_75.inherited[key]=_78[key];
}
}
}
return _75.inherited;
};
while(true){
if(!_6c){
if(!_71||!_71.node){
break;
}
_6c=_71.node.nextSibling;
_73=false;
_71=_71.parent;
_72=_71.scripts;
continue;
}
if(_6c.nodeType!=1){
_6c=_6c.nextSibling;
continue;
}
if(_72&&_6c.nodeName.toLowerCase()=="script"){
_79=_6c.getAttribute("type");
if(_79&&/^dojo\/\w/i.test(_79)){
_72.push(_6c);
}
_6c=_6c.nextSibling;
continue;
}
if(_73){
_6c=_6c.nextSibling;
continue;
}
var _79=_6c.getAttribute(_69)||_6c.getAttribute(_67);
var _7a=_6c.firstChild;
if(!_79&&(!_7a||(_7a.nodeType==3&&!_7a.nextSibling))){
_6c=_6c.nextSibling;
continue;
}
var _7b;
var _7c=null;
if(_79){
var _7d=_6c.getAttribute(_6b),_7e=_7d?[_79].concat(_7d.split(/\s*,\s*/)):[_79];
try{
_7c=_19(_7e,_63.contextRequire);
}
catch(e){
}
if(!_7c){
_4.forEach(_7e,function(t){
if(~t.indexOf("/")&&!_66[t]){
_66[t]=true;
_65[_65.length]=t;
}
});
}
var _7f=_7c&&!_7c.prototype._noScript?[]:null;
_7b={types:_7e,ctor:_7c,parent:_71,node:_6c,scripts:_7f};
_7b.inherited=_74(_7b);
_64.push(_7b);
}else{
_7b={node:_6c,scripts:_72,parent:_71};
}
_72=_7f;
_73=_6c.stopParser||(_7c&&_7c.prototype.stopParser&&!(_63.template));
_71=_7b;
_6c=_7a;
}
var d=new _c();
if(_65.length){
if(_d("dojo-debug-messages")){
console.warn("WARNING: Modules being Auto-Required: "+_65.join(", "));
}
var r=_63.contextRequire||_1;
r(_65,function(){
d.resolve(_4.filter(_64,function(_80){
if(!_80.ctor){
try{
_80.ctor=_19(_80.types,_63.contextRequire);
}
catch(e){
}
}
var _81=_80.parent;
while(_81&&!_81.types){
_81=_81.parent;
}
var _82=_80.ctor&&_80.ctor.prototype;
_80.instantiateChildren=!(_82&&_82.stopParser&&!(_63.template));
_80.instantiate=!_81||(_81.instantiate&&_81.instantiateChildren);
return _80.instantiate;
}));
});
}else{
d.resolve(_64);
}
return d.promise;
},_require:function(_83,_84){
var _85=_11("{"+_83.innerHTML+"}"),_86=[],_87=[],d=new _c();
var _88=(_84&&_84.contextRequire)||_1;
for(var _89 in _85){
_86.push(_89);
_87.push(_85[_89]);
}
_88(_87,function(){
for(var i=0;i<_86.length;i++){
_3.setObject(_86[i],arguments[i]);
}
d.resolve(arguments);
});
return d.promise;
},_scanAmd:function(_8a,_8b){
var _8c=new _c(),_8d=_8c.promise;
_8c.resolve(true);
var _8e=this;
_e("script[type='dojo/require']",_8a).forEach(function(_8f){
_8d=_8d.then(function(){
return _8e._require(_8f,_8b);
});
_8f.parentNode.removeChild(_8f);
});
return _8d;
},parse:function(_90,_91){
var _92;
if(!_91&&_90&&_90.rootNode){
_91=_90;
_92=_91.rootNode;
}else{
if(_90&&_3.isObject(_90)&&!("nodeType" in _90)){
_91=_90;
}else{
_92=_90;
}
}
_92=_92?_6.byId(_92):_7.body();
_91=_91||{};
var _93=_91.template?{template:true}:{},_94=[],_95=this;
var p=this._scanAmd(_92,_91).then(function(){
return _95.scan(_92,_91);
}).then(function(_96){
return _95._instantiate(_96,_93,_91,true);
}).then(function(_97){
return _94=_94.concat(_97);
}).otherwise(function(e){
console.error("dojo/parser::parse() error",e);
throw e;
});
_3.mixin(_94,p);
return _94;
}};
if(1){
_2.parser=_1e;
}
if(_5.parseOnLoad){
_10(100,_1e,"parse");
}
return _1e;
});
