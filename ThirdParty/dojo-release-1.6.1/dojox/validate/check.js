/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.validate.check"]){
dojo._hasResource["dojox.validate.check"]=true;
dojo.provide("dojox.validate.check");
dojo.experimental;
dojo.require("dojox.validate._base");
dojox.validate.check=function(_1,_2){
var _3=[];
var _4=[];
var _5={isSuccessful:function(){
return (!this.hasInvalid()&&!this.hasMissing());
},hasMissing:function(){
return (_3.length>0);
},getMissing:function(){
return _3;
},isMissing:function(_6){
for(var i=0;i<_3.length;i++){
if(_6==_3[i]){
return true;
}
}
return false;
},hasInvalid:function(){
return (_4.length>0);
},getInvalid:function(){
return _4;
},isInvalid:function(_7){
for(var i=0;i<_4.length;i++){
if(_7==_4[i]){
return true;
}
}
return false;
}};
var _8=function(_9,_a){
return (typeof _a[_9]=="undefined");
};
if(_2.trim instanceof Array){
for(var i=0;i<_2.trim.length;i++){
var _b=_1[_2.trim[i]];
if(_8("type",_b)||_b.type!="text"&&_b.type!="textarea"&&_b.type!="password"){
continue;
}
_b.value=_b.value.replace(/(^\s*|\s*$)/g,"");
}
}
if(_2.uppercase instanceof Array){
for(var i=0;i<_2.uppercase.length;i++){
var _b=_1[_2.uppercase[i]];
if(_8("type",_b)||_b.type!="text"&&_b.type!="textarea"&&_b.type!="password"){
continue;
}
_b.value=_b.value.toUpperCase();
}
}
if(_2.lowercase instanceof Array){
for(var i=0;i<_2.lowercase.length;i++){
var _b=_1[_2.lowercase[i]];
if(_8("type",_b)||_b.type!="text"&&_b.type!="textarea"&&_b.type!="password"){
continue;
}
_b.value=_b.value.toLowerCase();
}
}
if(_2.ucfirst instanceof Array){
for(var i=0;i<_2.ucfirst.length;i++){
var _b=_1[_2.ucfirst[i]];
if(_8("type",_b)||_b.type!="text"&&_b.type!="textarea"&&_b.type!="password"){
continue;
}
_b.value=_b.value.replace(/\b\w+\b/g,function(_c){
return _c.substring(0,1).toUpperCase()+_c.substring(1).toLowerCase();
});
}
}
if(_2.digit instanceof Array){
for(var i=0;i<_2.digit.length;i++){
var _b=_1[_2.digit[i]];
if(_8("type",_b)||_b.type!="text"&&_b.type!="textarea"&&_b.type!="password"){
continue;
}
_b.value=_b.value.replace(/\D/g,"");
}
}
if(_2.required instanceof Array){
for(var i=0;i<_2.required.length;i++){
if(!dojo.isString(_2.required[i])){
continue;
}
var _b=_1[_2.required[i]];
if(!_8("type",_b)&&(_b.type=="text"||_b.type=="textarea"||_b.type=="password"||_b.type=="file")&&/^\s*$/.test(_b.value)){
_3[_3.length]=_b.name;
}else{
if(!_8("type",_b)&&(_b.type=="select-one"||_b.type=="select-multiple")&&(_b.selectedIndex==-1||/^\s*$/.test(_b.options[_b.selectedIndex].value))){
_3[_3.length]=_b.name;
}else{
if(_b instanceof Array){
var _d=false;
for(var j=0;j<_b.length;j++){
if(_b[j].checked){
_d=true;
}
}
if(!_d){
_3[_3.length]=_b[0].name;
}
}
}
}
}
}
if(_2.required instanceof Array){
for(var i=0;i<_2.required.length;i++){
if(!dojo.isObject(_2.required[i])){
continue;
}
var _b,_e;
for(var _f in _2.required[i]){
_b=_1[_f];
_e=_2.required[i][_f];
}
if(_b instanceof Array){
var _d=0;
for(var j=0;j<_b.length;j++){
if(_b[j].checked){
_d++;
}
}
if(_d<_e){
_3[_3.length]=_b[0].name;
}
}else{
if(!_8("type",_b)&&_b.type=="select-multiple"){
var _10=0;
for(var j=0;j<_b.options.length;j++){
if(_b.options[j].selected&&!/^\s*$/.test(_b.options[j].value)){
_10++;
}
}
if(_10<_e){
_3[_3.length]=_b.name;
}
}
}
}
}
if(dojo.isObject(_2.dependencies)){
for(_f in _2.dependencies){
var _b=_1[_f];
if(_8("type",_b)){
continue;
}
if(_b.type!="text"&&_b.type!="textarea"&&_b.type!="password"){
continue;
}
if(/\S+/.test(_b.value)){
continue;
}
if(_5.isMissing(_b.name)){
continue;
}
var _11=_1[_2.dependencies[_f]];
if(_11.type!="text"&&_11.type!="textarea"&&_11.type!="password"){
continue;
}
if(/^\s*$/.test(_11.value)){
continue;
}
_3[_3.length]=_b.name;
}
}
if(dojo.isObject(_2.constraints)){
for(_f in _2.constraints){
var _b=_1[_f];
if(!_b){
continue;
}
if(!_8("tagName",_b)&&(_b.tagName.toLowerCase().indexOf("input")>=0||_b.tagName.toLowerCase().indexOf("textarea")>=0)&&/^\s*$/.test(_b.value)){
continue;
}
var _12=true;
if(dojo.isFunction(_2.constraints[_f])){
_12=_2.constraints[_f](_b.value);
}else{
if(dojo.isArray(_2.constraints[_f])){
if(dojo.isArray(_2.constraints[_f][0])){
for(var i=0;i<_2.constraints[_f].length;i++){
_12=dojox.validate.evaluateConstraint(_2,_2.constraints[_f][i],_f,_b);
if(!_12){
break;
}
}
}else{
_12=dojox.validate.evaluateConstraint(_2,_2.constraints[_f],_f,_b);
}
}
}
if(!_12){
_4[_4.length]=_b.name;
}
}
}
if(dojo.isObject(_2.confirm)){
for(_f in _2.confirm){
var _b=_1[_f];
var _11=_1[_2.confirm[_f]];
if(_8("type",_b)||_8("type",_11)||(_b.type!="text"&&_b.type!="textarea"&&_b.type!="password")||(_11.type!=_b.type)||(_11.value==_b.value)||(_5.isInvalid(_b.name))||(/^\s*$/.test(_11.value))){
continue;
}
_4[_4.length]=_b.name;
}
}
return _5;
};
dojox.validate.evaluateConstraint=function(_13,_14,_15,_16){
var _17=_14[0];
var _18=_14.slice(1);
_18.unshift(_16.value);
if(typeof _17!="undefined"){
return _17.apply(null,_18);
}
return false;
};
}
