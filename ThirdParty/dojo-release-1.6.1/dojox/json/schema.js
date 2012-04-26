/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.json.schema"]){
dojo._hasResource["dojox.json.schema"]=true;
dojo.provide("dojox.json.schema");
dojox.json.schema.validate=function(_1,_2){
return this._validate(_1,_2,false);
};
dojox.json.schema.checkPropertyChange=function(_3,_4,_5){
return this._validate(_3,_4,_5||"property");
};
dojox.json.schema.mustBeValid=function(_6){
if(!_6.valid){
throw new TypeError(dojo.map(_6.errors,function(_7){
return "for property "+_7.property+": "+_7.message;
}).join(", "));
}
};
dojox.json.schema._validate=function(_8,_9,_a){
var _b=[];
function _c(_d,_e,_f,i){
var l;
_f+=_f?typeof i=="number"?"["+i+"]":typeof i=="undefined"?"":"."+i:i;
function _10(_11){
_b.push({property:_f,message:_11});
};
if((typeof _e!="object"||_e instanceof Array)&&(_f||typeof _e!="function")){
if(typeof _e=="function"){
if(!(Object(_d) instanceof _e)){
_10("is not an instance of the class/constructor "+_e.name);
}
}else{
if(_e){
_10("Invalid schema/property definition "+_e);
}
}
return null;
}
if(_a&&_e.readonly){
_10("is a readonly field, it can not be changed");
}
if(_e["extends"]){
_c(_d,_e["extends"],_f,i);
}
function _12(_13,_14){
if(_13){
if(typeof _13=="string"&&_13!="any"&&(_13=="null"?_14!==null:typeof _14!=_13)&&!(_14 instanceof Array&&_13=="array")&&!(_13=="integer"&&_14%1===0)){
return [{property:_f,message:(typeof _14)+" value found, but a "+_13+" is required"}];
}
if(_13 instanceof Array){
var _15=[];
for(var j=0;j<_13.length;j++){
if(!(_15=_12(_13[j],_14)).length){
break;
}
}
if(_15.length){
return _15;
}
}else{
if(typeof _13=="object"){
var _16=_b;
_b=[];
_c(_14,_13,_f);
var _17=_b;
_b=_16;
return _17;
}
}
}
return [];
};
if(_d===undefined){
if(!_e.optional){
_10("is missing and it is not optional");
}
}else{
_b=_b.concat(_12(_e.type,_d));
if(_e.disallow&&!_12(_e.disallow,_d).length){
_10(" disallowed value was matched");
}
if(_d!==null){
if(_d instanceof Array){
if(_e.items){
if(_e.items instanceof Array){
for(i=0,l=_d.length;i<l;i++){
_b.concat(_c(_d[i],_e.items[i],_f,i));
}
}else{
for(i=0,l=_d.length;i<l;i++){
_b.concat(_c(_d[i],_e.items,_f,i));
}
}
}
if(_e.minItems&&_d.length<_e.minItems){
_10("There must be a minimum of "+_e.minItems+" in the array");
}
if(_e.maxItems&&_d.length>_e.maxItems){
_10("There must be a maximum of "+_e.maxItems+" in the array");
}
}else{
if(_e.properties){
_b.concat(_18(_d,_e.properties,_f,_e.additionalProperties));
}
}
if(_e.pattern&&typeof _d=="string"&&!_d.match(_e.pattern)){
_10("does not match the regex pattern "+_e.pattern);
}
if(_e.maxLength&&typeof _d=="string"&&_d.length>_e.maxLength){
_10("may only be "+_e.maxLength+" characters long");
}
if(_e.minLength&&typeof _d=="string"&&_d.length<_e.minLength){
_10("must be at least "+_e.minLength+" characters long");
}
if(typeof _e.minimum!==undefined&&typeof _d==typeof _e.minimum&&_e.minimum>_d){
_10("must have a minimum value of "+_e.minimum);
}
if(typeof _e.maximum!==undefined&&typeof _d==typeof _e.maximum&&_e.maximum<_d){
_10("must have a maximum value of "+_e.maximum);
}
if(_e["enum"]){
var _19=_e["enum"];
l=_19.length;
var _1a;
for(var j=0;j<l;j++){
if(_19[j]===_d){
_1a=1;
break;
}
}
if(!_1a){
_10("does not have a value in the enumeration "+_19.join(", "));
}
}
if(typeof _e.maxDecimal=="number"&&(_d.toString().match(new RegExp("\\.[0-9]{"+(_e.maxDecimal+1)+",}")))){
_10("may only have "+_e.maxDecimal+" digits of decimal places");
}
}
}
return null;
};
function _18(_1b,_1c,_1d,_1e){
if(typeof _1c=="object"){
if(typeof _1b!="object"||_1b instanceof Array){
_b.push({property:_1d,message:"an object is required"});
}
for(var i in _1c){
if(_1c.hasOwnProperty(i)&&!(i.charAt(0)=="_"&&i.charAt(1)=="_")){
var _1f=_1b[i];
var _20=_1c[i];
_c(_1f,_20,_1d,i);
}
}
}
for(i in _1b){
if(_1b.hasOwnProperty(i)&&!(i.charAt(0)=="_"&&i.charAt(1)=="_")&&_1c&&!_1c[i]&&_1e===false){
_b.push({property:_1d,message:(typeof _1f)+"The property "+i+" is not defined in the schema and the schema does not allow additional properties"});
}
var _21=_1c&&_1c[i]&&_1c[i].requires;
if(_21&&!(_21 in _1b)){
_b.push({property:_1d,message:"the presence of the property "+i+" requires that "+_21+" also be present"});
}
_1f=_1b[i];
if(_1c&&typeof _1c=="object"&&!(i in _1c)){
_c(_1f,_1e,_1d,i);
}
if(!_a&&_1f&&_1f.$schema){
_b=_b.concat(_c(_1f,_1f.$schema,_1d,i));
}
}
return _b;
};
if(_9){
_c(_8,_9,"",_a||"");
}
if(!_a&&_8&&_8.$schema){
_c(_8,_8.$schema,"","");
}
return {valid:!_b.length,errors:_b};
};
}
