/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d._PlotEvents"]){
dojo._hasResource["dojox.charting.plot2d._PlotEvents"]=true;
dojo.provide("dojox.charting.plot2d._PlotEvents");
dojo.declare("dojox.charting.plot2d._PlotEvents",null,{constructor:function(){
this._shapeEvents=[];
this._eventSeries={};
},destroy:function(){
this.resetEvents();
this.inherited(arguments);
},plotEvent:function(o){
},raiseEvent:function(o){
this.plotEvent(o);
var t=dojo.delegate(o);
t.originalEvent=o.type;
t.originalPlot=o.plot;
t.type="onindirect";
dojo.forEach(this.chart.stack,function(_1){
if(_1!==this&&_1.plotEvent){
t.plot=_1;
_1.plotEvent(t);
}
},this);
},connect:function(_2,_3){
this.dirty=true;
return dojo.connect(this,"plotEvent",_2,_3);
},events:function(){
var ls=this.plotEvent._listeners;
if(!ls||!ls.length){
return false;
}
for(var i in ls){
if(!(i in Array.prototype)){
return true;
}
}
return false;
},resetEvents:function(){
if(this._shapeEvents.length){
dojo.forEach(this._shapeEvents,function(_4){
_4.shape.disconnect(_4.handle);
});
this._shapeEvents=[];
}
this.raiseEvent({type:"onplotreset",plot:this});
},_connectSingleEvent:function(o,_5){
this._shapeEvents.push({shape:o.eventMask,handle:o.eventMask.connect(_5,this,function(e){
o.type=_5;
o.event=e;
this.raiseEvent(o);
o.event=null;
})});
},_connectEvents:function(o){
if(o){
o.chart=this.chart;
o.plot=this;
o.hAxis=this.hAxis||null;
o.vAxis=this.vAxis||null;
o.eventMask=o.eventMask||o.shape;
this._connectSingleEvent(o,"onmouseover");
this._connectSingleEvent(o,"onmouseout");
this._connectSingleEvent(o,"onclick");
}
},_reconnectEvents:function(_6){
var a=this._eventSeries[_6];
if(a){
dojo.forEach(a,this._connectEvents,this);
}
},fireEvent:function(_7,_8,_9,_a){
var s=this._eventSeries[_7];
if(s&&s.length&&_9<s.length){
var o=s[_9];
o.type=_8;
o.event=_a||null;
this.raiseEvent(o);
o.event=null;
}
}});
}
