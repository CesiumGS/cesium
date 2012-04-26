/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.html.ext-dojo.style"]){
dojo._hasResource["dojox.html.ext-dojo.style"]=true;
dojo.provide("dojox.html.ext-dojo.style");
dojo.experimental("dojox.html.ext-dojo.style");
dojo.mixin(dojox.html["ext-dojo"].style,{supportsTransform:true,_toPx:function(_1){
var ds=dojo.style,_2=this._conversion;
if(typeof _1==="number"){
return _1+"px";
}else{
if(_1.toLowerCase().indexOf("px")!=-1){
return _1;
}
}
!_2.parentNode&&dojo.place(_2,dojo.body());
ds(_2,"margin",_1);
return ds(_2,"margin");
},init:function(){
var ds=dojo.style,_3=dojo.doc.documentElement.style,_4=dojox.html["ext-dojo"].style;
dojo.style=function(_5,_6,_7){
var n=dojo.byId(_5),tr=(_6=="transform"),to=(_6=="transformOrigin"),_8=arguments.length;
if(_8==3){
if(tr){
_4.setTransform(n,_7,true);
}else{
if(to){
_4.setTransformOrigin(n,_7);
}else{
ds(_5,_6,_7);
}
}
}
if(_8==2){
if(tr){
return _4.getTransform(_5);
}else{
if(to){
return _4.getTransformOrigin(_5);
}else{
return ds(_5,_6);
}
}
}
};
for(var i=0,_9=["WebkitT","MozT","OT","t"];i<_9.length;i++){
if(typeof _3[_9[i]+"ransform"]!=="undefined"){
this.tPropertyName=_9[i]+"ransform";
}
if(typeof _3[_9[i]+"ransformOrigin"]!=="undefined"){
this.toPropertyName=_9[i]+"ransformOrigin";
}
}
if(this.tPropertyName){
this.setTransform=function(_a,_b){
return dojo.style(_a,this.tPropertyName,_b);
};
this.getTransform=function(_c){
return dojo.style(_c,this.tPropertyName);
};
}else{
if(dojo.isIE){
this.setTransform=this._setTransformFilter;
this.getTransform=this._getTransformFilter;
}
}
if(this.toPropertyName){
this.setTransformOrigin=function(_d,_e){
return dojo.style(_d,this.toPropertyName,_e);
};
this.getTransformOrigin=function(_f){
return dojo.style(_f,this.toPropertyName);
};
}else{
if(dojo.isIE){
this.setTransformOrigin=this._setTransformOriginFilter;
this.getTransformOrigin=this._getTransformOriginFilter;
}else{
this.supportsTransform=false;
}
}
this._conversion=dojo.create("div",{style:{position:"absolute",top:"-100px",left:"-100px",fontSize:0,width:"0",backgroundPosition:"50% 50%"}});
},_notSupported:function(){
console.warn("Sorry, this browser doesn't support transform and transform-origin");
},_setTransformOriginFilter:function(_10,_11){
var to=dojo.trim(_11).replace(" top"," 0").replace("left ","0 ").replace(" center","50%").replace("center ","50% ").replace(" bottom"," 100%").replace("right ","100% ").replace(/\s+/," "),_12=to.split(" "),n=dojo.byId(_10),t=this.getTransform(n),_13=true;
for(var i=0;i<_12.length;i++){
_13=_13&&/^0|(\d+(%|px|pt|in|pc|mm|cm))$/.test(_12[i]);
if(_12[i].indexOf("%")==-1){
_12[i]=this._toPx(_12[i]);
}
}
if(!_13){
return;
}
if(!_12.length||_12.length>2){
return;
}
dojo.attr(n,"dojo-transform-origin",_12.join(" "));
t&&this.setTransform(_10,t);
},_getTransformOriginFilter:function(_14){
return dojo.attr(_14,"dojo-transform-origin")||"50% 50%";
},_setTransformFilter:function(_15,_16){
var t=_16.replace(/\s/g,""),n=dojo.byId(_15),_17=t.split(")"),_18=1,_19=1,_1a="DXImageTransform.Microsoft.Matrix",_1b=dojo.hasAttr,_1c=dojo.attr,PI=Math.PI,cos=Math.cos,sin=Math.sin,tan=Math.tan,max=Math.max,min=Math.min,abs=Math.abs,_1d=PI/180,_1e=PI/200,ct="",_1f="",_20=[],x0=0,y0=0,dx=0,dy=0,xc=0,yc=0,a=0,m11=1,m12=0,m21=0,m22=1,tx=0,ty=0,_21=[m11,m12,m21,m22,tx,ty],_22=false,ds=dojo.style,_23=ds(n,"position")=="absolute"?"absolute":"relative",w=ds(n,"width")+ds(n,"paddingLeft")+ds(n,"paddingRight"),h=ds(n,"height")+ds(n,"paddingTop")+ds(n,"paddingBottom"),_24=this._toPx;
!_1b(n,"dojo-transform-origin")&&this.setTransformOrigin(n,"50% 50%");
for(var i=0,l=_17.length;i<l;i++){
_20=_17[i].match(/matrix|rotate|scaleX|scaleY|scale|skewX|skewY|skew|translateX|translateY|translate/);
_1f=_20?_20[0]:"";
switch(_1f){
case "matrix":
ct=_17[i].replace(/matrix\(|\)/g,"");
var _25=ct.split(",");
m11=_21[0]*_25[0]+_21[1]*_25[2];
m12=_21[0]*_25[1]+_21[1]*_25[3];
m21=_21[2]*_25[0]+_21[3]*_25[2];
m22=_21[2]*_25[1]+_21[3]*_25[3];
tx=_21[4]+_25[4];
ty=_21[5]+_25[5];
break;
case "rotate":
ct=_17[i].replace(/rotate\(|\)/g,"");
_18=ct.indexOf("deg")!=-1?_1d:ct.indexOf("grad")!=-1?_1e:1;
a=parseFloat(ct)*_18;
var s=sin(a),c=cos(a);
m11=_21[0]*c+_21[1]*s;
m12=-_21[0]*s+_21[1]*c;
m21=_21[2]*c+_21[3]*s;
m22=-_21[2]*s+_21[3]*c;
break;
case "skewX":
ct=_17[i].replace(/skewX\(|\)/g,"");
_18=ct.indexOf("deg")!=-1?_1d:ct.indexOf("grad")!=-1?_1e:1;
var ta=tan(parseFloat(ct)*_18);
m11=_21[0];
m12=_21[0]*ta+_21[1];
m21=_21[2];
m22=_21[2]*ta+_21[3];
break;
case "skewY":
ct=_17[i].replace(/skewY\(|\)/g,"");
_18=ct.indexOf("deg")!=-1?_1d:ct.indexOf("grad")!=-1?_1e:1;
ta=tan(parseFloat(ct)*_18);
m11=_21[0]+_21[1]*ta;
m12=_21[1];
m21=_21[2]+_21[3]*ta;
m22=_21[3];
break;
case "skew":
ct=_17[i].replace(/skew\(|\)/g,"");
var _26=ct.split(",");
_26[1]=_26[1]||"0";
_18=_26[0].indexOf("deg")!=-1?_1d:_26[0].indexOf("grad")!=-1?_1e:1;
_19=_26[1].indexOf("deg")!=-1?_1d:_26[1].indexOf("grad")!=-1?_1e:1;
var a0=tan(parseFloat(_26[0])*_18),a1=tan(parseFloat(_26[1])*_19);
m11=_21[0]+_21[1]*a1;
m12=_21[0]*a0+_21[1];
m21=_21[2]+_21[3]*a1;
m22=_21[2]*a0+_21[3];
break;
case "scaleX":
ct=parseFloat(_17[i].replace(/scaleX\(|\)/g,""))||1;
m11=_21[0]*ct;
m12=_21[1];
m21=_21[2]*ct;
m22=_21[3];
break;
case "scaleY":
ct=parseFloat(_17[i].replace(/scaleY\(|\)/g,""))||1;
m11=_21[0];
m12=_21[1]*ct;
m21=_21[2];
m22=_21[3]*ct;
break;
case "scale":
ct=_17[i].replace(/scale\(|\)/g,"");
var _27=ct.split(",");
_27[1]=_27[1]||_27[0];
m11=_21[0]*_27[0];
m12=_21[1]*_27[1];
m21=_21[2]*_27[0];
m22=_21[3]*_27[1];
break;
case "translateX":
ct=parseInt(_17[i].replace(/translateX\(|\)/g,""))||1;
m11=_21[0];
m12=_21[1];
m21=_21[2];
m22=_21[3];
tx=_24(ct);
tx&&_1c(n,"dojo-transform-matrix-tx",tx);
break;
case "translateY":
ct=parseInt(_17[i].replace(/translateY\(|\)/g,""))||1;
m11=_21[0];
m12=_21[1];
m21=_21[2];
m22=_21[3];
ty=_24(ct);
ty&&_1c(n,"dojo-transform-matrix-ty",ty);
break;
case "translate":
ct=_17[i].replace(/translate\(|\)/g,"");
m11=_21[0];
m12=_21[1];
m21=_21[2];
m22=_21[3];
var _28=ct.split(",");
_28[0]=parseInt(_24(_28[0]))||0;
_28[1]=parseInt(_24(_28[1]))||0;
tx=_28[0];
ty=_28[1];
tx&&_1c(n,"dojo-transform-matrix-tx",tx);
ty&&_1c(n,"dojo-transform-matrix-ty",ty);
break;
}
_21=[m11,m12,m21,m22,tx,ty];
}
var Bx=min(w*m11+h*m12,min(min(w*m11,h*m12),0)),By=min(w*m21+h*m22,min(min(w*m21,h*m22),0));
dx=-Bx;
dy=-By;
if(dojo.isIE<8){
n.style.zoom="1";
if(_23!="absolute"){
var _29=ds(_15.parentNode,"width"),tw=abs(w*m11),th=abs(h*m12),_2a=max(tw+th,max(max(th,tw),0));
dx-=(_2a-w)/2-(_29>_2a?0:(_2a-_29)/2);
}
}else{
if(dojo.isIE==8){
ds(n,"zIndex")=="auto"&&(n.style.zIndex="0");
}
}
try{
_22=!!n.filters.item(_1a);
}
catch(e){
_22=false;
}
if(_22){
n.filters.item(_1a).M11=m11;
n.filters.item(_1a).M12=m12;
n.filters.item(_1a).M21=m21;
n.filters.item(_1a).M22=m22;
n.filters.item(_1a).filterType="bilinear";
n.filters.item(_1a).Dx=0;
n.filters.item(_1a).Dy=0;
n.filters.item(_1a).sizingMethod="auto expand";
}else{
n.style.filter+=" progid:"+_1a+"(M11="+m11+",M12="+m12+",M21="+m21+",M22="+m22+",FilterType='bilinear',Dx=0,Dy=0,sizingMethod='auto expand')";
}
tx=parseInt(_1c(n,"dojo-transform-matrix-tx")||"0");
ty=parseInt(_1c(n,"dojo-transform-matrix-ty")||"0");
var _2b=_1c(n,"dojo-transform-origin").split(" ");
for(i=0;i<2;i++){
_2b[i]=_2b[i]||"50%";
}
xc=(_2b[0].toString().indexOf("%")!=-1)?w*parseInt(_2b[0])*0.01:_2b[0];
yc=(_2b[1].toString().indexOf("%")!=-1)?h*parseInt(_2b[1])*0.01:_2b[1];
if(_1b(n,"dojo-startX")){
x0=parseInt(_1c(n,"dojo-startX"));
}else{
x0=parseInt(ds(n,"left"));
_1c(n,"dojo-startX",_23=="absolute"?x0:"0");
}
if(_1b(n,"dojo-startY")){
y0=parseInt(_1c(n,"dojo-startY"));
}else{
y0=parseInt(ds(n,"top"));
_1c(n,"dojo-startY",_23=="absolute"?y0:"0");
}
ds(n,{position:_23,left:x0-parseInt(dx)+parseInt(xc)-((parseInt(xc)-tx)*m11+(parseInt(yc)-ty)*m12)+"px",top:y0-parseInt(dy)+parseInt(yc)-((parseInt(xc)-tx)*m21+(parseInt(yc)-ty)*m22)+"px"});
},_getTransformFilter:function(_2c){
try{
var n=dojo.byId(_2c),_2d=n.filters.item(0);
return "matrix("+_2d.M11+", "+_2d.M12+", "+_2d.M21+", "+_2d.M22+", "+(dojo.attr(_2c,"dojo-transform-tx")||"0")+", "+(dojo.attr(_2c,"dojo-transform-ty")||"0")+")";
}
catch(e){
return "matrix(1, 0, 0, 1, 0, 0)";
}
},setTransform:function(){
this._notSupported();
},setTransformOrigin:function(){
this._notSupported();
}});
dojox.html["ext-dojo"].style.init();
}
