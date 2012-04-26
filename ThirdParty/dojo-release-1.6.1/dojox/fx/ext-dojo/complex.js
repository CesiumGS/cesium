/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.ext-dojo.complex"]){
dojo._hasResource["dojox.fx.ext-dojo.complex"]=true;
dojo.provide("dojox.fx.ext-dojo.complex");
(function(){
var da=dojo.animateProperty;
dojo.animateProperty=function(_1){
var d=dojo;
var _2=da(_1);
dojo.connect(_2,"beforeBegin",function(){
_2.curve.getValue=function(r){
var _3={};
for(var p in this._properties){
var _4=this._properties[p],_5=_4.start;
if(_5 instanceof d.Color){
_3[p]=d.blendColors(_5,_4.end,r,_4.tempColor).toCss();
}else{
if(_5 instanceof dojox.fx._Complex){
_3[p]=_5.getValue(r);
}else{
if(!d.isArray(_5)){
_3[p]=((_4.end-_5)*r)+_5+(p!="opacity"?_4.units||"px":0);
}
}
}
}
return _3;
};
var pm={};
for(var p in this.properties){
var o=this.properties[p];
if(typeof (o.start)=="string"&&/\(/.test(o.start)){
this.curve._properties[p].start=new dojox.fx._Complex(o);
}
}
});
return _2;
};
})();
dojo.declare("dojox.fx._Complex",null,{PROP:/\([+-]?[\w|,|#|\.|\s]*\)/g,constructor:function(_6){
var _7=_6.start.match(this.PROP);
var _8=_6.end.match(this.PROP);
var _9=dojo.map(_7,this.getProps,this);
var _a=dojo.map(_8,this.getProps,this);
this._properties={};
this.strProp=_6.start;
dojo.forEach(_9,function(_b,i){
dojo.forEach(_b,function(p,j){
this.strProp=this.strProp.replace(p,"PROP_"+i+""+j);
this._properties["PROP_"+i+""+j]=this.makePropObject(p,_a[i][j]);
},this);
},this);
},getValue:function(r){
var _c=this.strProp,u;
for(var nm in this._properties){
var v,o=this._properties[nm];
if(o.units=="isColor"){
v=dojo.blendColors(o.beg,o.end,r).toCss(false);
u="";
}else{
v=((o.end-o.beg)*r)+o.beg;
u=o.units;
}
_c=_c.replace(nm,v+u);
}
return _c;
},makePropObject:function(_d,_e){
var b=this.getNumAndUnits(_d);
var e=this.getNumAndUnits(_e);
return {beg:b.num,end:e.num,units:b.units};
},getProps:function(_f){
_f=_f.substring(1,_f.length-1);
var s;
if(/,/.test(_f)){
_f=_f.replace(/\s/g,"");
s=_f.split(",");
}else{
_f=_f.replace(/\s{2,}/g," ");
s=_f.split(" ");
}
return s;
},getNumAndUnits:function(_10){
if(!_10){
return {};
}
if(/#/.test(_10)){
return {num:new dojo.Color(_10),units:"isColor"};
}
var o={num:parseFloat(/-*[\d\.\d|\d]{1,}/.exec(_10).join(""))};
o.units=/[a-z]{1,}/.exec(_10);
o.units=o.units&&o.units.length?o.units.join(""):"";
return o;
}});
}
