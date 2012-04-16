/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.help._base"]){
dojo._hasResource["dojox.help._base"]=true;
dojo.provide("dojox.help._base");
dojo.require("dojox.rpc.Service");
dojo.require("dojo.io.script");
dojo.experimental("dojox.help");
console.warn("Script causes side effects (on numbers, strings, and booleans). Call dojox.help.noConflict() if you plan on executing code.");
dojox.help={locate:function(_1,_2,_3){
_3=_3||20;
var _4=[];
var _5={};
var _6;
if(_2){
if(!dojo.isArray(_2)){
_2=[_2];
}
for(var i=0,_7;_7=_2[i];i++){
_6=_7;
if(dojo.isString(_7)){
_7=dojo.getObject(_7);
if(!_7){
continue;
}
}else{
if(dojo.isObject(_7)){
_6=_7.__name__;
}else{
continue;
}
}
_4.push(_7);
if(_6){
_6=_6.split(".")[0];
if(!_5[_6]&&dojo.indexOf(dojox.help._namespaces,_6)==-1){
dojox.help.refresh(_6);
}
_5[_6]=true;
}
}
}
if(!_4.length){
_4.push({__name__:"window"});
dojo.forEach(dojox.help._namespaces,function(_8){
_5[_8]=true;
});
}
var _9=_1.toLowerCase();
var _a=[];
out:
for(var i=0,_7;_7=_4[i];i++){
var _b=_7.__name__||"";
var _c=dojo.some(_4,function(_d){
_d=_d.__name__||"";
return (_b.indexOf(_d+".")==0);
});
if(_b&&!_c){
_6=_b.split(".")[0];
var _e=[];
if(_b=="window"){
for(_6 in dojox.help._names){
if(dojo.isArray(dojox.help._names[_6])){
_e=_e.concat(dojox.help._names[_6]);
}
}
}else{
_e=dojox.help._names[_6];
}
for(var j=0,_f;_f=_e[j];j++){
if((_b=="window"||_f.indexOf(_b+".")==0)&&_f.toLowerCase().indexOf(_9)!=-1){
if(_f.slice(-10)==".prototype"){
continue;
}
var obj=dojo.getObject(_f);
if(obj){
_a.push([_f,obj]);
if(_a.length==_3){
break out;
}
}
}
}
}
}
dojox.help._displayLocated(_a);
if(!dojo.isMoz){
return "";
}
},refresh:function(_10,_11){
if(arguments.length<2){
_11=true;
}
dojox.help._recurse(_10,_11);
},noConflict:function(_12){
if(arguments.length){
return dojox.help._noConflict(_12);
}else{
while(dojox.help._overrides.length){
var _13=dojox.help._overrides.pop();
var _14=_13[0];
var key=_13[1];
var _15=_14[key];
_14[key]=dojox.help._noConflict(_15);
}
}
},init:function(_16,_17){
if(_16){
dojox.help._namespaces.concat(_16);
}
dojo.addOnLoad(function(){
dojo.require=(function(_18){
return function(){
dojox.help.noConflict();
_18.apply(dojo,arguments);
if(dojox.help._timer){
clearTimeout(dojox.help._timer);
}
dojox.help._timer=setTimeout(function(){
dojo.addOnLoad(function(){
dojox.help.refresh();
dojox.help._timer=false;
});
},500);
};
})(dojo.require);
dojox.help._recurse();
});
},_noConflict:function(_19){
if(_19 instanceof String){
return _19.toString();
}else{
if(_19 instanceof Number){
return +_19;
}else{
if(_19 instanceof Boolean){
return (_19==true);
}else{
if(dojo.isObject(_19)){
delete _19.__name__;
delete _19.help;
}
}
}
}
return _19;
},_namespaces:["dojo","dojox","dijit","djConfig"],_rpc:new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.SMDLibrary","dojo-api.smd")),_attributes:["summary","type","returns","parameters"],_clean:function(_1a){
var obj={};
for(var i=0,_1b;_1b=dojox.help._attributes[i];i++){
var _1c=_1a["__"+_1b+"__"];
if(_1c){
obj[_1b]=_1c;
}
}
return obj;
},_displayLocated:function(_1d){
throw new Error("_displayLocated should be overridden in one of the dojox.help packages");
},_displayHelp:function(_1e,obj){
throw new Error("_displayHelp should be overridden in one of the dojox.help packages");
},_addVersion:function(obj){
if(obj.name){
obj.version=[dojo.version.major,dojo.version.minor,dojo.version.patch].join(".");
var _1f=obj.name.split(".");
if(_1f[0]=="dojo"||_1f[0]=="dijit"||_1f[0]=="dojox"){
obj.project=_1f[0];
}
}
return obj;
},_stripPrototype:function(_20){
var _21=_20.replace(/\.prototype(\.|$)/g,".");
var _22=_21;
if(_21.slice(-1)=="."){
_22=_21=_21.slice(0,-1);
}else{
_21=_20;
}
return [_22,_21];
},_help:function(){
var _23=this.__name__;
var _24=dojox.help._stripPrototype(_23)[0];
var _25=[];
for(var i=0,_26;_26=dojox.help._attributes[i];i++){
if(!this["__"+_26+"__"]){
_25.push(_26);
}
}
dojox.help._displayHelp(true,{name:this.__name__});
if(!_25.length||this.__searched__){
dojox.help._displayHelp(false,dojox.help._clean(this));
}else{
this.__searched__=true;
dojox.help._rpc.get(dojox.help._addVersion({name:_24,exact:true,attributes:_25})).addCallback(this,function(_27){
if(this.toString===dojox.help._toString){
this.toString(_27);
}
if(_27&&_27.length){
_27=_27[0];
for(var i=0,_26;_26=dojox.help._attributes[i];i++){
if(_27[_26]){
this["__"+_26+"__"]=_27[_26];
}
}
dojox.help._displayHelp(false,dojox.help._clean(this));
}else{
dojox.help._displayHelp(false,false);
}
});
}
if(!dojo.isMoz){
return "";
}
},_parse:function(_28){
delete this.__searching__;
if(_28&&_28.length){
var _29=_28[0].parameters;
if(_29){
var _2a=["function ",this.__name__,"("];
this.__parameters__=_29;
for(var i=0,_2b;_2b=_29[i];i++){
if(i){
_2a.push(", ");
}
_2a.push(_2b.name);
if(_2b.types){
var _2c=[];
for(var j=0,_2d;_2d=_2b.types[j];j++){
_2c.push(_2d.title);
}
if(_2c.length){
_2a.push(": ");
_2a.push(_2c.join("|"));
}
}
if(_2b.repeating){
_2a.push("...");
}
if(_2b.optional){
_2a.push("?");
}
}
_2a.push(")");
this.__source__=this.__source__.replace(/function[^\(]*\([^\)]*\)/,_2a.join(""));
}
if(this.__output__){
delete this.__output__;
}
}else{
dojox.help._displayHelp(false,false);
}
},_toStrings:{},_toString:function(_2e){
if(!this.__source__){
return this.__name__;
}
var _2f=(!this.__parameters__);
this.__parameters__=[];
if(_2e){
dojox.help._parse.call(this,_2e);
}else{
if(_2f){
this.__searching__=true;
dojox.help._toStrings[dojox.help._stripPrototype(this.__name__)[0]]=this;
if(dojox.help._toStringTimer){
clearTimeout(dojox.help._toStringTimer);
}
dojox.help._toStringTimer=setTimeout(function(){
dojox.help.__toString();
},50);
}
}
if(!_2f||!this.__searching__){
return this.__source__;
}
var _30="function Loading info for "+this.__name__+"... (watch console for result) {}";
if(!dojo.isMoz){
this.__output__=true;
return _30;
}
return {toString:dojo.hitch(this,function(){
this.__output__=true;
return _30;
})};
},__toString:function(){
if(dojox.help._toStringTimer){
clearTimeout(dojox.help._toStringTimer);
}
var _31=[];
dojox.help.noConflict(dojox.help._toStrings);
for(var _32 in dojox.help._toStrings){
_31.push(_32);
}
while(_31.length){
dojox.help._rpc.batch(dojox.help._addVersion({names:_31.splice(-50,50),exact:true,attributes:["parameters"]})).addCallback(this,function(_33){
for(var i=0,_34;_34=_33[i];i++){
var fn=dojox.help._toStrings[_34.name];
if(fn){
dojox.help._parse.call(fn,[_34]);
delete dojox.help._toStrings[_34.name];
}
}
});
}
},_overrides:[],_recursions:[],_names:{},_recurse:function(_35,_36){
if(arguments.length<2){
_36=true;
}
var _37=[];
if(_35&&dojo.isString(_35)){
dojox.help.__recurse(dojo.getObject(_35),_35,_35,_37,_36);
}else{
for(var i=0,ns;ns=dojox.help._namespaces[i];i++){
if(window[ns]){
dojox.help._recursions.push([window[ns],ns,ns]);
window[ns].__name__=ns;
if(!window[ns].help){
window[ns].help=dojox.help._help;
}
}
}
}
while(dojox.help._recursions.length){
var _38=dojox.help._recursions.shift();
dojox.help.__recurse(_38[0],_38[1],_38[2],_37,_36);
}
for(var i=0,_39;_39=_37[i];i++){
delete _39.__seen__;
}
},__recurse:function(_3a,_3b,_3c,_3d,_3e){
for(var key in _3a){
if(key.match(/([^\w_.$]|__[\w_.$]+__)/)){
continue;
}
var _3f=_3a[key];
if(typeof _3f=="undefined"||_3f===document||_3f===window||_3f===dojox.help._toString||_3f===dojox.help._help||_3f===null||(+dojo.isIE&&_3f.tagName)||_3f.__seen__){
continue;
}
var _40=dojo.isFunction(_3f);
var _41=dojo.isObject(_3f)&&!dojo.isArray(_3f)&&!_3f.nodeType;
var _42=(_3c)?(_3c+"."+key):key;
if(_42=="dojo._blockAsync"){
continue;
}
if(!_3f.__name__){
var _43=null;
if(dojo.isString(_3f)){
_43=String;
}else{
if(typeof _3f=="number"){
_43=Number;
}else{
if(typeof _3f=="boolean"){
_43=Boolean;
}
}
}
if(_43){
_3f=_3a[key]=new _43(_3f);
}
}
_3f.__seen__=true;
_3f.__name__=_42;
(dojox.help._names[_3b]=dojox.help._names[_3b]||[]).push(_42);
_3d.push(_3f);
if(!_40){
dojox.help._overrides.push([_3a,key]);
}
if((_40||_41)&&_3e){
dojox.help._recursions.push([_3f,_3b,_42]);
}
if(_40){
if(!_3f.__source__){
_3f.__source__=_3f.toString().replace(/^function\b ?/,"function "+_42);
}
if(_3f.toString===Function.prototype.toString){
_3f.toString=dojox.help._toString;
}
}
if(!_3f.help){
_3f.help=dojox.help._help;
}
}
}};
}
