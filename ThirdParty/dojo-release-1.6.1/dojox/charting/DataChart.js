/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.DataChart"]){
dojo._hasResource["dojox.charting.DataChart"]=true;
dojo.provide("dojox.charting.DataChart");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.charting.themes.PlotKit.blue");
dojo.experimental("dojox.charting.DataChart");
(function(){
var _1={vertical:true,min:0,max:10,majorTickStep:5,minorTickStep:1,natural:false,stroke:"black",majorTick:{stroke:"black",length:8},minorTick:{stroke:"gray",length:2},majorLabels:true};
var _2={natural:true,majorLabels:true,includeZero:false,majorTickStep:1,majorTick:{stroke:"black",length:8},fixUpper:"major",stroke:"black",htmlLabels:true,from:1};
var _3={markers:true,tension:2,gap:2};
dojo.declare("dojox.charting.DataChart",[dojox.charting.Chart2D],{scroll:true,comparative:false,query:"*",queryOptions:"",fieldName:"value",chartTheme:dojox.charting.themes.PlotKit.blue,displayRange:0,stretchToFit:true,minWidth:200,minHeight:100,showing:true,label:"name",constructor:function(_4,_5){
this.domNode=dojo.byId(_4);
dojo.mixin(this,_5);
this.xaxis=dojo.mixin(dojo.mixin({},_2),_5.xaxis);
if(this.xaxis.labelFunc=="seriesLabels"){
this.xaxis.labelFunc=dojo.hitch(this,"seriesLabels");
}
this.yaxis=dojo.mixin(dojo.mixin({},_1),_5.yaxis);
if(this.yaxis.labelFunc=="seriesLabels"){
this.yaxis.labelFunc=dojo.hitch(this,"seriesLabels");
}
this._events=[];
this.convertLabels(this.yaxis);
this.convertLabels(this.xaxis);
this.onSetItems={};
this.onSetInterval=0;
this.dataLength=0;
this.seriesData={};
this.seriesDataBk={};
this.firstRun=true;
this.dataOffset=0;
this.chartTheme.plotarea.stroke={color:"gray",width:3};
this.setTheme(this.chartTheme);
if(this.displayRange){
this.stretchToFit=false;
}
if(!this.stretchToFit){
this.xaxis.to=this.displayRange;
}
this.addAxis("x",this.xaxis);
this.addAxis("y",this.yaxis);
_3.type=_5.type||"Markers";
this.addPlot("default",dojo.mixin(_3,_5.chartPlot));
this.addPlot("grid",dojo.mixin(_5.grid||{},{type:"Grid",hMinorLines:true}));
if(this.showing){
this.render();
}
if(_5.store){
this.setStore(_5.store,_5.query,_5.fieldName,_5.queryOptions);
}
},destroy:function(){
dojo.forEach(this._events,dojo.disconnect);
this.inherited(arguments);
},setStore:function(_6,_7,_8,_9){
this.firstRun=true;
this.store=_6||this.store;
this.query=_7||this.query;
this.fieldName=_8||this.fieldName;
this.label=this.store.getLabelAttributes();
this.queryOptions=_9||_9;
dojo.forEach(this._events,dojo.disconnect);
this._events=[dojo.connect(this.store,"onSet",this,"onSet"),dojo.connect(this.store,"onError",this,"onError")];
this.fetch();
},show:function(){
if(!this.showing){
dojo.style(this.domNode,"display","");
this.showing=true;
this.render();
}
},hide:function(){
if(this.showing){
dojo.style(this.domNode,"display","none");
this.showing=false;
}
},onSet:function(_a){
var nm=this.getProperty(_a,this.label);
if(nm in this.runs||this.comparative){
clearTimeout(this.onSetInterval);
if(!this.onSetItems[nm]){
this.onSetItems[nm]=_a;
}
this.onSetInterval=setTimeout(dojo.hitch(this,function(){
clearTimeout(this.onSetInterval);
var _b=[];
for(var nm in this.onSetItems){
_b.push(this.onSetItems[nm]);
}
this.onData(_b);
this.onSetItems={};
}),200);
}
},onError:function(_c){
console.error("DataChart Error:",_c);
},onDataReceived:function(_d){
},getProperty:function(_e,_f){
if(_f==this.label){
return this.store.getLabel(_e);
}
if(_f=="id"){
return this.store.getIdentity(_e);
}
var _10=this.store.getValues(_e,_f);
if(_10.length<2){
_10=this.store.getValue(_e,_f);
}
return _10;
},onData:function(_11){
if(!_11||!_11.length){
return;
}
if(this.items&&this.items.length!=_11.length){
dojo.forEach(_11,function(m){
var id=this.getProperty(m,"id");
dojo.forEach(this.items,function(m2,i){
if(this.getProperty(m2,"id")==id){
this.items[i]=m2;
}
},this);
},this);
_11=this.items;
}
if(this.stretchToFit){
this.displayRange=_11.length;
}
this.onDataReceived(_11);
this.items=_11;
if(this.comparative){
var nm="default";
this.seriesData[nm]=[];
this.seriesDataBk[nm]=[];
dojo.forEach(_11,function(m,i){
var _12=this.getProperty(m,this.fieldName);
this.seriesData[nm].push(_12);
},this);
}else{
dojo.forEach(_11,function(m,i){
var nm=this.store.getLabel(m);
if(!this.seriesData[nm]){
this.seriesData[nm]=[];
this.seriesDataBk[nm]=[];
}
var _13=this.getProperty(m,this.fieldName);
if(dojo.isArray(_13)){
this.seriesData[nm]=_13;
}else{
if(!this.scroll){
var ar=dojo.map(new Array(i+1),function(){
return 0;
});
ar.push(Number(_13));
this.seriesData[nm]=ar;
}else{
if(this.seriesDataBk[nm].length>this.seriesData[nm].length){
this.seriesData[nm]=this.seriesDataBk[nm];
}
this.seriesData[nm].push(Number(_13));
}
this.seriesDataBk[nm].push(Number(_13));
}
},this);
}
var _14;
if(this.firstRun){
this.firstRun=false;
for(nm in this.seriesData){
this.addSeries(nm,this.seriesData[nm]);
_14=this.seriesData[nm];
}
}else{
for(nm in this.seriesData){
_14=this.seriesData[nm];
if(this.scroll&&_14.length>this.displayRange){
this.dataOffset=_14.length-this.displayRange-1;
_14=_14.slice(_14.length-this.displayRange,_14.length);
}
this.updateSeries(nm,_14);
}
}
this.dataLength=_14.length;
if(this.showing){
this.render();
}
},fetch:function(){
if(!this.store){
return;
}
this.store.fetch({query:this.query,queryOptions:this.queryOptions,start:this.start,count:this.count,sort:this.sort,onComplete:dojo.hitch(this,function(_15){
setTimeout(dojo.hitch(this,function(){
this.onData(_15);
}),0);
}),onError:dojo.hitch(this,"onError")});
},convertLabels:function(_16){
if(!_16.labels||dojo.isObject(_16.labels[0])){
return null;
}
_16.labels=dojo.map(_16.labels,function(ele,i){
return {value:i,text:ele};
});
return null;
},seriesLabels:function(val){
val--;
if(this.series.length<1||(!this.comparative&&val>this.series.length)){
return "-";
}
if(this.comparative){
return this.store.getLabel(this.items[val]);
}else{
for(var i=0;i<this.series.length;i++){
if(this.series[i].data[val]>0){
return this.series[i].name;
}
}
}
return "-";
},resizeChart:function(dim){
var w=Math.max(dim.w,this.minWidth);
var h=Math.max(dim.h,this.minHeight);
this.resize(w,h);
}});
})();
}
