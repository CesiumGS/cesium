/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.math.matrix"]){
dojo._hasResource["dojox.math.matrix"]=true;
dojo.provide("dojox.math.matrix");
dojo.getObject("math.matrix",true,dojox);
dojo.mixin(dojox.math.matrix,{iDF:0,ALMOST_ZERO:1e-10,multiply:function(a,b){
var ay=a.length,ax=a[0].length,by=b.length,bx=b[0].length;
if(ax!=by){
console.warn("Can't multiply matricies of sizes "+ax+","+ay+" and "+bx+","+by);
return [[0]];
}
var c=[];
for(var k=0;k<ay;k++){
c[k]=[];
for(var i=0;i<bx;i++){
c[k][i]=0;
for(var m=0;m<ax;m++){
c[k][i]+=a[k][m]*b[m][i];
}
}
}
return c;
},product:function(){
if(arguments.length==0){
console.warn("can't multiply 0 matrices!");
return 1;
}
var m=arguments[0];
for(var i=1;i<arguments.length;i++){
m=this.multiply(m,arguments[i]);
}
return m;
},sum:function(){
if(arguments.length==0){
console.warn("can't sum 0 matrices!");
return 0;
}
var m=this.copy(arguments[0]);
var _1=m.length;
if(_1==0){
console.warn("can't deal with matrices of 0 rows!");
return 0;
}
var _2=m[0].length;
if(_2==0){
console.warn("can't deal with matrices of 0 cols!");
return 0;
}
for(var i=1;i<arguments.length;++i){
var _3=arguments[i];
if(_3.length!=_1||_3[0].length!=_2){
console.warn("can't add matrices of different dimensions: first dimensions were "+_1+"x"+_2+", current dimensions are "+_3.length+"x"+_3[0].length);
return 0;
}
for(var r=0;r<_1;r++){
for(var c=0;c<_2;c++){
m[r][c]+=_3[r][c];
}
}
}
return m;
},inverse:function(a){
if(a.length==1&&a[0].length==1){
return [[1/a[0][0]]];
}
var _4=a.length,m=this.create(_4,_4),mm=this.adjoint(a),_5=this.determinant(a),dd=0;
if(_5==0){
console.warn("Determinant Equals 0, Not Invertible.");
return [[0]];
}else{
dd=1/_5;
}
for(var i=0;i<_4;i++){
for(var j=0;j<_4;j++){
m[i][j]=dd*mm[i][j];
}
}
return m;
},determinant:function(a){
if(a.length!=a[0].length){
console.warn("Can't calculate the determinant of a non-squre matrix!");
return 0;
}
var _6=a.length,_7=1,b=this.upperTriangle(a);
for(var i=0;i<_6;i++){
var _8=b[i][i];
if(Math.abs(_8)<this.ALMOST_ZERO){
return 0;
}
_7*=_8;
}
_7*=this.iDF;
return _7;
},upperTriangle:function(m){
m=this.copy(m);
var f1=0,_9=0,_a=m.length,v=1;
this.iDF=1;
for(var _b=0;_b<_a-1;_b++){
if(typeof m[_b][_b]!="number"){
console.warn("non-numeric entry found in a numeric matrix: m["+_b+"]["+_b+"]="+m[_b][_b]);
}
v=1;
var _c=0;
while((m[_b][_b]==0)&&!_c){
if(_b+v>=_a){
this.iDF=0;
_c=1;
}else{
for(var r=0;r<_a;r++){
_9=m[_b][r];
m[_b][r]=m[_b+v][r];
m[_b+v][r]=_9;
}
v++;
this.iDF*=-1;
}
}
for(var _d=_b+1;_d<_a;_d++){
if(typeof m[_d][_b]!="number"){
console.warn("non-numeric entry found in a numeric matrix: m["+_d+"]["+_b+"]="+m[_d][_b]);
}
if(typeof m[_b][_d]!="number"){
console.warn("non-numeric entry found in a numeric matrix: m["+_b+"]["+_d+"]="+m[_b][_d]);
}
if(m[_b][_b]!=0){
var f1=(-1)*m[_d][_b]/m[_b][_b];
for(var i=_b;i<_a;i++){
m[_d][i]=f1*m[_b][i]+m[_d][i];
}
}
}
}
return m;
},create:function(a,b,_e){
_e=_e||0;
var m=[];
for(var i=0;i<b;i++){
m[i]=[];
for(var j=0;j<a;j++){
m[i][j]=_e;
}
}
return m;
},ones:function(a,b){
return this.create(a,b,1);
},zeros:function(a,b){
return this.create(a,b);
},identity:function(_f,_10){
_10=_10||1;
var m=[];
for(var i=0;i<_f;i++){
m[i]=[];
for(var j=0;j<_f;j++){
m[i][j]=(i==j?_10:0);
}
}
return m;
},adjoint:function(a){
var tms=a.length;
if(tms<=1){
console.warn("Can't find the adjoint of a matrix with a dimension less than 2");
return [[0]];
}
if(a.length!=a[0].length){
console.warn("Can't find the adjoint of a non-square matrix");
return [[0]];
}
var m=this.create(tms,tms),ap=this.create(tms-1,tms-1);
var ii=0,jj=0,ia=0,ja=0,det=0;
for(var i=0;i<tms;i++){
for(var j=0;j<tms;j++){
ia=0;
for(ii=0;ii<tms;ii++){
if(ii==i){
continue;
}
ja=0;
for(jj=0;jj<tms;jj++){
if(jj==j){
continue;
}
ap[ia][ja]=a[ii][jj];
ja++;
}
ia++;
}
det=this.determinant(ap);
m[i][j]=Math.pow(-1,(i+j))*det;
}
}
return this.transpose(m);
},transpose:function(a){
var m=this.create(a.length,a[0].length);
for(var i=0;i<a.length;i++){
for(var j=0;j<a[i].length;j++){
m[j][i]=a[i][j];
}
}
return m;
},format:function(a,_11){
_11=_11||5;
function _12(x,dp){
var fac=Math.pow(10,dp);
var a=Math.round(x*fac)/fac;
var b=a.toString();
if(b.charAt(0)!="-"){
b=" "+b;
}
if(b.indexOf(".")>-1){
b+=".";
}
while(b.length<dp+3){
b+="0";
}
return b;
};
var ya=a.length;
var xa=ya>0?a[0].length:0;
var _13="";
for(var y=0;y<ya;y++){
_13+="| ";
for(var x=0;x<xa;x++){
_13+=_12(a[y][x],_11)+" ";
}
_13+="|\n";
}
return _13;
},copy:function(a){
var ya=a.length,xa=a[0].length,m=this.create(xa,ya);
for(var y=0;y<ya;y++){
for(var x=0;x<xa;x++){
m[y][x]=a[y][x];
}
}
return m;
},scale:function(a,_14){
a=this.copy(a);
var ya=a.length,xa=a[0].length;
for(var y=0;y<ya;y++){
for(var x=0;x<xa;x++){
a[y][x]*=_14;
}
}
return a;
}});
}
