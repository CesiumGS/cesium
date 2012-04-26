/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.gradientGenerator"]){
dojo._hasResource["dojox.charting.themes.gradientGenerator"]=true;
dojo.provide("dojox.charting.themes.gradientGenerator");
dojo.require("dojox.charting.Theme");
(function(){
var gg=dojox.charting.themes.gradientGenerator;
gg.generateFills=function(_1,_2,_3,_4){
var _5=dojox.charting.Theme;
return dojo.map(_1,function(c){
return _5.generateHslGradient(c,_2,_3,_4);
});
};
gg.updateFills=function(_6,_7,_8,_9){
var _a=dojox.charting.Theme;
dojo.forEach(_6,function(t){
if(t.fill&&!t.fill.type){
t.fill=_a.generateHslGradient(t.fill,_7,_8,_9);
}
});
};
gg.generateMiniTheme=function(_b,_c,_d,_e,_f){
var _10=dojox.charting.Theme;
return dojo.map(_b,function(c){
c=new dojox.color.Color(c);
return {fill:_10.generateHslGradient(c,_c,_d,_e),stroke:{color:_10.generateHslColor(c,_f)}};
});
};
gg.generateGradientByIntensity=function(_11,_12){
_11=new dojo.Color(_11);
return dojo.map(_12,function(_13){
var s=_13.i/255;
return {offset:_13.o,color:new dojo.Color([_11.r*s,_11.g*s,_11.b*s,_11.a])};
});
};
})();
}
