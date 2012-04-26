/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.DataSeries"]){
dojo._hasResource["dojox.charting.DataSeries"]=true;
dojo.provide("dojox.charting.DataSeries");
dojo.require("dojox.lang.functional");
dojo.declare("dojox.charting.DataSeries",null,{constructor:function(_1,_2,_3){
this.store=_1;
this.kwArgs=_2;
if(_3){
if(dojo.isFunction(_3)){
this.value=_3;
}else{
if(dojo.isObject(_3)){
this.value=dojo.hitch(this,"_dictValue",dojox.lang.functional.keys(_3),_3);
}else{
this.value=dojo.hitch(this,"_fieldValue",_3);
}
}
}else{
this.value=dojo.hitch(this,"_defaultValue");
}
this.data=[];
this._events=[];
if(this.store.getFeatures()["dojo.data.api.Notification"]){
this._events.push(dojo.connect(this.store,"onNew",this,"_onStoreNew"),dojo.connect(this.store,"onDelete",this,"_onStoreDelete"),dojo.connect(this.store,"onSet",this,"_onStoreSet"));
}
this.fetch();
},destroy:function(){
dojo.forEach(this._events,dojo.disconnect);
},setSeriesObject:function(_4){
this.series=_4;
},_dictValue:function(_5,_6,_7,_8){
var o={};
dojo.forEach(_5,function(_9){
o[_9]=_7.getValue(_8,_6[_9]);
});
return o;
},_fieldValue:function(_a,_b,_c){
return _b.getValue(_c,_a);
},_defaultValue:function(_d,_e){
return _d.getValue(_e,"value");
},fetch:function(){
if(!this._inFlight){
this._inFlight=true;
var _f=dojo.delegate(this.kwArgs);
_f.onComplete=dojo.hitch(this,"_onFetchComplete");
_f.onError=dojo.hitch(this,"onFetchError");
this.store.fetch(_f);
}
},_onFetchComplete:function(_10,_11){
this.items=_10;
this._buildItemMap();
this.data=dojo.map(this.items,function(_12){
return this.value(this.store,_12);
},this);
this._pushDataChanges();
this._inFlight=false;
},onFetchError:function(_13,_14){
this._inFlight=false;
},_buildItemMap:function(){
if(this.store.getFeatures()["dojo.data.api.Identity"]){
var _15={};
dojo.forEach(this.items,function(_16,_17){
_15[this.store.getIdentity(_16)]=_17;
},this);
this.itemMap=_15;
}
},_pushDataChanges:function(){
if(this.series){
this.series.chart.updateSeries(this.series.name,this);
this.series.chart.delayedRender();
}
},_onStoreNew:function(){
this.fetch();
},_onStoreDelete:function(_18){
if(this.items){
var _19=dojo.some(this.items,function(it,_1a){
if(it===_18){
this.items.splice(_1a,1);
this._buildItemMap();
this.data.splice(_1a,1);
return true;
}
return false;
},this);
if(_19){
this._pushDataChanges();
}
}
},_onStoreSet:function(_1b){
if(this.itemMap){
var id=this.store.getIdentity(_1b),_1c=this.itemMap[id];
if(typeof _1c=="number"){
this.data[_1c]=this.value(this.store,this.items[_1c]);
this._pushDataChanges();
}
}else{
if(this.items){
var _1d=dojo.some(this.items,function(it,_1e){
if(it===_1b){
this.data[_1e]=this.value(this.store,it);
return true;
}
return false;
},this);
if(_1d){
this._pushDataChanges();
}
}
}
}});
}
