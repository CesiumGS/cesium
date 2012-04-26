/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.ThreeD"]){
dojo._hasResource["dojox.charting.themes.ThreeD"]=true;
dojo.provide("dojox.charting.themes.ThreeD");
dojo.require("dojo.colors");
dojo.require("dojox.charting.Theme");
dojo.require("dojox.charting.themes.gradientGenerator");
dojo.require("dojox.charting.themes.PrimaryColors");
(function(){
var dc=dojox.charting,_1=dc.themes,_2=dc.Theme,gi=_1.gradientGenerator.generateGradientByIntensity,_3=["#f00","#0f0","#00f","#ff0","#0ff","#f0f"],_4={type:"linear",space:"shape",x1:0,y1:0,x2:100,y2:0},_5=[{o:0,i:174},{o:0.08,i:231},{o:0.18,i:237},{o:0.3,i:231},{o:0.39,i:221},{o:0.49,i:206},{o:0.58,i:187},{o:0.68,i:165},{o:0.8,i:128},{o:0.9,i:102},{o:1,i:174}],_6=2,_7=100,_8=50,_9=dojo.map(_3,function(c){
var _a=dojo.delegate(_4),_3=_a.colors=_1.gradientGenerator.generateGradientByIntensity(c,_5),_b=_3[_6].color;
_b.r+=_7;
_b.g+=_7;
_b.b+=_7;
_b.sanitize();
return _a;
});
_1.ThreeD=_1.PrimaryColors.clone();
_1.ThreeD.series.shadow={dx:1,dy:1,width:3,color:[0,0,0,0.15]};
_1.ThreeD.next=function(_c,_d,_e){
if(_c=="bar"||_c=="column"){
var _f=this._current%this.seriesThemes.length,s=this.seriesThemes[_f],old=s.fill;
s.fill=_9[_f];
var _10=_2.prototype.next.apply(this,arguments);
s.fill=old;
return _10;
}
return _2.prototype.next.apply(this,arguments);
};
})();
}
