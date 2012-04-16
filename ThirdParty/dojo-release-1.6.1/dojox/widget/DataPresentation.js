/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.DataPresentation"]){
dojo._hasResource["dojox.widget.DataPresentation"]=true;
dojo.provide("dojox.widget.DataPresentation");
dojo.experimental("dojox.widget.DataPresentation");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.charting.widget.Legend");
dojo.require("dojox.charting.action2d.Tooltip");
dojo.require("dojox.charting.action2d.Highlight");
dojo.require("dojo.colors");
dojo.require("dojo.data.ItemFileWriteStore");
(function(){
var _1=function(_2,_3,_4,_5){
var _6=[];
_6[0]={value:0,text:""};
var _7=_2.length;
if((_4!=="ClusteredBars")&&(_4!=="StackedBars")){
var _8=_5.offsetWidth;
var _9=(""+_2[0]).length*_2.length*7;
if(_3==1){
for(var z=1;z<500;++z){
if((_9/z)<_8){
break;
}
++_3;
}
}
}
for(var i=0;i<_7;i++){
_6.push({value:i+1,text:(!_3||i%_3)?"":_2[i]});
}
_6.push({value:_7+1,text:""});
return _6;
};
var _a=function(_b,_c){
var _d={vertical:false,labels:_c,min:0,max:_c.length-1,majorTickStep:1,minorTickStep:1};
if((_b==="ClusteredBars")||(_b==="StackedBars")){
_d.vertical=true;
}
if((_b==="Lines")||(_b==="Areas")||(_b==="StackedAreas")){
_d.min++;
_d.max--;
}
return _d;
};
var _e=function(_f,_10,_11,_12){
var _13={vertical:true,fixLower:"major",fixUpper:"major",natural:true};
if(_10==="secondary"){
_13.leftBottom=false;
}
if((_f==="ClusteredBars")||(_f==="StackedBars")){
_13.vertical=false;
}
if(_11==_12){
_13.min=_11-1;
_13.max=_12+1;
}
return _13;
};
var _14=function(_15,_16,_17){
var _18={type:_15,hAxis:"independent",vAxis:"dependent-"+_16,gap:4,lines:false,areas:false,markers:false};
if((_15==="ClusteredBars")||(_15==="StackedBars")){
_18.hAxis=_18.vAxis;
_18.vAxis="independent";
}
if((_15==="Lines")||(_15==="Hybrid-Lines")||(_15==="Areas")||(_15==="StackedAreas")){
_18.lines=true;
}
if((_15==="Areas")||(_15==="StackedAreas")){
_18.areas=true;
}
if(_15==="Lines"){
_18.markers=true;
}
if(_15==="Hybrid-Lines"){
_18.shadows={dx:2,dy:2,dw:2};
_18.type="Lines";
}
if(_15==="Hybrid-ClusteredColumns"){
_18.type="ClusteredColumns";
}
if(_17){
_18.animate=_17;
}
return _18;
};
var _19=function(_1a,_1b,_1c,_1d,_1e,_1f,_20,_21,_22,_23,_24){
var _25=_1b;
if(!_25){
_1a.innerHTML="";
_25=new dojox.charting.Chart2D(_1a);
}
if(_20){
_20._clone=function(){
var _26=new dojox.charting.Theme({chart:this.chart,plotarea:this.plotarea,axis:this.axis,series:this.series,marker:this.marker,antiAlias:this.antiAlias,assignColors:this.assignColors,assignMarkers:this.assigneMarkers,colors:dojo.delegate(this.colors)});
_26.markers=this.markers;
_26._buildMarkerArray();
return _26;
};
_25.setTheme(_20);
}
var _27=_22.series_data[0].slice(0);
if(_1d){
_27.reverse();
}
var _28=_1(_27,_1f,_1c,_1a);
var _29={};
var _2a=null;
var _2b=null;
var _2c={};
for(var _2d in _25.runs){
_2c[_2d]=true;
}
var _2e=_22.series_name.length;
for(var i=0;i<_2e;i++){
if(_22.series_chart[i]&&(_22.series_data[i].length>0)){
var _2f=_1c;
var _30=_22.series_axis[i];
if(_2f=="Hybrid"){
if(_22.series_charttype[i]=="line"){
_2f="Hybrid-Lines";
}else{
_2f="Hybrid-ClusteredColumns";
}
}
if(!_29[_30]){
_29[_30]={};
}
if(!_29[_30][_2f]){
var _31=_30+"-"+_2f;
_25.addPlot(_31,_14(_2f,_30,_1e));
var _32={};
if(typeof _21=="string"){
_32.text=function(o){
var _33=[o.element,o.run.name,_27[o.index],((_2f==="ClusteredBars")||(_2f==="StackedBars"))?o.x:o.y];
return dojo.replace(_21,_33);
};
}else{
if(typeof _21=="function"){
_32.text=_21;
}
}
new dojox.charting.action2d.Tooltip(_25,_31,_32);
if(_2f!=="Lines"&&_2f!=="Hybrid-Lines"){
new dojox.charting.action2d.Highlight(_25,_31);
}
_29[_30][_2f]=true;
}
var _34=[];
var _35=_22.series_data[i].length;
for(var j=0;j<_35;j++){
var val=_22.series_data[i][j];
_34.push(val);
if(_2a===null||val>_2a){
_2a=val;
}
if(_2b===null||val<_2b){
_2b=val;
}
}
if(_1d){
_34.reverse();
}
var _36={plot:_30+"-"+_2f};
if(_22.series_linestyle[i]){
_36.stroke={style:_22.series_linestyle[i]};
}
_25.addSeries(_22.series_name[i],_34,_36);
delete _2c[_22.series_name[i]];
}
}
for(_2d in _2c){
_25.removeSeries(_2d);
}
_25.addAxis("independent",_a(_1c,_28));
_25.addAxis("dependent-primary",_e(_1c,"primary",_2b,_2a));
_25.addAxis("dependent-secondary",_e(_1c,"secondary",_2b,_2a));
return _25;
};
var _37=function(_38,_39,_3a,_3b){
var _3c=_39;
if(!_3c){
_3c=new dojox.charting.widget.Legend({chart:_3a,horizontal:_3b},_38);
}else{
_3c.refresh();
}
return _3c;
};
var _3d=function(_3e,_3f,_40,_41,_42){
var _43=_3f||new dojox.grid.DataGrid({},_3e);
_43.startup();
_43.setStore(_40,_41,_42);
var _44=[];
for(var ser=0;ser<_40.series_name.length;ser++){
if(_40.series_grid[ser]&&(_40.series_data[ser].length>0)){
_44.push({field:"data."+ser,name:_40.series_name[ser],width:"auto",formatter:_40.series_gridformatter[ser]});
}
}
_43.setStructure(_44);
return _43;
};
var _45=function(_46,_47){
if(_47.title){
_46.innerHTML=_47.title;
}
};
var _48=function(_49,_4a){
if(_4a.footer){
_49.innerHTML=_4a.footer;
}
};
var _4b=function(_4c,_4d){
var _4e=_4c;
if(_4d){
var _4f=_4d.split(/[.\[\]]+/);
for(var _50=0,l=_4f.length;_50<l;_50++){
if(_4e){
_4e=_4e[_4f[_50]];
}
}
}
return _4e;
};
dojo.declare("dojox.widget.DataPresentation",null,{type:"chart",chartType:"clusteredBars",reverse:false,animate:null,labelMod:1,legendHorizontal:true,constructor:function(_51,_52){
dojo.mixin(this,_52);
this.domNode=dojo.byId(_51);
this[this.type+"Node"]=this.domNode;
if(typeof this.theme=="string"){
this.theme=dojo.getObject(this.theme);
}
this.chartNode=dojo.byId(this.chartNode);
this.legendNode=dojo.byId(this.legendNode);
this.gridNode=dojo.byId(this.gridNode);
this.titleNode=dojo.byId(this.titleNode);
this.footerNode=dojo.byId(this.footerNode);
if(this.legendVertical){
this.legendHorizontal=!this.legendVertical;
}
if(this.url){
this.setURL(null,null,this.refreshInterval);
}else{
if(this.data){
this.setData(null,this.refreshInterval);
}else{
this.setStore();
}
}
},setURL:function(url,_53,_54){
if(_54){
this.cancelRefresh();
}
this.url=url||this.url;
this.urlContent=_53||this.urlContent;
this.refreshInterval=_54||this.refreshInterval;
var me=this;
dojo.xhrGet({url:this.url,content:this.urlContent,handleAs:"json-comment-optional",load:function(_55,_56){
me.setData(_55);
},error:function(xhr,_57){
if(me.urlError&&(typeof me.urlError=="function")){
me.urlError(xhr,_57);
}
}});
if(_54&&(this.refreshInterval>0)){
this.refreshIntervalPending=setInterval(function(){
me.setURL();
},this.refreshInterval);
}
},setData:function(_58,_59){
if(_59){
this.cancelRefresh();
}
this.data=_58||this.data;
this.refreshInterval=_59||this.refreshInterval;
var _5a=(typeof this.series=="function")?this.series(this.data):this.series;
var _5b=[],_5c=[],_5d=[],_5e=[],_5f=[],_60=[],_61=[],_62=[],_63=[],_64=0;
for(var ser=0;ser<_5a.length;ser++){
_5b[ser]=_4b(this.data,_5a[ser].datapoints);
if(_5b[ser]&&(_5b[ser].length>_64)){
_64=_5b[ser].length;
}
_5c[ser]=[];
_5d[ser]=_5a[ser].name||(_5a[ser].namefield?_4b(this.data,_5a[ser].namefield):null)||("series "+ser);
_5e[ser]=(_5a[ser].chart!==false);
_5f[ser]=_5a[ser].charttype||"bar";
_60[ser]=_5a[ser].linestyle;
_61[ser]=_5a[ser].axis||"primary";
_62[ser]=(_5a[ser].grid!==false);
_63[ser]=_5a[ser].gridformatter;
}
var _65,_66,_67,_68;
var _69=[];
for(_65=0;_65<_64;_65++){
_66={index:_65};
for(ser=0;ser<_5a.length;ser++){
if(_5b[ser]&&(_5b[ser].length>_65)){
_67=_4b(_5b[ser][_65],_5a[ser].field);
if(_5e[ser]){
_68=parseFloat(_67);
if(!isNaN(_68)){
_67=_68;
}
}
_66["data."+ser]=_67;
_5c[ser].push(_67);
}
}
_69.push(_66);
}
if(_64<=0){
_69.push({index:0});
}
var _6a=new dojo.data.ItemFileWriteStore({data:{identifier:"index",items:_69}});
if(this.data.title){
_6a.title=this.data.title;
}
if(this.data.footer){
_6a.footer=this.data.footer;
}
_6a.series_data=_5c;
_6a.series_name=_5d;
_6a.series_chart=_5e;
_6a.series_charttype=_5f;
_6a.series_linestyle=_60;
_6a.series_axis=_61;
_6a.series_grid=_62;
_6a.series_gridformatter=_63;
this.setPreparedStore(_6a);
if(_59&&(this.refreshInterval>0)){
var me=this;
this.refreshIntervalPending=setInterval(function(){
me.setData();
},this.refreshInterval);
}
},refresh:function(){
if(this.url){
this.setURL(this.url,this.urlContent,this.refreshInterval);
}else{
if(this.data){
this.setData(this.data,this.refreshInterval);
}
}
},cancelRefresh:function(){
if(this.refreshIntervalPending){
clearInterval(this.refreshIntervalPending);
this.refreshIntervalPending=undefined;
}
},setStore:function(_6b,_6c,_6d){
this.setPreparedStore(_6b,_6c,_6d);
},setPreparedStore:function(_6e,_6f,_70){
this.preparedstore=_6e||this.store;
this.query=_6f||this.query;
this.queryOptions=_70||this.queryOptions;
if(this.preparedstore){
if(this.chartNode){
this.chartWidget=_19(this.chartNode,this.chartWidget,this.chartType,this.reverse,this.animate,this.labelMod,this.theme,this.tooltip,this.preparedstore,this.query,this,_70);
this.renderChartWidget();
}
if(this.legendNode){
this.legendWidget=_37(this.legendNode,this.legendWidget,this.chartWidget,this.legendHorizontal);
}
if(this.gridNode){
this.gridWidget=_3d(this.gridNode,this.gridWidget,this.preparedstore,this.query,this.queryOptions);
this.renderGridWidget();
}
if(this.titleNode){
_45(this.titleNode,this.preparedstore);
}
if(this.footerNode){
_48(this.footerNode,this.preparedstore);
}
}
},renderChartWidget:function(){
if(this.chartWidget){
this.chartWidget.render();
}
},renderGridWidget:function(){
if(this.gridWidget){
this.gridWidget.render();
}
},getChartWidget:function(){
return this.chartWidget;
},getGridWidget:function(){
return this.gridWidget;
},destroy:function(){
this.cancelRefresh();
if(this.chartWidget){
this.chartWidget.destroy();
delete this.chartWidget;
}
if(this.legendWidget){
delete this.legendWidget;
}
if(this.gridWidget){
delete this.gridWidget;
}
if(this.chartNode){
this.chartNode.innerHTML="";
}
if(this.legendNode){
this.legendNode.innerHTML="";
}
if(this.gridNode){
this.gridNode.innerHTML="";
}
if(this.titleNode){
this.titleNode.innerHTML="";
}
if(this.footerNode){
this.footerNode.innerHTML="";
}
}});
})();
}
