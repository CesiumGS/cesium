/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.dropMode.DefaultDropMode"]){
dojo._hasResource["dojox.mdnd.dropMode.DefaultDropMode"]=true;
dojo.provide("dojox.mdnd.dropMode.DefaultDropMode");
dojo.require("dojox.mdnd.AreaManager");
dojo.declare("dojox.mdnd.dropMode.DefaultDropMode",null,{_oldXPoint:null,_oldYPoint:null,_oldBehaviour:"up",addArea:function(_1,_2){
var _3=_1.length;
var _4=dojo.position(_2.node,true);
_2.coords={"x":_4.x,"y":_4.y};
if(_3==0){
_1.push(_2);
}else{
var x=_2.coords.x;
for(var i=0;i<_3;i++){
if(x<_1[i].coords.x){
for(var j=_3-1;j>=i;j--){
_1[j+1]=_1[j];
}
_1[i]=_2;
break;
}
}
if(i==_3){
_1.push(_2);
}
}
return _1;
},updateAreas:function(_5){
var _6=_5.length;
if(_6>1){
var _7,_8;
for(var i=0;i<_6;i++){
var _9=_5[i];
var _a;
_9.coords.x1=-1;
_9.coords.x2=-1;
if(i==0){
_a=_5[i+1];
this._updateArea(_9);
this._updateArea(_a);
_7=_9.coords.x+_9.node.offsetWidth;
_8=_a.coords.x;
_9.coords.x2=_7+(_8-_7)/2;
}else{
if(i==_6-1){
_9.coords.x1=_5[i-1].coords.x2;
}else{
_a=_5[i+1];
this._updateArea(_a);
_7=_9.coords.x+_9.node.offsetWidth;
_8=_a.coords.x;
_9.coords.x1=_5[i-1].coords.x2;
_9.coords.x2=_7+(_8-_7)/2;
}
}
}
}
},_updateArea:function(_b){
var _c=dojo.position(_b.node,true);
_b.coords.x=_c.x;
_b.coords.y=_c.y;
},initItems:function(_d){
dojo.forEach(_d.items,function(_e){
var _f=_e.item.node;
var _10=dojo.position(_f,true);
var y=_10.y+_10.h/2;
_e.y=y;
});
_d.initItems=true;
},refreshItems:function(_11,_12,_13,_14){
if(_12==-1){
return;
}else{
if(_11&&_13&&_13.h){
var _15=_13.h;
if(_11.margin){
_15+=_11.margin.t;
}
var _16=_11.items.length;
for(var i=_12;i<_16;i++){
var _17=_11.items[i];
if(_14){
_17.y+=_15;
}else{
_17.y-=_15;
}
}
}
}
},getDragPoint:function(_18,_19,_1a){
var y=_18.y;
if(this._oldYPoint){
if(y>this._oldYPoint){
this._oldBehaviour="down";
y+=_19.h;
}else{
if(y<=this._oldYPoint){
this._oldBehaviour="up";
}
}
}
this._oldYPoint=y;
return {"x":_18.x+(_19.w/2),"y":y};
},getTargetArea:function(_1b,_1c,_1d){
var _1e=0;
var x=_1c.x;
var end=_1b.length;
if(end>1){
var _1f=0,_20="right",_21=false;
if(_1d==-1||arguments.length<3){
_21=true;
}else{
if(this._checkInterval(_1b,_1d,x)){
_1e=_1d;
}else{
if(this._oldXPoint<x){
_1f=_1d+1;
}else{
_1f=_1d-1;
end=0;
_20="left";
}
_21=true;
}
}
if(_21){
if(_20==="right"){
for(var i=_1f;i<end;i++){
if(this._checkInterval(_1b,i,x)){
_1e=i;
break;
}
}
}else{
for(var i=_1f;i>=end;i--){
if(this._checkInterval(_1b,i,x)){
_1e=i;
break;
}
}
}
}
}
this._oldXPoint=x;
return _1e;
},_checkInterval:function(_22,_23,x){
var _24=_22[_23].coords;
if(_24.x1==-1){
if(x<=_24.x2){
return true;
}
}else{
if(_24.x2==-1){
if(x>_24.x1){
return true;
}
}else{
if(_24.x1<x&&x<=_24.x2){
return true;
}
}
}
return false;
},getDropIndex:function(_25,_26){
var _27=_25.items.length;
var _28=_25.coords;
var y=_26.y;
if(_27>0){
for(var i=0;i<_27;i++){
if(y<_25.items[i].y){
return i;
}else{
if(i==_27-1){
return -1;
}
}
}
}
return -1;
},destroy:function(){
}});
(function(){
dojox.mdnd.areaManager()._dropMode=new dojox.mdnd.dropMode.DefaultDropMode();
}());
}
