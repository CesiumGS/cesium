/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.store.Observable"]){
dojo._hasResource["dojo.store.Observable"]=true;
dojo.provide("dojo.store.Observable");
dojo.getObject("store",true,dojo);
dojo.store.Observable=function(_1){
var _2=[],_3=0;
_1.notify=function(_4,_5){
_3++;
var _6=_2.slice();
for(var i=0,l=_6.length;i<l;i++){
_6[i](_4,_5);
}
};
var _7=_1.query;
_1.query=function(_8,_9){
_9=_9||{};
var _a=_7.apply(this,arguments);
if(_a&&_a.forEach){
var _b=dojo.mixin({},_9);
delete _b.start;
delete _b.count;
var _c=_1.queryEngine&&_1.queryEngine(_8,_b);
var _d=_3;
var _e=[],_f;
_a.observe=function(_10,_11){
if(_e.push(_10)==1){
_2.push(_f=function(_12,_13){
dojo.when(_a,function(_14){
var _15=_14.length!=_9.count;
var i;
if(++_d!=_3){
throw new Error("Query is out of date, you must observe() the query prior to any data modifications");
}
var _16,_17=-1,_18=-1;
if(_13){
for(i=0,l=_14.length;i<l;i++){
var _19=_14[i];
if(_1.getIdentity(_19)==_13){
_16=_19;
_17=i;
if(_c||!_12){
_14.splice(i,1);
}
break;
}
}
}
if(_c){
if(_12&&(_c.matches?_c.matches(_12):_c([_12]).length)){
if(_17>-1){
_14.splice(_17,0,_12);
}else{
_14.push(_12);
}
_18=dojo.indexOf(_c(_14),_12);
if((_9.start&&_18==0)||(!_15&&_18==_14.length-1)){
_18=-1;
}
}
}else{
if(_12){
_18=_17>=0?_17:(_1.defaultIndex||0);
}
}
if((_17>-1||_18>-1)&&(_11||!_c||(_17!=_18))){
var _1a=_e.slice();
for(i=0;_10=_1a[i];i++){
_10(_12||_16,_17,_18);
}
}
});
});
}
return {cancel:function(){
_e.splice(dojo.indexOf(_e,_10),1);
if(!_e.length){
_2.splice(dojo.indexOf(_2,_f),1);
}
}};
};
}
return _a;
};
var _1b;
function _1c(_1d,_1e){
var _1f=_1[_1d];
if(_1f){
_1[_1d]=function(_20){
if(_1b){
return _1f.apply(this,arguments);
}
_1b=true;
try{
return dojo.when(_1f.apply(this,arguments),function(_21){
_1e((typeof _21=="object"&&_21)||_20);
return _21;
});
}
finally{
_1b=false;
}
};
}
};
_1c("put",function(_22){
_1.notify(_22,_1.getIdentity(_22));
});
_1c("add",function(_23){
_1.notify(_23);
});
_1c("remove",function(id){
_1.notify(undefined,id);
});
return _1;
};
}
