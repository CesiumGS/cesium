/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.action2d.Base"]){
dojo._hasResource["dojox.charting.action2d.Base"]=true;
dojo.provide("dojox.charting.action2d.Base");
dojo.require("dojo.fx.easing");
dojo.require("dojox.lang.functional.object");
dojo.require("dojox.gfx.fx");
(function(){
var _1=400,_2=dojo.fx.easing.backOut,df=dojox.lang.functional;
dojo.declare("dojox.charting.action2d.Base",null,{overOutEvents:{onmouseover:1,onmouseout:1},constructor:function(_3,_4,_5){
this.chart=_3;
this.plot=_4||"default";
this.anim={};
if(!_5){
_5={};
}
this.duration=_5.duration?_5.duration:_1;
this.easing=_5.easing?_5.easing:_2;
},connect:function(){
this.handle=this.chart.connectToPlot(this.plot,this,"process");
},disconnect:function(){
if(this.handle){
dojo.disconnect(this.handle);
this.handle=null;
}
},reset:function(){
},destroy:function(){
this.disconnect();
df.forIn(this.anim,function(o){
df.forIn(o,function(_6){
_6.action.stop(true);
});
});
this.anim={};
}});
})();
}
