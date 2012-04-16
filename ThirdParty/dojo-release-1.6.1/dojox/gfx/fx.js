/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.fx"]){
dojo._hasResource["dojox.gfx.fx"]=true;
dojo.provide("dojox.gfx.fx");
dojo.require("dojox.gfx.matrix");
(function(){
var d=dojo,g=dojox.gfx,m=g.matrix;
function _1(_2,_3){
this.start=_2,this.end=_3;
};
_1.prototype.getValue=function(r){
return (this.end-this.start)*r+this.start;
};
function _4(_5,_6,_7){
this.start=_5,this.end=_6;
this.units=_7;
};
_4.prototype.getValue=function(r){
return (this.end-this.start)*r+this.start+this.units;
};
function _8(_9,_a){
this.start=_9,this.end=_a;
this.temp=new dojo.Color();
};
_8.prototype.getValue=function(r){
return d.blendColors(this.start,this.end,r,this.temp);
};
function _b(_c){
this.values=_c;
this.length=_c.length;
};
_b.prototype.getValue=function(r){
return this.values[Math.min(Math.floor(r*this.length),this.length-1)];
};
function _d(_e,_f){
this.values=_e;
this.def=_f?_f:{};
};
_d.prototype.getValue=function(r){
var ret=dojo.clone(this.def);
for(var i in this.values){
ret[i]=this.values[i].getValue(r);
}
return ret;
};
function _10(_11,_12){
this.stack=_11;
this.original=_12;
};
_10.prototype.getValue=function(r){
var ret=[];
dojo.forEach(this.stack,function(t){
if(t instanceof m.Matrix2D){
ret.push(t);
return;
}
if(t.name=="original"&&this.original){
ret.push(this.original);
return;
}
if(!(t.name in m)){
return;
}
var f=m[t.name];
if(typeof f!="function"){
ret.push(f);
return;
}
var val=dojo.map(t.start,function(v,i){
return (t.end[i]-v)*r+v;
}),_13=f.apply(m,val);
if(_13 instanceof m.Matrix2D){
ret.push(_13);
}
},this);
return ret;
};
var _14=new d.Color(0,0,0,0);
function _15(_16,obj,_17,def){
if(_16.values){
return new _b(_16.values);
}
var _18,_19,end;
if(_16.start){
_19=g.normalizeColor(_16.start);
}else{
_19=_18=obj?(_17?obj[_17]:obj):def;
}
if(_16.end){
end=g.normalizeColor(_16.end);
}else{
if(!_18){
_18=obj?(_17?obj[_17]:obj):def;
}
end=_18;
}
return new _8(_19,end);
};
function _1a(_1b,obj,_1c,def){
if(_1b.values){
return new _b(_1b.values);
}
var _1d,_1e,end;
if(_1b.start){
_1e=_1b.start;
}else{
_1e=_1d=obj?obj[_1c]:def;
}
if(_1b.end){
end=_1b.end;
}else{
if(typeof _1d!="number"){
_1d=obj?obj[_1c]:def;
}
end=_1d;
}
return new _1(_1e,end);
};
g.fx.animateStroke=function(_1f){
if(!_1f.easing){
_1f.easing=d._defaultEasing;
}
var _20=new d.Animation(_1f),_21=_1f.shape,_22;
d.connect(_20,"beforeBegin",_20,function(){
_22=_21.getStroke();
var _23=_1f.color,_24={},_25,_26,end;
if(_23){
_24.color=_15(_23,_22,"color",_14);
}
_23=_1f.style;
if(_23&&_23.values){
_24.style=new _b(_23.values);
}
_23=_1f.width;
if(_23){
_24.width=_1a(_23,_22,"width",1);
}
_23=_1f.cap;
if(_23&&_23.values){
_24.cap=new _b(_23.values);
}
_23=_1f.join;
if(_23){
if(_23.values){
_24.join=new _b(_23.values);
}else{
_26=_23.start?_23.start:(_22&&_22.join||0);
end=_23.end?_23.end:(_22&&_22.join||0);
if(typeof _26=="number"&&typeof end=="number"){
_24.join=new _1(_26,end);
}
}
}
this.curve=new _d(_24,_22);
});
d.connect(_20,"onAnimate",_21,"setStroke");
return _20;
};
g.fx.animateFill=function(_27){
if(!_27.easing){
_27.easing=d._defaultEasing;
}
var _28=new d.Animation(_27),_29=_27.shape,_2a;
d.connect(_28,"beforeBegin",_28,function(){
_2a=_29.getFill();
var _2b=_27.color,_2c={};
if(_2b){
this.curve=_15(_2b,_2a,"",_14);
}
});
d.connect(_28,"onAnimate",_29,"setFill");
return _28;
};
g.fx.animateFont=function(_2d){
if(!_2d.easing){
_2d.easing=d._defaultEasing;
}
var _2e=new d.Animation(_2d),_2f=_2d.shape,_30;
d.connect(_2e,"beforeBegin",_2e,function(){
_30=_2f.getFont();
var _31=_2d.style,_32={},_33,_34,end;
if(_31&&_31.values){
_32.style=new _b(_31.values);
}
_31=_2d.variant;
if(_31&&_31.values){
_32.variant=new _b(_31.values);
}
_31=_2d.weight;
if(_31&&_31.values){
_32.weight=new _b(_31.values);
}
_31=_2d.family;
if(_31&&_31.values){
_32.family=new _b(_31.values);
}
_31=_2d.size;
if(_31&&_31.units){
_34=parseFloat(_31.start?_31.start:(_2f.font&&_2f.font.size||"0"));
end=parseFloat(_31.end?_31.end:(_2f.font&&_2f.font.size||"0"));
_32.size=new _4(_34,end,_31.units);
}
this.curve=new _d(_32,_30);
});
d.connect(_2e,"onAnimate",_2f,"setFont");
return _2e;
};
g.fx.animateTransform=function(_35){
if(!_35.easing){
_35.easing=d._defaultEasing;
}
var _36=new d.Animation(_35),_37=_35.shape,_38;
d.connect(_36,"beforeBegin",_36,function(){
_38=_37.getTransform();
this.curve=new _10(_35.transform,_38);
});
d.connect(_36,"onAnimate",_37,"setTransform");
return _36;
};
})();
}
