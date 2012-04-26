/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.StoreSeries"]){
dojo._hasResource["dojox.charting.StoreSeries"]=true;
dojo.provide("dojox.charting.StoreSeries");
dojo.declare("dojox.charting.StoreSeries",null,{constructor:function(_1,_2,_3){
this.store=_1;
this.kwArgs=_2;
if(_3){
if(typeof _3=="function"){
this.value=_3;
}else{
if(typeof _3=="object"){
this.value=function(_4){
var o={};
for(var _5 in _3){
o[_5]=_4[_3[_5]];
}
return o;
};
}else{
this.value=function(_6){
return _6[_3];
};
}
}
}else{
this.value=function(_7){
return _7.value;
};
}
this.data=[];
this.fetch();
},destroy:function(){
if(this.observeHandle){
this.observeHandle.dismiss();
}
},setSeriesObject:function(_8){
this.series=_8;
},fetch:function(){
var _9=this.objects=[];
var _a=this;
if(this.observeHandle){
this.observeHandle.dismiss();
}
var _b=this.store.query(this.kwArgs.query,this.kwArgs);
dojo.when(_b,function(_c){
_a.objects=_c;
_d();
});
if(_b.observe){
this.observeHandle=_b.observe(_d,true);
}
function _d(){
_a.data=dojo.map(_a.objects,function(_e){
return _a.value(_e,_a.store);
});
_a._pushDataChanges();
};
},_pushDataChanges:function(){
if(this.series){
this.series.chart.updateSeries(this.series.name,this);
this.series.chart.delayedRender();
}
}});
}
