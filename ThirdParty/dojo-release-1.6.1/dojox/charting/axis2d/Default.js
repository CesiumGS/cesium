/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.axis2d.Default"]){
dojo._hasResource["dojox.charting.axis2d.Default"]=true;
dojo.provide("dojox.charting.axis2d.Default");
dojo.require("dojox.charting.axis2d.Invisible");
dojo.require("dojox.charting.scaler.linear");
dojo.require("dojox.charting.axis2d.common");
dojo.require("dojo.colors");
dojo.require("dojo.string");
dojo.require("dojox.gfx");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.utils");
(function(){
var dc=dojox.charting,du=dojox.lang.utils,g=dojox.gfx,_1=dc.scaler.linear,_2=4,_3=45;
dojo.declare("dojox.charting.axis2d.Default",dojox.charting.axis2d.Invisible,{defaultParams:{vertical:false,fixUpper:"none",fixLower:"none",natural:false,leftBottom:true,includeZero:false,fixed:true,majorLabels:true,minorTicks:true,minorLabels:true,microTicks:false,rotation:0,htmlLabels:true},optionalParams:{min:0,max:1,from:0,to:1,majorTickStep:4,minorTickStep:2,microTickStep:1,labels:[],labelFunc:null,maxLabelSize:0,maxLabelCharCount:0,trailingSymbol:null,stroke:{},majorTick:{},minorTick:{},microTick:{},tick:{},font:"",fontColor:"",title:"",titleGap:0,titleFont:"",titleFontColor:"",titleOrientation:""},constructor:function(_4,_5){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_5);
du.updateWithPattern(this.opt,_5,this.optionalParams);
},getOffsets:function(){
var s=this.scaler,_6={l:0,r:0,t:0,b:0};
if(!s){
return _6;
}
var o=this.opt,_7=0,a,b,c,d,gl=dc.scaler.common.getNumericLabel,_8=0,ma=s.major,mi=s.minor,ta=this.chart.theme.axis,_9=o.font||(ta.majorTick&&ta.majorTick.font)||(ta.tick&&ta.tick.font),_a=o.titleFont||(ta.tick&&ta.tick.titleFont),_b=(o.titleGap==0)?0:o.titleGap||(ta.tick&&ta.tick.titleGap)||15,_c=this.chart.theme.getTick("major",o),_d=this.chart.theme.getTick("minor",o),_e=_9?g.normalizedLength(g.splitFontString(_9).size):0,_f=_a?g.normalizedLength(g.splitFontString(_a).size):0,_10=o.rotation%360,_11=o.leftBottom,_12=Math.abs(Math.cos(_10*Math.PI/180)),_13=Math.abs(Math.sin(_10*Math.PI/180));
this.trailingSymbol=(o.trailingSymbol===undefined||o.trailingSymbol===null)?this.trailingSymbol:o.trailingSymbol;
if(_10<0){
_10+=360;
}
if(_e){
if(this.labels){
_7=this._groupLabelWidth(this.labels,_9,o.maxLabelCharCount);
}else{
_7=this._groupLabelWidth([gl(ma.start,ma.prec,o),gl(ma.start+ma.count*ma.tick,ma.prec,o),gl(mi.start,mi.prec,o),gl(mi.start+mi.count*mi.tick,mi.prec,o)],_9,o.maxLabelCharCount);
}
_7=o.maxLabelSize?Math.min(o.maxLabelSize,_7):_7;
if(this.vertical){
var _14=_11?"l":"r";
switch(_10){
case 0:
case 180:
_6[_14]=_7;
_6.t=_6.b=_e/2;
break;
case 90:
case 270:
_6[_14]=_e;
_6.t=_6.b=_7/2;
break;
default:
if(_10<=_3||(180<_10&&_10<=(180+_3))){
_6[_14]=_e*_13/2+_7*_12;
_6[_11?"t":"b"]=_e*_12/2+_7*_13;
_6[_11?"b":"t"]=_e*_12/2;
}else{
if(_10>(360-_3)||(180>_10&&_10>(180-_3))){
_6[_14]=_e*_13/2+_7*_12;
_6[_11?"b":"t"]=_e*_12/2+_7*_13;
_6[_11?"t":"b"]=_e*_12/2;
}else{
if(_10<90||(180<_10&&_10<270)){
_6[_14]=_e*_13+_7*_12;
_6[_11?"t":"b"]=_e*_12+_7*_13;
}else{
_6[_14]=_e*_13+_7*_12;
_6[_11?"b":"t"]=_e*_12+_7*_13;
}
}
}
break;
}
_6[_14]+=_2+Math.max(_c.length,_d.length)+(o.title?(_f+_b):0);
}else{
var _14=_11?"b":"t";
switch(_10){
case 0:
case 180:
_6[_14]=_e;
_6.l=_6.r=_7/2;
break;
case 90:
case 270:
_6[_14]=_7;
_6.l=_6.r=_e/2;
break;
default:
if((90-_3)<=_10&&_10<=90||(270-_3)<=_10&&_10<=270){
_6[_14]=_e*_13/2+_7*_12;
_6[_11?"r":"l"]=_e*_12/2+_7*_13;
_6[_11?"l":"r"]=_e*_12/2;
}else{
if(90<=_10&&_10<=(90+_3)||270<=_10&&_10<=(270+_3)){
_6[_14]=_e*_13/2+_7*_12;
_6[_11?"l":"r"]=_e*_12/2+_7*_13;
_6[_11?"r":"l"]=_e*_12/2;
}else{
if(_10<_3||(180<_10&&_10<(180-_3))){
_6[_14]=_e*_13+_7*_12;
_6[_11?"r":"l"]=_e*_12+_7*_13;
}else{
_6[_14]=_e*_13+_7*_12;
_6[_11?"l":"r"]=_e*_12+_7*_13;
}
}
}
break;
}
_6[_14]+=_2+Math.max(_c.length,_d.length)+(o.title?(_f+_b):0);
}
}
if(_7){
this._cachedLabelWidth=_7;
}
return _6;
},render:function(dim,_15){
if(!this.dirty){
return this;
}
var o=this.opt,ta=this.chart.theme.axis,_16=o.leftBottom,_17=o.rotation%360,_18,_19,_1a,_1b=0,_1c,_1d,_1e,_1f,_20,_21,_22=o.font||(ta.majorTick&&ta.majorTick.font)||(ta.tick&&ta.tick.font),_23=o.titleFont||(ta.tick&&ta.tick.titleFont),_24=o.fontColor||(ta.majorTick&&ta.majorTick.fontColor)||(ta.tick&&ta.tick.fontColor)||"black",_25=o.titleFontColor||(ta.tick&&ta.tick.titleFontColor)||"black",_26=(o.titleGap==0)?0:o.titleGap||(ta.tick&&ta.tick.titleGap)||15,_27=o.titleOrientation||(ta.tick&&ta.tick.titleOrientation)||"axis",_28=this.chart.theme.getTick("major",o),_29=this.chart.theme.getTick("minor",o),_2a=this.chart.theme.getTick("micro",o),_2b=Math.max(_28.length,_29.length,_2a.length),_2c="stroke" in o?o.stroke:ta.stroke,_2d=_22?g.normalizedLength(g.splitFontString(_22).size):0,_2e=Math.abs(Math.cos(_17*Math.PI/180)),_2f=Math.abs(Math.sin(_17*Math.PI/180)),_30=_23?g.normalizedLength(g.splitFontString(_23).size):0;
if(_17<0){
_17+=360;
}
if(this.vertical){
_18={y:dim.height-_15.b};
_19={y:_15.t};
_1a={y:(dim.height-_15.b+_15.t)/2};
_1c=_2d*_2f+(this._cachedLabelWidth||0)*_2e+_2+Math.max(_28.length,_29.length)+_30+_26;
_1d={x:0,y:-1};
_20={x:0,y:0};
_1e={x:1,y:0};
_1f={x:_2,y:0};
switch(_17){
case 0:
_21="end";
_20.y=_2d*0.4;
break;
case 90:
_21="middle";
_20.x=-_2d;
break;
case 180:
_21="start";
_20.y=-_2d*0.4;
break;
case 270:
_21="middle";
break;
default:
if(_17<_3){
_21="end";
_20.y=_2d*0.4;
}else{
if(_17<90){
_21="end";
_20.y=_2d*0.4;
}else{
if(_17<(180-_3)){
_21="start";
}else{
if(_17<(180+_3)){
_21="start";
_20.y=-_2d*0.4;
}else{
if(_17<270){
_21="start";
_20.x=_16?0:_2d*0.4;
}else{
if(_17<(360-_3)){
_21="end";
_20.x=_16?0:_2d*0.4;
}else{
_21="end";
_20.y=_2d*0.4;
}
}
}
}
}
}
}
if(_16){
_18.x=_19.x=_15.l;
_1b=(_27&&_27=="away")?90:270;
_1a.x=_15.l-_1c+(_1b==270?_30:0);
_1e.x=-1;
_1f.x=-_1f.x;
}else{
_18.x=_19.x=dim.width-_15.r;
_1b=(_27&&_27=="axis")?90:270;
_1a.x=dim.width-_15.r+_1c-(_1b==270?0:_30);
switch(_21){
case "start":
_21="end";
break;
case "end":
_21="start";
break;
case "middle":
_20.x+=_2d;
break;
}
}
}else{
_18={x:_15.l};
_19={x:dim.width-_15.r};
_1a={x:(dim.width-_15.r+_15.l)/2};
_1c=_2d*_2e+(this._cachedLabelWidth||0)*_2f+_2+Math.max(_28.length,_29.length)+_30+_26;
_1d={x:1,y:0};
_20={x:0,y:0};
_1e={x:0,y:1};
_1f={x:0,y:_2};
switch(_17){
case 0:
_21="middle";
_20.y=_2d;
break;
case 90:
_21="start";
_20.x=-_2d*0.4;
break;
case 180:
_21="middle";
break;
case 270:
_21="end";
_20.x=_2d*0.4;
break;
default:
if(_17<(90-_3)){
_21="start";
_20.y=_16?_2d:0;
}else{
if(_17<(90+_3)){
_21="start";
_20.x=-_2d*0.4;
}else{
if(_17<180){
_21="start";
_20.y=_16?0:-_2d;
}else{
if(_17<(270-_3)){
_21="end";
_20.y=_16?0:-_2d;
}else{
if(_17<(270+_3)){
_21="end";
_20.y=_16?_2d*0.4:0;
}else{
_21="end";
_20.y=_16?_2d:0;
}
}
}
}
}
}
if(_16){
_18.y=_19.y=dim.height-_15.b;
_1b=(_27&&_27=="axis")?180:0;
_1a.y=dim.height-_15.b+_1c-(_1b?_30:0);
}else{
_18.y=_19.y=_15.t;
_1b=(_27&&_27=="away")?180:0;
_1a.y=_15.t-_1c+(_1b?0:_30);
_1e.y=-1;
_1f.y=-_1f.y;
switch(_21){
case "start":
_21="end";
break;
case "end":
_21="start";
break;
case "middle":
_20.y-=_2d;
break;
}
}
}
this.cleanGroup();
try{
var s=this.group,c=this.scaler,t=this.ticks,_31,f=_1.getTransformerFromModel(this.scaler),_32=!_1b&&!_17&&this.opt.htmlLabels&&!dojo.isIE&&!dojo.isOpera?"html":"gfx",dx=_1e.x*_28.length,dy=_1e.y*_28.length;
s.createLine({x1:_18.x,y1:_18.y,x2:_19.x,y2:_19.y}).setStroke(_2c);
if(o.title){
var _33=dc.axis2d.common.createText[_32](this.chart,s,_1a.x,_1a.y,"middle",o.title,_23,_25);
if(_32=="html"){
this.htmlElements.push(_33);
}else{
_33.setTransform(g.matrix.rotategAt(_1b,_1a.x,_1a.y));
}
}
dojo.forEach(t.major,function(_34){
var _35=f(_34.value),_36,x=_18.x+_1d.x*_35,y=_18.y+_1d.y*_35;
s.createLine({x1:x,y1:y,x2:x+dx,y2:y+dy}).setStroke(_28);
if(_34.label){
var _37=o.maxLabelCharCount?this.getTextWithLimitCharCount(_34.label,_22,o.maxLabelCharCount):{text:_34.label,truncated:false};
_37=o.maxLabelSize?this.getTextWithLimitLength(_37.text,_22,o.maxLabelSize,_37.truncated):_37;
_36=dc.axis2d.common.createText[_32](this.chart,s,x+dx+_1f.x+(_17?0:_20.x),y+dy+_1f.y+(_17?0:_20.y),_21,_37.text,_22,_24);
_37.truncated&&this.labelTooltip(_36,this.chart,_34.label,_37.text,_22,_32);
if(_32=="html"){
this.htmlElements.push(_36);
}else{
if(_17){
_36.setTransform([{dx:_20.x,dy:_20.y},g.matrix.rotategAt(_17,x+dx+_1f.x,y+dy+_1f.y)]);
}
}
}
},this);
dx=_1e.x*_29.length;
dy=_1e.y*_29.length;
_31=c.minMinorStep<=c.minor.tick*c.bounds.scale;
dojo.forEach(t.minor,function(_38){
var _39=f(_38.value),_3a,x=_18.x+_1d.x*_39,y=_18.y+_1d.y*_39;
s.createLine({x1:x,y1:y,x2:x+dx,y2:y+dy}).setStroke(_29);
if(_31&&_38.label){
var _3b=o.maxLabelCharCount?this.getTextWithLimitCharCount(_38.label,_22,o.maxLabelCharCount):{text:_38.label,truncated:false};
_3b=o.maxLabelSize?this.getTextWithLimitLength(_3b.text,_22,o.maxLabelSize,_3b.truncated):_3b;
_3a=dc.axis2d.common.createText[_32](this.chart,s,x+dx+_1f.x+(_17?0:_20.x),y+dy+_1f.y+(_17?0:_20.y),_21,_3b.text,_22,_24);
_3b.truncated&&this.labelTooltip(_3a,this.chart,_38.label,_3b.text,_22,_32);
if(_32=="html"){
this.htmlElements.push(_3a);
}else{
if(_17){
_3a.setTransform([{dx:_20.x,dy:_20.y},g.matrix.rotategAt(_17,x+dx+_1f.x,y+dy+_1f.y)]);
}
}
}
},this);
dx=_1e.x*_2a.length;
dy=_1e.y*_2a.length;
dojo.forEach(t.micro,function(_3c){
var _3d=f(_3c.value),_3e,x=_18.x+_1d.x*_3d,y=_18.y+_1d.y*_3d;
s.createLine({x1:x,y1:y,x2:x+dx,y2:y+dy}).setStroke(_2a);
},this);
}
catch(e){
}
this.dirty=false;
return this;
},labelTooltip:function(_3f,_40,_41,_42,_43,_44){
if(!dijit||!dijit.Tooltip){
return;
}
var _45={type:"rect"},_46=["above","below"],_47=dojox.gfx._base._getTextBox(_42,{font:_43}).w||0;
fontHeight=_43?g.normalizedLength(g.splitFontString(_43).size):0;
if(_44=="html"){
dojo.mixin(_45,dojo.coords(_3f.firstChild,true));
_45.width=Math.ceil(_47);
_45.height=Math.ceil(fontHeight);
this._events.push({shape:dojo,handle:dojo.connect(_3f.firstChild,"onmouseover",this,function(e){
dijit.showTooltip(_41,_45,_46);
})});
this._events.push({shape:dojo,handle:dojo.connect(_3f.firstChild,"onmouseout",this,function(e){
dijit.hideTooltip(_45);
})});
}else{
var shp=_3f.getShape(),lt=dojo.coords(_40.node,true);
_45=dojo.mixin(_45,{x:shp.x-_47/2,y:shp.y});
_45.x+=lt.x;
_45.y+=lt.y;
_45.x=Math.round(_45.x);
_45.y=Math.round(_45.y);
_45.width=Math.ceil(_47);
_45.height=Math.ceil(fontHeight);
this._events.push({shape:_3f,handle:_3f.connect("onmouseenter",this,function(e){
dijit.showTooltip(_41,_45,_46);
})});
this._events.push({shape:_3f,handle:_3f.connect("onmouseleave",this,function(e){
dijit.hideTooltip(_45);
})});
}
}});
})();
}
