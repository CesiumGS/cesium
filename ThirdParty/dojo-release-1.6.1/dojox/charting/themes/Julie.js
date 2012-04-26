/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.Julie"]){
dojo._hasResource["dojox.charting.themes.Julie"]=true;
dojo.provide("dojox.charting.themes.Julie");
dojo.require("dojox.gfx.gradutils");
dojo.require("dojox.charting.Theme");
(function(){
var dc=dojox.charting,_1=dc.themes,_2=dc.Theme,g=_2.generateGradient,_3={type:"linear",space:"shape",x1:0,y1:0,x2:0,y2:100};
_1.Julie=new dc.Theme({seriesThemes:[{fill:g(_3,"#59a0bd","#497c91"),stroke:{color:"#22627d"}},{fill:g(_3,"#8d88c7","#6c6d8e"),stroke:{color:"#8a84c5"}},{fill:g(_3,"#85a54a","#768b4e"),stroke:{color:"#5b6d1f"}},{fill:g(_3,"#e8e667","#c6c361"),stroke:{color:"#918e38"}},{fill:g(_3,"#e9c756","#c7a223"),stroke:{color:"#947b30"}},{fill:g(_3,"#a05a5a","#815454"),stroke:{color:"#572828"}},{fill:g(_3,"#b17044","#72543e"),stroke:{color:"#74482e"}},{fill:g(_3,"#a5a5a5","#727272"),stroke:{color:"#535353"}},{fill:g(_3,"#9dc7d9","#59a0bd"),stroke:{color:"#22627d"}},{fill:g(_3,"#b7b3da","#8681b3"),stroke:{color:"#8a84c5"}},{fill:g(_3,"#a8c179","#85a54a"),stroke:{color:"#5b6d1f"}},{fill:g(_3,"#eeea99","#d6d456"),stroke:{color:"#918e38"}},{fill:g(_3,"#ebcf81","#e9c756"),stroke:{color:"#947b30"}},{fill:g(_3,"#c99999","#a05a5a"),stroke:{color:"#572828"}},{fill:g(_3,"#c28b69","#7d5437"),stroke:{color:"#74482e"}},{fill:g(_3,"#bebebe","#8c8c8c"),stroke:{color:"#535353"}},{fill:g(_3,"#c7e0e9","#92baca"),stroke:{color:"#22627d"}},{fill:g(_3,"#c9c6e4","#ada9d6"),stroke:{color:"#8a84c5"}},{fill:g(_3,"#c0d0a0","#98ab74"),stroke:{color:"#5b6d1f"}},{fill:g(_3,"#f0eebb","#dcd87c"),stroke:{color:"#918e38"}},{fill:g(_3,"#efdeb0","#ebcf81"),stroke:{color:"#947b30"}},{fill:g(_3,"#ddc0c0","#c99999"),stroke:{color:"#572828"}},{fill:g(_3,"#cfb09b","#c28b69"),stroke:{color:"#74482e"}},{fill:g(_3,"#d8d8d8","#bebebe"),stroke:{color:"#535353"}},{fill:g(_3,"#ddeff5","#a5c4cd"),stroke:{color:"#22627d"}},{fill:g(_3,"#dedcf0","#b3afd3"),stroke:{color:"#8a84c5"}},{fill:g(_3,"#dfe9ca","#c0d0a0"),stroke:{color:"#5b6d1f"}},{fill:g(_3,"#f8f7db","#e5e28f"),stroke:{color:"#918e38"}},{fill:g(_3,"#f7f0d8","#cfbd88"),stroke:{color:"#947b30"}},{fill:g(_3,"#eedede","#caafaf"),stroke:{color:"#572828"}},{fill:g(_3,"#e3cdbf","#cfb09b"),stroke:{color:"#74482e"}},{fill:g(_3,"#efefef","#cacaca"),stroke:{color:"#535353"}}]});
_1.Julie.next=function(_4,_5,_6){
if(_4=="line"||_4=="area"){
var s=this.seriesThemes[this._current%this.seriesThemes.length];
s.fill.space="plot";
var _7=_2.prototype.next.apply(this,arguments);
s.fill.space="shape";
return _7;
}
return _2.prototype.next.apply(this,arguments);
};
_1.Julie.post=function(_8,_9){
_8=_2.prototype.post.apply(this,arguments);
if(_9=="slice"&&_8.series.fill&&_8.series.fill.type=="radial"){
_8.series.fill=dojox.gfx.gradutils.reverse(_8.series.fill);
}
return _8;
};
})();
}
