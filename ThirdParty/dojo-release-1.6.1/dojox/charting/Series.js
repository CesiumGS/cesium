/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.Series"]){
dojo._hasResource["dojox.charting.Series"]=true;
dojo.provide("dojox.charting.Series");
dojo.require("dojox.charting.Element");
dojo.declare("dojox.charting.Series",dojox.charting.Element,{constructor:function(_1,_2,_3){
dojo.mixin(this,_3);
if(typeof this.plot!="string"){
this.plot="default";
}
this.update(_2);
},clear:function(){
this.dyn={};
},update:function(_4){
if(dojo.isArray(_4)){
this.data=_4;
}else{
this.source=_4;
this.data=this.source.data;
if(this.source.setSeriesObject){
this.source.setSeriesObject(this);
}
}
this.dirty=true;
this.clear();
}});
}
