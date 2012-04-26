/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.math.curves"]){
dojo._hasResource["dojox.math.curves"]=true;
dojo.provide("dojox.math.curves");
dojo.getObject("math.curves",true,dojox);
dojo.mixin(dojox.math.curves,{Line:function(_1,_2){
this.start=_1;
this.end=_2;
this.dimensions=_1.length;
for(var i=0;i<_1.length;i++){
_1[i]=Number(_1[i]);
}
for(var i=0;i<_2.length;i++){
_2[i]=Number(_2[i]);
}
this.getValue=function(n){
var _3=new Array(this.dimensions);
for(var i=0;i<this.dimensions;i++){
_3[i]=((this.end[i]-this.start[i])*n)+this.start[i];
}
return _3;
};
return this;
},Bezier:function(_4){
this.getValue=function(_5){
if(_5>=1){
return this.p[this.p.length-1];
}
if(_5<=0){
return this.p[0];
}
var _6=new Array(this.p[0].length);
for(var k=0;j<this.p[0].length;k++){
_6[k]=0;
}
for(var j=0;j<this.p[0].length;j++){
var C=0;
var D=0;
for(var i=0;i<this.p.length;i++){
C+=this.p[i][j]*this.p[this.p.length-1][0]*dojox.math.bernstein(_5,this.p.length,i);
}
for(var l=0;l<this.p.length;l++){
D+=this.p[this.p.length-1][0]*dojox.math.bernstein(_5,this.p.length,l);
}
_6[j]=C/D;
}
return _6;
};
this.p=_4;
return this;
},CatmullRom:function(_7,c){
this.getValue=function(_8){
var _9=_8*(this.p.length-1);
var _a=Math.floor(_9);
var _b=_9-_a;
var i0=_a-1;
if(i0<0){
i0=0;
}
var i=_a;
var i1=_a+1;
if(i1>=this.p.length){
i1=this.p.length-1;
}
var i2=_a+2;
if(i2>=this.p.length){
i2=this.p.length-1;
}
var u=_b;
var u2=_b*_b;
var u3=_b*_b*_b;
var _c=new Array(this.p[0].length);
for(var k=0;k<this.p[0].length;k++){
var x1=(-this.c*this.p[i0][k])+((2-this.c)*this.p[i][k])+((this.c-2)*this.p[i1][k])+(this.c*this.p[i2][k]);
var x2=(2*this.c*this.p[i0][k])+((this.c-3)*this.p[i][k])+((3-2*this.c)*this.p[i1][k])+(-this.c*this.p[i2][k]);
var x3=(-this.c*this.p[i0][k])+(this.c*this.p[i1][k]);
var x4=this.p[i][k];
_c[k]=x1*u3+x2*u2+x3*u+x4;
}
return _c;
};
if(!c){
this.c=0.7;
}else{
this.c=c;
}
this.p=_7;
return this;
},Arc:function(_d,_e,_f){
function _10(a,b){
var c=new Array(a.length);
for(var i=0;i<a.length;i++){
c[i]=a[i]+b[i];
}
return c;
};
function _11(a){
var b=new Array(a.length);
for(var i=0;i<a.length;i++){
b[i]=-a[i];
}
return b;
};
var _12=dojox.math.midpoint(_d,_e);
var _13=_10(_11(_12),_d);
var rad=Math.sqrt(Math.pow(_13[0],2)+Math.pow(_13[1],2));
var _14=dojox.math.radiansToDegrees(Math.atan(_13[1]/_13[0]));
if(_13[0]<0){
_14-=90;
}else{
_14+=90;
}
dojox.math.curves.CenteredArc.call(this,_12,rad,_14,_14+(_f?-180:180));
},CenteredArc:function(_15,_16,_17,end){
this.center=_15;
this.radius=_16;
this.start=_17||0;
this.end=end;
this.getValue=function(n){
var _18=new Array(2);
var _19=dojox.math.degreesToRadians(this.start+((this.end-this.start)*n));
_18[0]=this.center[0]+this.radius*Math.sin(_19);
_18[1]=this.center[1]-this.radius*Math.cos(_19);
return _18;
};
return this;
},Circle:function(_1a,_1b){
dojox.math.curves.CenteredArc.call(this,_1a,_1b,0,360);
return this;
},Path:function(){
var _1c=[];
var _1d=[];
var _1e=[];
var _1f=0;
this.add=function(_20,_21){
if(_21<0){
console.error("dojox.math.curves.Path.add: weight cannot be less than 0");
}
_1c.push(_20);
_1d.push(_21);
_1f+=_21;
_22();
};
this.remove=function(_23){
for(var i=0;i<_1c.length;i++){
if(_1c[i]==_23){
_1c.splice(i,1);
_1f-=_1d.splice(i,1)[0];
break;
}
}
_22();
};
this.removeAll=function(){
_1c=[];
_1d=[];
_1f=0;
};
this.getValue=function(n){
var _24=false,_25=0;
for(var i=0;i<_1e.length;i++){
var r=_1e[i];
if(n>=r[0]&&n<r[1]){
var _26=(n-r[0])/r[2];
_25=_1c[i].getValue(_26);
_24=true;
break;
}
}
if(!_24){
_25=_1c[_1c.length-1].getValue(1);
}
for(var j=0;j<i;j++){
_25=dojox.math.points.translate(_25,_1c[j].getValue(1));
}
return _25;
};
function _22(){
var _27=0;
for(var i=0;i<_1d.length;i++){
var end=_27+_1d[i]/_1f;
var len=end-_27;
_1e[i]=[_27,end,len];
_27=end;
}
};
return this;
}});
}
