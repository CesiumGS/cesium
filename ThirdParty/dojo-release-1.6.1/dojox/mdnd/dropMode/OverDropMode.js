/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.dropMode.OverDropMode"]){
dojo._hasResource["dojox.mdnd.dropMode.OverDropMode"]=true;
dojo.provide("dojox.mdnd.dropMode.OverDropMode");
dojo.require("dojox.mdnd.AreaManager");
dojo.declare("dojox.mdnd.dropMode.OverDropMode",null,{_oldXPoint:null,_oldYPoint:null,_oldBehaviour:"up",constructor:function(){
this._dragHandler=[dojo.connect(dojox.mdnd.areaManager(),"onDragEnter",function(_1,_2){
var m=dojox.mdnd.areaManager();
if(m._oldIndexArea==-1){
m._oldIndexArea=m._lastValidIndexArea;
}
})];
},addArea:function(_3,_4){
var _5=_3.length,_6=dojo.position(_4.node,true);
_4.coords={"x":_6.x,"y":_6.y};
if(_5==0){
_3.push(_4);
}else{
var x=_4.coords.x;
for(var i=0;i<_5;i++){
if(x<_3[i].coords.x){
for(var j=_5-1;j>=i;j--){
_3[j+1]=_3[j];
}
_3[i]=_4;
break;
}
}
if(i==_5){
_3.push(_4);
}
}
return _3;
},updateAreas:function(_7){
var _8=_7.length;
for(var i=0;i<_8;i++){
this._updateArea(_7[i]);
}
},_updateArea:function(_9){
var _a=dojo.position(_9.node,true);
_9.coords.x=_a.x;
_9.coords.x2=_a.x+_a.w;
_9.coords.y=_a.y;
},initItems:function(_b){
dojo.forEach(_b.items,function(_c){
var _d=_c.item.node;
var _e=dojo.position(_d,true);
var y=_e.y+_e.h/2;
_c.y=y;
});
_b.initItems=true;
},refreshItems:function(_f,_10,_11,_12){
if(_10==-1){
return;
}else{
if(_f&&_11&&_11.h){
var _13=_11.h;
if(_f.margin){
_13+=_f.margin.t;
}
var _14=_f.items.length;
for(var i=_10;i<_14;i++){
var _15=_f.items[i];
if(_12){
_15.y+=_13;
}else{
_15.y-=_13;
}
}
}
}
},getDragPoint:function(_16,_17,_18){
return {"x":_18.x,"y":_18.y};
},getTargetArea:function(_19,_1a,_1b){
var _1c=0;
var x=_1a.x;
var y=_1a.y;
var end=_19.length;
var _1d=0,_1e="right",_1f=false;
if(_1b==-1||arguments.length<3){
_1f=true;
}else{
if(this._checkInterval(_19,_1b,x,y)){
_1c=_1b;
}else{
if(this._oldXPoint<x){
_1d=_1b+1;
}else{
_1d=_1b-1;
end=0;
_1e="left";
}
_1f=true;
}
}
if(_1f){
if(_1e==="right"){
for(var i=_1d;i<end;i++){
if(this._checkInterval(_19,i,x,y)){
_1c=i;
break;
}
}
if(i==end){
_1c=-1;
}
}else{
for(var i=_1d;i>=end;i--){
if(this._checkInterval(_19,i,x,y)){
_1c=i;
break;
}
}
if(i==end-1){
_1c=-1;
}
}
}
this._oldXPoint=x;
return _1c;
},_checkInterval:function(_20,_21,x,y){
var _22=_20[_21];
var _23=_22.node;
var _24=_22.coords;
var _25=_24.x;
var _26=_24.x2;
var _27=_24.y;
var _28=_27+_23.offsetHeight;
if(_25<=x&&x<=_26&&_27<=y&&y<=_28){
return true;
}
return false;
},getDropIndex:function(_29,_2a){
var _2b=_29.items.length;
var _2c=_29.coords;
var y=_2a.y;
if(_2b>0){
for(var i=0;i<_2b;i++){
if(y<_29.items[i].y){
return i;
}else{
if(i==_2b-1){
return -1;
}
}
}
}
return -1;
},destroy:function(){
dojo.forEach(this._dragHandler,dojo.disconnect);
}});
(function(){
dojox.mdnd.areaManager()._dropMode=new dojox.mdnd.dropMode.OverDropMode();
}());
}
