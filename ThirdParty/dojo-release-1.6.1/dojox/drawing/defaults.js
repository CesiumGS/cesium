/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.defaults"]){
dojo._hasResource["dojox.drawing.defaults"]=true;
dojo.provide("dojox.drawing.defaults");
dojox.drawing.defaults={clickMode:true,clickable:true,current:null,currentHit:null,angleSnap:1,zAxis:false,zAxisEnabled:true,zAngle:225,renderHitLines:true,renderHitLayer:true,labelSameColor:false,useSelectedStyle:true,norm:{width:1,color:"#000000",style:"Solid",cap:"round",fill:"#CCCCCC"},selected:{width:6,color:"#00FF00"},highlighted:{width:6,color:"#FF00FF",style:"Solid",cap:"round",fill:"#E11EBB"},disabled:{width:1,color:"#666666",style:"solid",cap:"round",fill:"#cccccc"},hitNorm:{width:6,color:{r:0,g:255,b:255,a:0},style:"Solid",cap:"round",fill:{r:255,g:255,b:255,a:0}},hitSelected:{width:6,color:"#FF9900",style:"Solid",cap:"round",fill:{r:255,g:255,b:255,a:0}},hitHighlighted:{width:6,color:"#FFFF00",style:"Solid",cap:"round",fill:{r:255,g:255,b:255,a:0}},anchors:{size:10,width:2,color:"#999",style:"solid",fill:"#fff",cap:"square",minSize:10,marginZero:5},arrows:{length:30,width:16},text:{minWidth:100,deleteEmptyCreate:true,deleteEmptyModify:true,pad:3,size:"18px",family:"sans-serif",weight:"normal",color:"#000000"},textDisabled:{size:"18px",family:"sans-serif",weight:"normal",color:"#cccccc"},textMode:{create:{width:2,style:"dotted",color:"#666666",fill:null},edit:{width:1,style:"dashed",color:"#666",fill:null}},button:{norm:{"color":"#cccccc","fill":{type:"linear",x1:0,x2:0,y1:0,y2:100,colors:[{offset:0.5,color:"#ffffff"},{offset:1,color:"#e5e5e5"}]}},over:{"fill":{type:"linear",x1:0,x2:0,y1:0,y2:100,colors:[{offset:0.5,color:"#ffffff"},{offset:1,color:"#e1eaf5"}]},"color":"#92a0b3"},down:{"fill":{type:"linear",x1:0,x2:0,y1:0,y2:100,colors:[{offset:0,color:"#e1eaf5"},{offset:1,color:"#ffffff"}]},"color":"#92a0b3"},selected:{"fill":{type:"linear",x1:0,x2:0,y1:0,y2:100,colors:[{offset:0,color:"#97b4bf"},{offset:1,color:"#c8dae1"}]},"color":"#92a0b3"},icon:{norm:{fill:null,color:"#92a0b3"},selected:{fill:"#ffffff",color:"#92a0b3"}}},copy:function(){
var _1=function(_2){
if(typeof (_2)!="object"||_2===null||_2===undefined){
return _2;
}
var o;
if(_2.push){
o=[];
for(var i=0;i<_2.length;i++){
o.push(_1(_2[i]));
}
return o;
}
o={};
for(var nm in _2){
if(nm!="copy"){
if(typeof (_2[nm])=="object"){
o[nm]=_1(_2[nm]);
}else{
o[nm]=_2[nm];
}
}
}
return o;
};
var o=_1(this);
o.current=o.norm;
o.currentHit=o.hitNorm;
o.currentText=o.text;
return o;
}};
}
