/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx.VectorText"]){
dojo._hasResource["dojox.gfx.VectorText"]=true;
dojo.provide("dojox.gfx.VectorText");
dojo.require("dojox.gfx");
dojo.require("dojox.xml.DomParser");
dojo.require("dojox.html.metrics");
(function(){
dojo.mixin(dojox.gfx,{vectorFontFitting:{NONE:0,FLOW:1,FIT:2},defaultVectorText:{type:"vectortext",x:0,y:0,width:null,height:null,text:"",align:"start",decoration:"none",fitting:0,leading:1.5},defaultVectorFont:{type:"vectorfont",size:"10pt",family:null},_vectorFontCache:{},_svgFontCache:{},getVectorFont:function(_1){
if(dojox.gfx._vectorFontCache[_1]){
return dojox.gfx._vectorFontCache[_1];
}
return new dojox.gfx.VectorFont(_1);
}});
dojo.declare("dojox.gfx.VectorFont",null,{_entityRe:/&(quot|apos|lt|gt|amp|#x[^;]+|#\d+);/g,_decodeEntitySequence:function(_2){
if(!_2.match(this._entityRe)){
return;
}
var _3={amp:"&",apos:"'",quot:"\"",lt:"<",gt:">"};
var r,_4="";
while((r=this._entityRe.exec(_2))!==null){
if(r[1].charAt(1)=="x"){
_4+=String.fromCharCode(parseInt(r[1].slice(2),16));
}else{
if(!isNaN(parseInt(r[1].slice(1),10))){
_4+=String.fromCharCode(parseInt(r[1].slice(1),10));
}else{
_4+=_3[r[1]]||"";
}
}
}
return _4;
},_parse:function(_5,_6){
var _7=dojox.gfx._svgFontCache[_6]||dojox.xml.DomParser.parse(_5);
var f=_7.documentElement.byName("font")[0],_8=_7.documentElement.byName("font-face")[0];
var _9=parseFloat(_8.getAttribute("units-per-em")||1000,10);
var _a={x:parseFloat(f.getAttribute("horiz-adv-x"),10),y:parseFloat(f.getAttribute("vert-adv-y")||0,10)};
if(!_a.y){
_a.y=_9;
}
var _b={horiz:{x:parseFloat(f.getAttribute("horiz-origin-x")||0,10),y:parseFloat(f.getAttribute("horiz-origin-y")||0,10)},vert:{x:parseFloat(f.getAttribute("vert-origin-x")||0,10),y:parseFloat(f.getAttribute("vert-origin-y")||0,10)}};
var _c=_8.getAttribute("font-family"),_d=_8.getAttribute("font-style")||"all",_e=_8.getAttribute("font-variant")||"normal",_f=_8.getAttribute("font-weight")||"all",_10=_8.getAttribute("font-stretch")||"normal",_11=_8.getAttribute("unicode-range")||"U+0-10FFFF",_12=_8.getAttribute("panose-1")||"0 0 0 0 0 0 0 0 0 0",_13=_8.getAttribute("cap-height"),_14=parseFloat(_8.getAttribute("ascent")||(_9-_b.vert.y),10),_15=parseFloat(_8.getAttribute("descent")||_b.vert.y,10),_16={};
var _17=_c;
if(_8.byName("font-face-name")[0]){
_17=_8.byName("font-face-name")[0].getAttribute("name");
}
if(dojox.gfx._vectorFontCache[_17]){
return;
}
dojo.forEach(["alphabetic","ideographic","mathematical","hanging"],function(_18){
var a=_8.getAttribute(_18);
if(a!==null){
_16[_18]=parseFloat(a,10);
}
});
var _19=parseFloat(_7.documentElement.byName("missing-glyph")[0].getAttribute("horiz-adv-x")||_a.x,10);
var _1a={},_1b={},g=_7.documentElement.byName("glyph");
dojo.forEach(g,function(_1c){
var _1d=_1c.getAttribute("unicode"),_17=_1c.getAttribute("glyph-name"),_1e=parseFloat(_1c.getAttribute("horiz-adv-x")||_a.x,10),_1f=_1c.getAttribute("d");
if(_1d.match(this._entityRe)){
_1d=this._decodeEntitySequence(_1d);
}
var o={code:_1d,name:_17,xAdvance:_1e,path:_1f};
_1a[_1d]=o;
_1b[_17]=o;
},this);
var _20=_7.documentElement.byName("hkern");
dojo.forEach(_20,function(_21,i){
var k=-parseInt(_21.getAttribute("k"),10);
var u1=_21.getAttribute("u1"),g1=_21.getAttribute("g1"),u2=_21.getAttribute("u2"),g2=_21.getAttribute("g2"),gl;
if(u1){
u1=this._decodeEntitySequence(u1);
if(_1a[u1]){
gl=_1a[u1];
}
}else{
if(_1b[g1]){
gl=_1b[g1];
}
}
if(gl){
if(!gl.kern){
gl.kern={};
}
if(u2){
u2=this._decodeEntitySequence(u2);
gl.kern[u2]={x:k};
}else{
if(_1b[g2]){
gl.kern[_1b[g2].code]={x:k};
}
}
}
},this);
dojo.mixin(this,{family:_c,name:_17,style:_d,variant:_e,weight:_f,stretch:_10,range:_11,viewbox:{width:_9,height:_9},origin:_b,advance:dojo.mixin(_a,{missing:{x:_19,y:_19}}),ascent:_14,descent:_15,baseline:_16,glyphs:_1a});
dojox.gfx._vectorFontCache[_17]=this;
dojox.gfx._vectorFontCache[_6]=this;
if(_17!=_c&&!dojox.gfx._vectorFontCache[_c]){
dojox.gfx._vectorFontCache[_c]=this;
}
if(!dojox.gfx._svgFontCache[_6]){
dojox.gfx._svgFontCache[_6]=_7;
}
},_clean:function(){
var _22=this.name,_23=this.family;
dojo.forEach(["family","name","style","variant","weight","stretch","range","viewbox","origin","advance","ascent","descent","baseline","glyphs"],function(_24){
try{
delete this[_24];
}
catch(e){
}
},this);
if(dojox.gfx._vectorFontCache[_22]){
delete dojox.gfx._vectorFontCache[_22];
}
if(dojox.gfx._vectorFontCache[_23]){
delete dojox.gfx._vectorFontCache[_23];
}
return this;
},constructor:function(url){
this._defaultLeading=1.5;
if(url!==undefined){
this.load(url);
}
},load:function(url){
this.onLoadBegin(url.toString());
this._parse(dojox.gfx._svgFontCache[url.toString()]||dojo._getText(url.toString()),url.toString());
this.onLoad(this);
return this;
},initialized:function(){
return (this.glyphs!==null);
},_round:function(n){
return Math.round(1000*n)/1000;
},_leading:function(_25){
return this.viewbox.height*(_25||this._defaultLeading);
},_normalize:function(str){
return str.replace(/\s+/g,String.fromCharCode(32));
},_getWidth:function(_26){
var w=0,_27=0,_28=null;
dojo.forEach(_26,function(_29,i){
_27=_29.xAdvance;
if(_26[i]&&_29.kern&&_29.kern[_26[i].code]){
_27+=_29.kern[_26[i].code].x;
}
w+=_27;
_28=_29;
});
if(_28&&_28.code==" "){
w-=_28.xAdvance;
}
return this._round(w);
},_getLongestLine:function(_2a){
var _2b=0,idx=0;
dojo.forEach(_2a,function(_2c,i){
var max=Math.max(_2b,this._getWidth(_2c));
if(max>_2b){
_2b=max;
idx=i;
}
},this);
return {width:_2b,index:idx,line:_2a[idx]};
},_trim:function(_2d){
var fn=function(arr){
if(!arr.length){
return;
}
if(arr[arr.length-1].code==" "){
arr.splice(arr.length-1,1);
}
if(!arr.length){
return;
}
if(arr[0].code==" "){
arr.splice(0,1);
}
};
if(dojo.isArray(_2d[0])){
dojo.forEach(_2d,fn);
}else{
fn(_2d);
}
return _2d;
},_split:function(_2e,_2f){
var w=this._getWidth(_2e),_30=Math.floor(w/_2f),_31=[],cw=0,c=[],_32=false;
for(var i=0,l=_2e.length;i<l;i++){
if(_2e[i].code==" "){
_32=true;
}
cw+=_2e[i].xAdvance;
if(i+1<l&&_2e[i].kern&&_2e[i].kern[_2e[i+1].code]){
cw+=_2e[i].kern[_2e[i+1].code].x;
}
if(cw>=_30){
var chr=_2e[i];
while(_32&&chr.code!=" "&&i>=0){
chr=c.pop();
i--;
}
_31.push(c);
c=[];
cw=0;
_32=false;
}
c.push(_2e[i]);
}
if(c.length){
_31.push(c);
}
return this._trim(_31);
},_getSizeFactor:function(_33){
_33+="";
var _34=dojox.html.metrics.getCachedFontMeasurements(),_35=this.viewbox.height,f=_34["1em"],_36=parseFloat(_33,10);
if(_33.indexOf("em")>-1){
return this._round((_34["1em"]*_36)/_35);
}else{
if(_33.indexOf("ex")>-1){
return this._round((_34["1ex"]*_36)/_35);
}else{
if(_33.indexOf("pt")>-1){
return this._round(((_34["12pt"]/12)*_36)/_35);
}else{
if(_33.indexOf("px")>-1){
return this._round(((_34["16px"]/16)*_36)/_35);
}else{
if(_33.indexOf("%")>-1){
return this._round((_34["1em"]*(_36/100))/_35);
}else{
f=_34[_33]||_34.medium;
return this._round(f/_35);
}
}
}
}
}
},_getFitFactor:function(_37,w,h,l){
if(!h){
return this._round(w/this._getWidth(_37));
}else{
var _38=this._getLongestLine(_37).width,_39=(_37.length*(this.viewbox.height*l))-((this.viewbox.height*l)-this.viewbox.height);
return this._round(Math.min(w/_38,h/_39));
}
},_getBestFit:function(_3a,w,h,_3b){
var _3c=32,_3d=0,_3e=_3c;
while(_3c>0){
var f=this._getFitFactor(this._split(_3a,_3c),w,h,_3b);
if(f>_3d){
_3d=f;
_3e=_3c;
}
_3c--;
}
return {scale:_3d,lines:this._split(_3a,_3e)};
},_getBestFlow:function(_3f,w,_40){
var _41=[],cw=0,c=[],_42=false;
for(var i=0,l=_3f.length;i<l;i++){
if(_3f[i].code==" "){
_42=true;
}
var tw=_3f[i].xAdvance;
if(i+1<l&&_3f[i].kern&&_3f[i].kern[_3f[i+1].code]){
tw+=_3f[i].kern[_3f[i+1].code].x;
}
cw+=_40*tw;
if(cw>=w){
var chr=_3f[i];
while(_42&&chr.code!=" "&&i>=0){
chr=c.pop();
i--;
}
_41.push(c);
c=[];
cw=0;
_42=false;
}
c.push(_3f[i]);
}
if(c.length){
_41.push(c);
}
return this._trim(_41);
},getWidth:function(_43,_44){
return this._getWidth(dojo.map(this._normalize(_43).split(""),function(chr){
return this.glyphs[chr]||{xAdvance:this.advance.missing.x};
},this))*(_44||1);
},getLineHeight:function(_45){
return this.viewbox.height*(_45||1);
},getCenterline:function(_46){
return (_46||1)*(this.viewbox.height/2);
},getBaseline:function(_47){
return (_47||1)*(this.viewbox.height+this.descent);
},draw:function(_48,_49,_4a,_4b,_4c){
if(!this.initialized()){
throw new Error("dojox.gfx.VectorFont.draw(): we have not been initialized yet.");
}
var g=_48.createGroup();
if(_49.x||_49.y){
_48.applyTransform({dx:_49.x||0,dy:_49.y||0});
}
var _4d=dojo.map(this._normalize(_49.text).split(""),function(chr){
return this.glyphs[chr]||{path:null,xAdvance:this.advance.missing.x};
},this);
var _4e=_4a.size,_4f=_49.fitting,_50=_49.width,_51=_49.height,_52=_49.align,_53=_49.leading||this._defaultLeading;
if(_4f){
if((_4f==dojox.gfx.vectorFontFitting.FLOW&&!_50)||(_4f==dojox.gfx.vectorFontFitting.FIT&&(!_50||!_51))){
_4f=dojox.gfx.vectorFontFitting.NONE;
}
}
var _54,_55;
switch(_4f){
case dojox.gfx.vectorFontFitting.FIT:
var o=this._getBestFit(_4d,_50,_51,_53);
_55=o.scale;
_54=o.lines;
break;
case dojox.gfx.vectorFontFitting.FLOW:
_55=this._getSizeFactor(_4e);
_54=this._getBestFlow(_4d,_50,_55);
break;
default:
_55=this._getSizeFactor(_4e);
_54=[_4d];
}
_54=dojo.filter(_54,function(_56){
return _56.length>0;
});
var cy=0,_57=this._getLongestLine(_54).width;
for(var i=0,l=_54.length;i<l;i++){
var cx=0,_58=_54[i],_59=this._getWidth(_58),lg=g.createGroup();
for(var j=0;j<_58.length;j++){
var _5a=_58[j];
if(_5a.path!==null){
var p=lg.createPath(_5a.path).setFill(_4b);
if(_4c){
p.setStroke(_4c);
}
p.setTransform([dojox.gfx.matrix.flipY,dojox.gfx.matrix.translate(cx,-this.viewbox.height-this.descent)]);
}
cx+=_5a.xAdvance;
if(j+1<_58.length&&_5a.kern&&_5a.kern[_58[j+1].code]){
cx+=_5a.kern[_58[j+1].code].x;
}
}
var dx=0;
if(_52=="middle"){
dx=_57/2-_59/2;
}else{
if(_52=="end"){
dx=_57-_59;
}
}
lg.setTransform({dx:dx,dy:cy});
cy+=this.viewbox.height*_53;
}
g.setTransform(dojox.gfx.matrix.scale(_55));
return g;
},onLoadBegin:function(url){
},onLoad:function(_5b){
}});
})();
}
