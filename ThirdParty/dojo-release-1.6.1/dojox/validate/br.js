/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.validate.br"]){
dojo._hasResource["dojox.validate.br"]=true;
dojo.provide("dojox.validate.br");
dojo.require("dojox.validate._base");
dojox.validate.br.isValidCnpj=function(_1){
if(!dojo.isString(_1)){
if(!_1){
return false;
}
_1=_1+"";
while(_1.length<14){
_1="0"+_1;
}
}
var _2={format:["##.###.###/####-##","########/####-##","############-##","##############"]};
if(dojox.validate.isNumberFormat(_1,_2)){
_1=_1.replace("/","").replace(/\./g,"").replace("-","");
var _3=[];
var dv=[];
var i,j,_4;
for(i=0;i<10;i++){
_4="";
for(j=0;j<_1.length;j++){
_4+=""+i;
}
if(_1===_4){
return false;
}
}
for(i=0;i<12;i++){
_3.push(parseInt(_1.charAt(i),10));
}
for(i=12;i<14;i++){
dv.push(parseInt(_1.charAt(i),10));
}
var _5=[9,8,7,6,5,4,3,2,9,8,7,6].reverse();
var _6=0;
for(i=0;i<_3.length;i++){
_6+=_3[i]*_5[i];
}
var _7=_6%11;
if(_7==dv[0]){
_6=0;
_5=[9,8,7,6,5,4,3,2,9,8,7,6,5].reverse();
_3.push(_7);
for(i=0;i<_3.length;i++){
_6+=_3[i]*_5[i];
}
var _8=_6%11;
if(_8===dv[1]){
return true;
}
}
}
return false;
};
dojox.validate.br.computeCnpjDv=function(_9){
if(!dojo.isString(_9)){
if(!_9){
return "";
}
_9=_9+"";
while(_9.length<12){
_9="0"+_9;
}
}
var _a={format:["##.###.###/####","########/####","############"]};
if(dojox.validate.isNumberFormat(_9,_a)){
_9=_9.replace("/","").replace(/\./g,"");
var _b=[];
var i,j,_c;
for(i=0;i<10;i++){
_c="";
for(j=0;j<_9.length;j++){
_c+=""+i;
}
if(_9===_c){
return "";
}
}
for(i=0;i<_9.length;i++){
_b.push(parseInt(_9.charAt(i),10));
}
var _d=[9,8,7,6,5,4,3,2,9,8,7,6].reverse();
var _e=0;
for(i=0;i<_b.length;i++){
_e+=_b[i]*_d[i];
}
var _f=_e%11;
_e=0;
_d=[9,8,7,6,5,4,3,2,9,8,7,6,5].reverse();
_b.push(_f);
for(i=0;i<_b.length;i++){
_e+=_b[i]*_d[i];
}
var dv1=_e%11;
return (""+_f)+dv1;
}
return "";
};
dojox.validate.br.isValidCpf=function(_10){
if(!dojo.isString(_10)){
if(!_10){
return false;
}
_10=_10+"";
while(_10.length<11){
_10="0"+_10;
}
}
var _11={format:["###.###.###-##","#########-##","###########"]};
if(dojox.validate.isNumberFormat(_10,_11)){
_10=_10.replace("-","").replace(/\./g,"");
var cpf=[];
var dv=[];
var i,j,tmp;
for(i=0;i<10;i++){
tmp="";
for(j=0;j<_10.length;j++){
tmp+=""+i;
}
if(_10===tmp){
return false;
}
}
for(i=0;i<9;i++){
cpf.push(parseInt(_10.charAt(i),10));
}
for(i=9;i<12;i++){
dv.push(parseInt(_10.charAt(i),10));
}
var _12=[9,8,7,6,5,4,3,2,1].reverse();
var sum=0;
for(i=0;i<cpf.length;i++){
sum+=cpf[i]*_12[i];
}
var dv0=sum%11;
if(dv0==dv[0]){
sum=0;
_12=[9,8,7,6,5,4,3,2,1,0].reverse();
cpf.push(dv0);
for(i=0;i<cpf.length;i++){
sum+=cpf[i]*_12[i];
}
var dv1=sum%11;
if(dv1===dv[1]){
return true;
}
}
}
return false;
};
dojox.validate.br.computeCpfDv=function(_13){
if(!dojo.isString(_13)){
if(!_13){
return "";
}
_13=_13+"";
while(_13.length<9){
_13="0"+_13;
}
}
var _14={format:["###.###.###","#########"]};
if(dojox.validate.isNumberFormat(_13,_14)){
_13=_13.replace(/\./g,"");
var cpf=[];
for(i=0;i<10;i++){
tmp="";
for(j=0;j<_13.length;j++){
tmp+=""+i;
}
if(_13===tmp){
return "";
}
}
for(i=0;i<_13.length;i++){
cpf.push(parseInt(_13.charAt(i),10));
}
var _15=[9,8,7,6,5,4,3,2,1].reverse();
var sum=0;
for(i=0;i<cpf.length;i++){
sum+=cpf[i]*_15[i];
}
var dv0=sum%11;
sum=0;
_15=[9,8,7,6,5,4,3,2,1,0].reverse();
cpf.push(dv0);
for(i=0;i<cpf.length;i++){
sum+=cpf[i]*_15[i];
}
var dv1=sum%11;
return (""+dv0)+dv1;
}
return "";
};
}
