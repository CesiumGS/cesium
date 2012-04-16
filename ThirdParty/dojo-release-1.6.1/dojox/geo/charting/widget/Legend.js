/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.geo.charting.widget.Legend"]){
dojo._hasResource["dojox.geo.charting.widget.Legend"]=true;
dojo.provide("dojox.geo.charting.widget.Legend");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.lang.functional.array");
dojo.require("dojox.lang.functional.fold");
dojo.declare("dojox.geo.charting.widget.Legend",[dijit._Widget,dijit._Templated],{templateString:"<table dojoAttachPoint='legendNode' class='dojoxLegendNode'><tbody dojoAttachPoint='legendBody'></tbody></table>",horizontal:true,legendNode:null,legendBody:null,swatchSize:18,postCreate:function(){
if(!this.map){
return;
}
this.series=this.map.series;
dojo.byId(this.map.container).appendChild(this.domNode);
this.refresh();
},refresh:function(){
while(this.legendBody.lastChild){
dojo.destroy(this.legendBody.lastChild);
}
if(this.horizontal){
dojo.addClass(this.legendNode,"dojoxLegendHorizontal");
this._tr=dojo.doc.createElement("tr");
this.legendBody.appendChild(this._tr);
}
var s=this.series;
if(s.length==0){
return;
}
dojo.forEach(s,function(x){
this._addLabel(x.color,x.name);
},this);
},_addLabel:function(_1,_2){
var _3=dojo.doc.createElement("td");
var _4=dojo.doc.createElement("td");
var _5=dojo.doc.createElement("div");
dojo.addClass(_3,"dojoxLegendIcon");
dojo.addClass(_4,"dojoxLegendText");
_5.style.width=this.swatchSize+"px";
_5.style.height=this.swatchSize+"px";
_3.appendChild(_5);
if(this.horizontal){
this._tr.appendChild(_3);
this._tr.appendChild(_4);
}else{
var tr=dojo.doc.createElement("tr");
this.legendBody.appendChild(tr);
tr.appendChild(_3);
tr.appendChild(_4);
}
_5.style.background=_1;
_4.innerHTML=String(_2);
}});
}
