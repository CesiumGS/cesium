/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.ui.Button"]){
dojo._hasResource["dojox.drawing.ui.Button"]=true;
dojo.provide("dojox.drawing.ui.Button");
dojox.drawing.ui.Button=dojox.drawing.util.oo.declare(function(_1){
_1.subShape=true;
dojo.mixin(this,_1);
this.width=_1.data.width||_1.data.rx*2;
this.height=_1.data.height||_1.data.ry*2;
this.y=_1.data.y||_1.data.cy-_1.data.ry;
this.id=this.id||this.util.uid(this.type);
this.util.attr(this.container,"id",this.id);
if(this.callback){
this.hitched=dojo.hitch(this.scope||window,this.callback,this);
}
_1.drawingType="ui";
if(_1.data.width&&_1.data.height){
this.shape=new dojox.drawing.stencil.Rect(_1);
}else{
this.shape=new dojox.drawing.stencil.Ellipse(_1);
}
var _2=function(s,p,v){
dojo.forEach(["norm","over","down","selected"],function(nm){
s[nm].fill[p]=v;
});
};
_2(this.style.button,"y2",this.height+this.y);
_2(this.style.button,"y1",this.y);
if(_1.icon&&!_1.icon.text){
var _3=this.drawing.getConstructor(_1.icon.type);
var o=this.makeOptions(_1.icon);
o.data=dojo.mixin(o.data,this.style.button.icon.norm);
if(o.data&&o.data.borderWidth===0){
o.data.fill=this.style.button.icon.norm.fill=o.data.color;
}else{
if(_1.icon.type=="line"||(_1.icon.type=="path"&&!_1.icon.closePath)){
this.style.button.icon.selected.color=this.style.button.icon.selected.fill;
}else{
}
}
this.icon=new _3(o);
}else{
if(_1.text||(_1.icon&&_1.icon.text)){
o=this.makeOptions(_1.text||_1.icon.text);
o.data.color=this.style.button.icon.norm.color;
this.style.button.icon.selected.color=this.style.button.icon.selected.fill;
this.icon=new dojox.drawing.stencil.Text(o);
this.icon.attr({height:this.icon._lineHeight,y:((this.height-this.icon._lineHeight)/2)+this.y});
}
}
var c=this.drawing.getConstructor(this.toolType);
if(c){
this.drawing.addUI("tooltip",{data:{text:c.setup.tooltip},button:this});
}
this.onOut();
},{callback:null,scope:null,hitched:null,toolType:"",onClick:function(_4){
},makeOptions:function(d,s){
s=s||1;
d=dojo.clone(d);
var o={util:this.util,mouse:this.mouse,container:this.container,subShape:true};
if(typeof (d)=="string"){
o.data={x:this.data.x-5,y:this.data.y+2,width:this.data.width,height:this.data.height,text:d,makeFit:true};
}else{
if(d.points){
dojo.forEach(d.points,function(pt){
pt.x=pt.x*this.data.width*0.01*s+this.data.x;
pt.y=pt.y*this.data.height*0.01*s+this.data.y;
},this);
o.data={};
for(var n in d){
if(n!="points"){
o.data[n]=d[n];
}
}
o.points=d.points;
}else{
for(n in d){
if(/x|width/.test(n)){
d[n]=d[n]*this.data.width*0.01*s;
}else{
if(/y|height/.test(n)){
d[n]=d[n]*this.data.height*0.01*s;
}
}
if(/x/.test(n)&&!/r/.test(n)){
d[n]+=this.data.x;
}else{
if(/y/.test(n)&&!/r/.test(n)){
d[n]+=this.data.y;
}
}
}
delete d.type;
o.data=d;
}
}
o.drawingType="ui";
return o;
if(d.borderWidth!==undefined){
o.data.borderWidth=d.borderWidth;
}
return o;
},enabled:true,selected:false,type:"drawing.library.UI.Button",select:function(){
this.selected=true;
if(this.icon){
this.icon.attr(this.style.button.icon.selected);
}
this._change(this.style.button.selected);
this.shape.shadow&&this.shape.shadow.hide();
},deselect:function(){
this.selected=false;
if(this.icon){
this.icon.attr(this.style.button.icon.norm);
}
this.shape.shadow&&this.shape.shadow.show();
this._change(this.style.button.norm);
},disable:function(){
if(!this.enabled){
return;
}
this.enabled=false;
this._change(this.style.button.disabled);
this.icon.attr({color:this.style.button.norm.color});
},enable:function(){
if(this.enabled){
return;
}
this.enabled=true;
this._change(this.style.button.norm);
this.icon.attr({color:this.style.button.icon.norm.color});
},_change:function(_5){
this.shape.attr(_5);
this.shape.shadow&&this.shape.shadow.container.moveToBack();
if(this.icon){
this.icon.shape.moveToFront();
}
},onOver:function(){
if(this.selected||!this.enabled){
return;
}
this._change(this.style.button.over);
},onOut:function(){
if(this.selected){
return;
}
this._change(this.style.button.norm);
},onDown:function(){
if(this.selected||!this.enabled){
return;
}
this._change(this.style.button.selected);
},onUp:function(){
if(!this.enabled){
return;
}
this._change(this.style.button.over);
if(this.hitched){
this.hitched();
}
this.onClick(this);
},attr:function(_6){
if(this.icon){
this.icon.attr(_6);
}
}});
dojox.drawing.register({name:"dojox.drawing.ui.Button"},"stencil");
}
