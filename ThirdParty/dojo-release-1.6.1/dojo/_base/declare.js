/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.declare"]){
dojo._hasResource["dojo._base.declare"]=true;
dojo.provide("dojo._base.declare");
dojo.require("dojo._base.lang");
dojo.require("dojo._base.array");
(function(){
var d=dojo,_1=d._mixin,op=Object.prototype,_2=op.toString,_3=new Function,_4=0,_5="constructor";
function _6(_7,_8){
throw new Error("declare"+(_8?" "+_8:"")+": "+_7);
};
function _9(_a,_b){
var _c=[],_d=[{cls:0,refs:[]}],_e={},_f=1,l=_a.length,i=0,j,lin,_10,top,_11,rec,_12,_13;
for(;i<l;++i){
_10=_a[i];
if(!_10){
_6("mixin #"+i+" is unknown. Did you use dojo.require to pull it in?",_b);
}else{
if(_2.call(_10)!="[object Function]"){
_6("mixin #"+i+" is not a callable constructor.",_b);
}
}
lin=_10._meta?_10._meta.bases:[_10];
top=0;
for(j=lin.length-1;j>=0;--j){
_11=lin[j].prototype;
if(!_11.hasOwnProperty("declaredClass")){
_11.declaredClass="uniqName_"+(_4++);
}
_12=_11.declaredClass;
if(!_e.hasOwnProperty(_12)){
_e[_12]={count:0,refs:[],cls:lin[j]};
++_f;
}
rec=_e[_12];
if(top&&top!==rec){
rec.refs.push(top);
++top.count;
}
top=rec;
}
++top.count;
_d[0].refs.push(top);
}
while(_d.length){
top=_d.pop();
_c.push(top.cls);
--_f;
while(_13=top.refs,_13.length==1){
top=_13[0];
if(!top||--top.count){
top=0;
break;
}
_c.push(top.cls);
--_f;
}
if(top){
for(i=0,l=_13.length;i<l;++i){
top=_13[i];
if(!--top.count){
_d.push(top);
}
}
}
}
if(_f){
_6("can't build consistent linearization",_b);
}
_10=_a[0];
_c[0]=_10?_10._meta&&_10===_c[_c.length-_10._meta.bases.length]?_10._meta.bases.length:1:0;
return _c;
};
function _14(_15,a,f){
var _16,_17,_18,_19,_1a,_1b,_1c,opf,pos,_1d=this._inherited=this._inherited||{};
if(typeof _15=="string"){
_16=_15;
_15=a;
a=f;
}
f=0;
_19=_15.callee;
_16=_16||_19.nom;
if(!_16){
_6("can't deduce a name to call inherited()",this.declaredClass);
}
_1a=this.constructor._meta;
_18=_1a.bases;
pos=_1d.p;
if(_16!=_5){
if(_1d.c!==_19){
pos=0;
_1b=_18[0];
_1a=_1b._meta;
if(_1a.hidden[_16]!==_19){
_17=_1a.chains;
if(_17&&typeof _17[_16]=="string"){
_6("calling chained method with inherited: "+_16,this.declaredClass);
}
do{
_1a=_1b._meta;
_1c=_1b.prototype;
if(_1a&&(_1c[_16]===_19&&_1c.hasOwnProperty(_16)||_1a.hidden[_16]===_19)){
break;
}
}while(_1b=_18[++pos]);
pos=_1b?pos:-1;
}
}
_1b=_18[++pos];
if(_1b){
_1c=_1b.prototype;
if(_1b._meta&&_1c.hasOwnProperty(_16)){
f=_1c[_16];
}else{
opf=op[_16];
do{
_1c=_1b.prototype;
f=_1c[_16];
if(f&&(_1b._meta?_1c.hasOwnProperty(_16):f!==opf)){
break;
}
}while(_1b=_18[++pos]);
}
}
f=_1b&&f||op[_16];
}else{
if(_1d.c!==_19){
pos=0;
_1a=_18[0]._meta;
if(_1a&&_1a.ctor!==_19){
_17=_1a.chains;
if(!_17||_17.constructor!=="manual"){
_6("calling chained constructor with inherited",this.declaredClass);
}
while(_1b=_18[++pos]){
_1a=_1b._meta;
if(_1a&&_1a.ctor===_19){
break;
}
}
pos=_1b?pos:-1;
}
}
while(_1b=_18[++pos]){
_1a=_1b._meta;
f=_1a?_1a.ctor:_1b;
if(f){
break;
}
}
f=_1b&&f;
}
_1d.c=f;
_1d.p=pos;
if(f){
return a===true?f:f.apply(this,a||_15);
}
};
function _1e(_1f,_20){
if(typeof _1f=="string"){
return this.inherited(_1f,_20,true);
}
return this.inherited(_1f,true);
};
function _21(cls){
var _22=this.constructor._meta.bases;
for(var i=0,l=_22.length;i<l;++i){
if(_22[i]===cls){
return true;
}
}
return this instanceof cls;
};
function _23(_24,_25){
var _26,i=0,l=d._extraNames.length;
for(_26 in _25){
if(_26!=_5&&_25.hasOwnProperty(_26)){
_24[_26]=_25[_26];
}
}
for(;i<l;++i){
_26=d._extraNames[i];
if(_26!=_5&&_25.hasOwnProperty(_26)){
_24[_26]=_25[_26];
}
}
};
function _27(_28,_29){
var _2a,t,i=0,l=d._extraNames.length;
for(_2a in _29){
t=_29[_2a];
if((t!==op[_2a]||!(_2a in op))&&_2a!=_5){
if(_2.call(t)=="[object Function]"){
t.nom=_2a;
}
_28[_2a]=t;
}
}
for(;i<l;++i){
_2a=d._extraNames[i];
t=_29[_2a];
if((t!==op[_2a]||!(_2a in op))&&_2a!=_5){
if(_2.call(t)=="[object Function]"){
t.nom=_2a;
}
_28[_2a]=t;
}
}
return _28;
};
function _2b(_2c){
_27(this.prototype,_2c);
return this;
};
function _2d(_2e,_2f){
return function(){
var a=arguments,_30=a,a0=a[0],f,i,m,l=_2e.length,_31;
if(!(this instanceof a.callee)){
return _32(a);
}
if(_2f&&(a0&&a0.preamble||this.preamble)){
_31=new Array(_2e.length);
_31[0]=a;
for(i=0;;){
a0=a[0];
if(a0){
f=a0.preamble;
if(f){
a=f.apply(this,a)||a;
}
}
f=_2e[i].prototype;
f=f.hasOwnProperty("preamble")&&f.preamble;
if(f){
a=f.apply(this,a)||a;
}
if(++i==l){
break;
}
_31[i]=a;
}
}
for(i=l-1;i>=0;--i){
f=_2e[i];
m=f._meta;
f=m?m.ctor:f;
if(f){
f.apply(this,_31?_31[i]:a);
}
}
f=this.postscript;
if(f){
f.apply(this,_30);
}
};
};
function _33(_34,_35){
return function(){
var a=arguments,t=a,a0=a[0],f;
if(!(this instanceof a.callee)){
return _32(a);
}
if(_35){
if(a0){
f=a0.preamble;
if(f){
t=f.apply(this,t)||t;
}
}
f=this.preamble;
if(f){
f.apply(this,t);
}
}
if(_34){
_34.apply(this,a);
}
f=this.postscript;
if(f){
f.apply(this,a);
}
};
};
function _36(_37){
return function(){
var a=arguments,i=0,f,m;
if(!(this instanceof a.callee)){
return _32(a);
}
for(;f=_37[i];++i){
m=f._meta;
f=m?m.ctor:f;
if(f){
f.apply(this,a);
break;
}
}
f=this.postscript;
if(f){
f.apply(this,a);
}
};
};
function _38(_39,_3a,_3b){
return function(){
var b,m,f,i=0,_3c=1;
if(_3b){
i=_3a.length-1;
_3c=-1;
}
for(;b=_3a[i];i+=_3c){
m=b._meta;
f=(m?m.hidden:b.prototype)[_39];
if(f){
f.apply(this,arguments);
}
}
};
};
function _3d(_3e){
_3.prototype=_3e.prototype;
var t=new _3;
_3.prototype=null;
return t;
};
function _32(_3f){
var _40=_3f.callee,t=_3d(_40);
_40.apply(t,_3f);
return t;
};
d.declare=function(_41,_42,_43){
if(typeof _41!="string"){
_43=_42;
_42=_41;
_41="";
}
_43=_43||{};
var _44,i,t,_45,_46,_47,_48,_49=1,_4a=_42;
if(_2.call(_42)=="[object Array]"){
_47=_9(_42,_41);
t=_47[0];
_49=_47.length-t;
_42=_47[_49];
}else{
_47=[0];
if(_42){
if(_2.call(_42)=="[object Function]"){
t=_42._meta;
_47=_47.concat(t?t.bases:_42);
}else{
_6("base class is not a callable constructor.",_41);
}
}else{
if(_42!==null){
_6("unknown base class. Did you use dojo.require to pull it in?",_41);
}
}
}
if(_42){
for(i=_49-1;;--i){
_44=_3d(_42);
if(!i){
break;
}
t=_47[i];
(t._meta?_23:_1)(_44,t.prototype);
_45=new Function;
_45.superclass=_42;
_45.prototype=_44;
_42=_44.constructor=_45;
}
}else{
_44={};
}
_27(_44,_43);
t=_43.constructor;
if(t!==op.constructor){
t.nom=_5;
_44.constructor=t;
}
for(i=_49-1;i;--i){
t=_47[i]._meta;
if(t&&t.chains){
_48=_1(_48||{},t.chains);
}
}
if(_44["-chains-"]){
_48=_1(_48||{},_44["-chains-"]);
}
t=!_48||!_48.hasOwnProperty(_5);
_47[0]=_45=(_48&&_48.constructor==="manual")?_36(_47):(_47.length==1?_33(_43.constructor,t):_2d(_47,t));
_45._meta={bases:_47,hidden:_43,chains:_48,parents:_4a,ctor:_43.constructor};
_45.superclass=_42&&_42.prototype;
_45.extend=_2b;
_45.prototype=_44;
_44.constructor=_45;
_44.getInherited=_1e;
_44.inherited=_14;
_44.isInstanceOf=_21;
if(_41){
_44.declaredClass=_41;
d.setObject(_41,_45);
}
if(_48){
for(_46 in _48){
if(_44[_46]&&typeof _48[_46]=="string"&&_46!=_5){
t=_44[_46]=_38(_46,_47,_48[_46]==="after");
t.nom=_46;
}
}
}
return _45;
};
d.safeMixin=_27;
})();
}
