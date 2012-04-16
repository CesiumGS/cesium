/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.json.ref"]){
dojo._hasResource["dojox.json.ref"]=true;
dojo.provide("dojox.json.ref");
dojo.require("dojo.date.stamp");
dojox.json.ref={resolveJson:function(_1,_2){
_2=_2||{};
var _3=_2.idAttribute||"id";
var _4=this.refAttribute;
var _5=_2.idAsRef;
var _6=_2.idPrefix||"";
var _7=_2.assignAbsoluteIds;
var _8=_2.index||{};
var _9=_2.timeStamps;
var _a,_b=[];
var _c=/^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/;
var _d=this._addProp;
var F=function(){
};
function _e(it,_f,_10,_11,_12,_13){
var i,_14,val,id=_3 in it?it[_3]:_10;
if(_3 in it||((id!==undefined)&&_11)){
id=(_6+id).replace(_c,"$2$3");
}
var _15=_13||it;
if(id!==undefined){
if(_7){
it.__id=id;
}
if(_2.schemas&&(!(it instanceof Array))&&(val=id.match(/^(.+\/)[^\.\[]*$/))){
_12=_2.schemas[val[1]];
}
if(_8[id]&&((it instanceof Array)==(_8[id] instanceof Array))){
_15=_8[id];
delete _15.$ref;
delete _15._loadObject;
_14=true;
}else{
var _16=_12&&_12.prototype;
if(_16){
F.prototype=_16;
_15=new F();
}
}
_8[id]=_15;
if(_9){
_9[id]=_2.time;
}
}
while(_12){
var _17=_12.properties;
if(_17){
for(i in it){
var _18=_17[i];
if(_18&&_18.format=="date-time"&&typeof it[i]=="string"){
it[i]=dojo.date.stamp.fromISOString(it[i]);
}
}
}
_12=_12["extends"];
}
var _19=it.length;
for(i in it){
if(i==_19){
break;
}
if(it.hasOwnProperty(i)){
val=it[i];
if((typeof val=="object")&&val&&!(val instanceof Date)&&i!="__parent"){
_a=val[_4]||(_5&&val[_3]);
if(!_a||!val.__parent){
if(it!=_b){
val.__parent=_15;
}
}
if(_a){
delete it[i];
var _1a=_a.toString().replace(/(#)([^\.\[])/,"$1.$2").match(/(^([^\[]*\/)?[^#\.\[]*)#?([\.\[].*)?/);
if(_8[(_6+_a).replace(_c,"$2$3")]){
_a=_8[(_6+_a).replace(_c,"$2$3")];
}else{
if((_a=(_1a[1]=="$"||_1a[1]=="this"||_1a[1]=="")?_1:_8[(_6+_1a[1]).replace(_c,"$2$3")])){
if(_1a[3]){
_1a[3].replace(/(\[([^\]]+)\])|(\.?([^\.\[]+))/g,function(t,a,b,c,d){
_a=_a&&_a[b?b.replace(/[\"\'\\]/,""):d];
});
}
}
}
if(_a){
val=_a;
}else{
if(!_f){
var _1b;
if(!_1b){
_b.push(_15);
}
_1b=true;
val=_e(val,false,val[_4],true,_18);
val._loadObject=_2.loader;
}
}
}else{
if(!_f){
val=_e(val,_b==it,id===undefined?undefined:_d(id,i),false,_18,_15!=it&&typeof _15[i]=="object"&&_15[i]);
}
}
}
it[i]=val;
if(_15!=it&&!_15.__isDirty){
var old=_15[i];
_15[i]=val;
if(_14&&val!==old&&!_15._loadObject&&!(i.charAt(0)=="_"&&i.charAt(1)=="_")&&i!="$ref"&&!(val instanceof Date&&old instanceof Date&&val.getTime()==old.getTime())&&!(typeof val=="function"&&typeof old=="function"&&val.toString()==old.toString())&&_8.onUpdate){
_8.onUpdate(_15,i,old,val);
}
}
}
}
if(_14&&(_3 in it||_15 instanceof Array)){
for(i in _15){
if(!_15.__isDirty&&_15.hasOwnProperty(i)&&!it.hasOwnProperty(i)&&!(i.charAt(0)=="_"&&i.charAt(1)=="_")&&!(_15 instanceof Array&&isNaN(i))){
if(_8.onUpdate&&i!="_loadObject"&&i!="_idAttr"){
_8.onUpdate(_15,i,_15[i],undefined);
}
delete _15[i];
while(_15 instanceof Array&&_15.length&&_15[_15.length-1]===undefined){
_15.length--;
}
}
}
}else{
if(_8.onLoad){
_8.onLoad(_15);
}
}
return _15;
};
if(_1&&typeof _1=="object"){
_1=_e(_1,false,_2.defaultId,true);
_e(_b,false);
}
return _1;
},fromJson:function(str,_1c){
function ref(_1d){
var _1e={};
_1e[this.refAttribute]=_1d;
return _1e;
};
try{
var _1f=eval("("+str+")");
}
catch(e){
throw new SyntaxError("Invalid JSON string: "+e.message+" parsing: "+str);
}
if(_1f){
return this.resolveJson(_1f,_1c);
}
return _1f;
},toJson:function(it,_20,_21,_22){
var _23=this._useRefs;
var _24=this._addProp;
var _25=this.refAttribute;
_21=_21||"";
var _26={};
var _27={};
function _28(it,_29,_2a){
if(typeof it=="object"&&it){
var _2b;
if(it instanceof Date){
return "\""+dojo.date.stamp.toISOString(it,{zulu:true})+"\"";
}
var id=it.__id;
if(id){
if(_29!="#"&&((_23&&!id.match(/#/))||_26[id])){
var ref=id;
if(id.charAt(0)!="#"){
if(it.__clientId==id){
ref="cid:"+id;
}else{
if(id.substring(0,_21.length)==_21){
ref=id.substring(_21.length);
}else{
ref=id;
}
}
}
var _2c={};
_2c[_25]=ref;
return _28(_2c,"#");
}
_29=id;
}else{
it.__id=_29;
_27[_29]=it;
}
_26[_29]=it;
_2a=_2a||"";
var _2d=_20?_2a+dojo.toJsonIndentStr:"";
var _2e=_20?"\n":"";
var sep=_20?" ":"";
if(it instanceof Array){
var res=dojo.map(it,function(obj,i){
var val=_28(obj,_24(_29,i),_2d);
if(typeof val!="string"){
val="undefined";
}
return _2e+_2d+val;
});
return "["+res.join(","+sep)+_2e+_2a+"]";
}
var _2f=[];
for(var i in it){
if(it.hasOwnProperty(i)){
var _30;
if(typeof i=="number"){
_30="\""+i+"\"";
}else{
if(typeof i=="string"&&(i.charAt(0)!="_"||i.charAt(1)!="_")){
_30=dojo._escapeString(i);
}else{
continue;
}
}
var val=_28(it[i],_24(_29,i),_2d);
if(typeof val!="string"){
continue;
}
_2f.push(_2e+_2d+_30+":"+sep+val);
}
}
return "{"+_2f.join(","+sep)+_2e+_2a+"}";
}else{
if(typeof it=="function"&&dojox.json.ref.serializeFunctions){
return it.toString();
}
}
return dojo.toJson(it);
};
var _31=_28(it,"#","");
if(!_22){
for(var i in _27){
delete _27[i].__id;
}
}
return _31;
},_addProp:function(id,_32){
return id+(id.match(/#/)?id.length==1?"":".":"#")+_32;
},refAttribute:"$ref",_useRefs:false,serializeFunctions:false};
}
