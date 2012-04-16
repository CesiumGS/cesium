/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.color._base"]){
dojo._hasResource["dojox.color._base"]=true;
dojo.provide("dojox.color._base");
dojo.require("dojo.colors");
dojox.color.Color=dojo.Color;
dojox.color.blend=dojo.blendColors;
dojox.color.fromRgb=dojo.colorFromRgb;
dojox.color.fromHex=dojo.colorFromHex;
dojox.color.fromArray=dojo.colorFromArray;
dojox.color.fromString=dojo.colorFromString;
dojox.color.greyscale=dojo.colors.makeGrey;
dojo.mixin(dojox.color,{fromCmy:function(_1,_2,_3){
if(dojo.isArray(_1)){
_2=_1[1],_3=_1[2],_1=_1[0];
}else{
if(dojo.isObject(_1)){
_2=_1.m,_3=_1.y,_1=_1.c;
}
}
_1/=100,_2/=100,_3/=100;
var r=1-_1,g=1-_2,b=1-_3;
return new dojox.color.Color({r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)});
},fromCmyk:function(_4,_5,_6,_7){
if(dojo.isArray(_4)){
_5=_4[1],_6=_4[2],_7=_4[3],_4=_4[0];
}else{
if(dojo.isObject(_4)){
_5=_4.m,_6=_4.y,_7=_4.b,_4=_4.c;
}
}
_4/=100,_5/=100,_6/=100,_7/=100;
var r,g,b;
r=1-Math.min(1,_4*(1-_7)+_7);
g=1-Math.min(1,_5*(1-_7)+_7);
b=1-Math.min(1,_6*(1-_7)+_7);
return new dojox.color.Color({r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)});
},fromHsl:function(_8,_9,_a){
if(dojo.isArray(_8)){
_9=_8[1],_a=_8[2],_8=_8[0];
}else{
if(dojo.isObject(_8)){
_9=_8.s,_a=_8.l,_8=_8.h;
}
}
_9/=100;
_a/=100;
while(_8<0){
_8+=360;
}
while(_8>=360){
_8-=360;
}
var r,g,b;
if(_8<120){
r=(120-_8)/60,g=_8/60,b=0;
}else{
if(_8<240){
r=0,g=(240-_8)/60,b=(_8-120)/60;
}else{
r=(_8-240)/60,g=0,b=(360-_8)/60;
}
}
r=2*_9*Math.min(r,1)+(1-_9);
g=2*_9*Math.min(g,1)+(1-_9);
b=2*_9*Math.min(b,1)+(1-_9);
if(_a<0.5){
r*=_a,g*=_a,b*=_a;
}else{
r=(1-_a)*r+2*_a-1;
g=(1-_a)*g+2*_a-1;
b=(1-_a)*b+2*_a-1;
}
return new dojox.color.Color({r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)});
},fromHsv:function(_b,_c,_d){
if(dojo.isArray(_b)){
_c=_b[1],_d=_b[2],_b=_b[0];
}else{
if(dojo.isObject(_b)){
_c=_b.s,_d=_b.v,_b=_b.h;
}
}
if(_b==360){
_b=0;
}
_c/=100;
_d/=100;
var r,g,b;
if(_c==0){
r=_d,b=_d,g=_d;
}else{
var _e=_b/60,i=Math.floor(_e),f=_e-i;
var p=_d*(1-_c);
var q=_d*(1-(_c*f));
var t=_d*(1-(_c*(1-f)));
switch(i){
case 0:
r=_d,g=t,b=p;
break;
case 1:
r=q,g=_d,b=p;
break;
case 2:
r=p,g=_d,b=t;
break;
case 3:
r=p,g=q,b=_d;
break;
case 4:
r=t,g=p,b=_d;
break;
case 5:
r=_d,g=p,b=q;
break;
}
}
return new dojox.color.Color({r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)});
}});
dojo.extend(dojox.color.Color,{toCmy:function(){
var _f=1-(this.r/255),_10=1-(this.g/255),_11=1-(this.b/255);
return {c:Math.round(_f*100),m:Math.round(_10*100),y:Math.round(_11*100)};
},toCmyk:function(){
var _12,_13,_14,_15;
var r=this.r/255,g=this.g/255,b=this.b/255;
_15=Math.min(1-r,1-g,1-b);
_12=(1-r-_15)/(1-_15);
_13=(1-g-_15)/(1-_15);
_14=(1-b-_15)/(1-_15);
return {c:Math.round(_12*100),m:Math.round(_13*100),y:Math.round(_14*100),b:Math.round(_15*100)};
},toHsl:function(){
var r=this.r/255,g=this.g/255,b=this.b/255;
var min=Math.min(r,b,g),max=Math.max(r,g,b);
var _16=max-min;
var h=0,s=0,l=(min+max)/2;
if(l>0&&l<1){
s=_16/((l<0.5)?(2*l):(2-2*l));
}
if(_16>0){
if(max==r&&max!=g){
h+=(g-b)/_16;
}
if(max==g&&max!=b){
h+=(2+(b-r)/_16);
}
if(max==b&&max!=r){
h+=(4+(r-g)/_16);
}
h*=60;
}
return {h:h,s:Math.round(s*100),l:Math.round(l*100)};
},toHsv:function(){
var r=this.r/255,g=this.g/255,b=this.b/255;
var min=Math.min(r,b,g),max=Math.max(r,g,b);
var _17=max-min;
var h=null,s=(max==0)?0:(_17/max);
if(s==0){
h=0;
}else{
if(r==max){
h=60*(g-b)/_17;
}else{
if(g==max){
h=120+60*(b-r)/_17;
}else{
h=240+60*(r-g)/_17;
}
}
if(h<0){
h+=360;
}
}
return {h:h,s:Math.round(s*100),v:Math.round(max*100)};
}});
}
