/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.docs"]){
dojo._hasResource["dojox.lang.docs"]=true;
dojo.provide("dojox.lang.docs");
(function(){
function _1(_2){
};
var _3={};
var _4=[];
var _5=dojox.lang.docs._loadedDocs={};
var _6=function(_7,_8){
_3[_8]=_7;
};
var _9=function(_a){
var _b=_a.type||"";
var _c,_d=false,_e=false,_f;
_b=_b.replace(/\?/,function(){
_d=true;
return "";
});
_b=_b.replace(/\[\]/,function(){
_e=true;
return "";
});
if(_b.match(/HTML/)){
_b="string";
}else{
if(_b=="String"||_b=="Number"||_b=="Boolean"||_b=="Object"||_b=="Array"||_b=="Integer"||_b=="Function"){
_b=_b.toLowerCase();
}else{
if(_b=="bool"){
_b="boolean";
}else{
if(_b){
_c=dojo.getObject(_b)||{};
_f=true;
}else{
_c={};
}
}
}
}
_c=_c||{type:_b};
if(_e){
_c={items:_c,type:"array"};
_f=false;
}
if(!_f){
if(_d){
_c.optional=true;
}
if(/const/.test(_a.tags)){
_c.readonly=true;
}
}
return _c;
};
var _10=function(_11,_12){
var _13=_5[_12];
if(_13){
_11.description=_13.description;
_11.properties={};
_11.methods={};
if(_13.properties){
var _14=_13.properties;
for(var i=0,l=_14.length;i<l;i++){
if(_14[i].scope=="prototype"){
var _15=_11.properties[_14[i].name]=_9(_14[i]);
_15.description=_14[i].summary;
}
}
}
if(_13.methods){
var _16=_13.methods;
for(i=0,l=_16.length;i<l;i++){
_12=_16[i].name;
if(_12&&_16[i].scope=="prototype"){
var _17=_11.methods[_12]={};
_17.description=_16[i].summary;
var _18=_16[i].parameters;
if(_18){
_17.parameters=[];
for(var j=0,k=_18.length;j<k;j++){
var _19=_18[j];
var _1a=_17.parameters[j]=_9(_19);
_1a.name=_19.name;
_1a.optional="optional"==_19.usage;
}
}
var ret=_16[i]["return-types"];
if(ret&&ret[0]){
var _1b=_9(ret[0]);
if(_1b.type){
_17.returns=_1b;
}
}
}
}
}
var _1c=_13.superclass;
if(_1c){
_11["extends"]=dojo.getObject(_1c);
}
}
};
var _1d=function(_1e){
_4.push(_1e);
};
var _1f=dojo.declare;
dojo.declare=function(_20){
var _21=_1f.apply(this,arguments);
_6(_21,_20);
return _21;
};
dojo.mixin(dojo.declare,_1f);
var _22;
var _23=dojo.require;
dojo.require=function(_24){
_1d(_24);
var _25=_23.apply(this,arguments);
return _25;
};
dojox.lang.docs.init=function(_26){
function _27(){
dojo.require=_23;
_4=null;
try{
dojo.xhrGet({sync:!_26,url:dojo.baseUrl+"../util/docscripts/api.json",handleAs:"text"}).addCallbacks(function(obj){
_5=(new Function("return "+obj))();
obj=null;
_6=_10;
for(var i in _3){
_6(_3[i],i);
}
_3=null;
},_1);
}
catch(e){
_1(e);
}
};
if(_22){
return null;
}
_22=true;
var _28=function(_29,_2a){
return dojo.xhrGet({sync:_2a||!_26,url:dojo.baseUrl+"../util/docscripts/api/"+_29+".json",handleAs:"text"}).addCallback(function(obj){
obj=(new Function("return "+obj))();
for(var _2b in obj){
if(!_5[_2b]){
_5[_2b]=obj[_2b];
}
}
});
};
try{
var _2c=_4.shift();
_28(_2c,true).addCallbacks(function(){
_1d=function(_2d){
if(!_5[_2d]){
try{
_28(_2d);
}
catch(e){
_5[_2d]={};
}
}
};
dojo.forEach(_4,function(mod){
_1d(mod);
});
_4=null;
_6=_10;
for(i in _3){
_6(_3[i],i);
}
_3=null;
},_27);
}
catch(e){
_27();
}
return null;
};
})();
}
