/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Pie"]){
dojo._hasResource["dojox.charting.plot2d.Pie"]=true;
dojo.provide("dojox.charting.plot2d.Pie");
dojo.require("dojox.charting.Element");
dojo.require("dojox.charting.axis2d.common");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.plot2d._PlotEvents");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.utils");
dojo.require("dojox.gfx");
(function(){
var df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting.plot2d.common,da=dojox.charting.axis2d.common,g=dojox.gfx,m=g.matrix,_1=0.2;
dojo.declare("dojox.charting.plot2d.Pie",[dojox.charting.Element,dojox.charting.plot2d._PlotEvents],{defaultParams:{labels:true,ticks:false,fixed:true,precision:1,labelOffset:20,labelStyle:"default",htmlLabels:true,radGrad:"native",fanSize:5,startAngle:0},optionalParams:{radius:0,stroke:{},outline:{},shadow:{},fill:{},font:"",fontColor:"",labelWiring:{}},constructor:function(_2,_3){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_3);
du.updateWithPattern(this.opt,_3,this.optionalParams);
this.run=null;
this.dyn=[];
},clear:function(){
this.dirty=true;
this.dyn=[];
this.run=null;
return this;
},setAxis:function(_4){
return this;
},addSeries:function(_5){
this.run=_5;
return this;
},getSeriesStats:function(){
return dojo.delegate(dc.defaultStats);
},initializeScalers:function(){
return this;
},getRequiredColors:function(){
return this.run?this.run.data.length:0;
},render:function(_6,_7){
if(!this.dirty){
return this;
}
this.resetEvents();
this.dirty=false;
this._eventSeries={};
this.cleanGroup();
var s=this.group,t=this.chart.theme;
if(!this.run||!this.run.data.length){
return this;
}
var rx=(_6.width-_7.l-_7.r)/2,ry=(_6.height-_7.t-_7.b)/2,r=Math.min(rx,ry),_8="font" in this.opt?this.opt.font:t.axis.font,_9=_8?g.normalizedLength(g.splitFontString(_8).size):0,_a="fontColor" in this.opt?this.opt.fontColor:t.axis.fontColor,_b=m._degToRad(this.opt.startAngle),_c=_b,_d,_e,_f,_10,_11,_12,run=this.run.data,_13=this.events();
if(typeof run[0]=="number"){
_e=df.map(run,"x ? Math.max(x, 0) : 0");
if(df.every(_e,"<= 0")){
return this;
}
_f=df.map(_e,"/this",df.foldl(_e,"+",0));
if(this.opt.labels){
_10=dojo.map(_f,function(x){
return x>0?this._getLabel(x*100)+"%":"";
},this);
}
}else{
_e=df.map(run,"x ? Math.max(x.y, 0) : 0");
if(df.every(_e,"<= 0")){
return this;
}
_f=df.map(_e,"/this",df.foldl(_e,"+",0));
if(this.opt.labels){
_10=dojo.map(_f,function(x,i){
if(x<=0){
return "";
}
var v=run[i];
return "text" in v?v.text:this._getLabel(x*100)+"%";
},this);
}
}
var _14=df.map(run,function(v,i){
if(v===null||typeof v=="number"){
return t.next("slice",[this.opt,this.run],true);
}
return t.next("slice",[this.opt,this.run,v],true);
},this);
if(this.opt.labels){
_11=df.foldl1(df.map(_10,function(_15,i){
var _16=_14[i].series.font;
return dojox.gfx._base._getTextBox(_15,{font:_16}).w;
},this),"Math.max(a, b)")/2;
if(this.opt.labelOffset<0){
r=Math.min(rx-2*_11,ry-_9)+this.opt.labelOffset;
}
_12=r-this.opt.labelOffset;
}
if("radius" in this.opt){
r=this.opt.radius;
_12=r-this.opt.labelOffset;
}
var _17={cx:_7.l+rx,cy:_7.t+ry,r:r};
this.dyn=[];
var _18=new Array(_f.length);
dojo.some(_f,function(_19,i){
if(_19<=0){
return false;
}
var v=run[i],_1a=_14[i],_1b;
if(_19>=1){
_1b=this._plotFill(_1a.series.fill,_6,_7);
_1b=this._shapeFill(_1b,{x:_17.cx-_17.r,y:_17.cy-_17.r,width:2*_17.r,height:2*_17.r});
_1b=this._pseudoRadialFill(_1b,{x:_17.cx,y:_17.cy},_17.r);
var _1c=s.createCircle(_17).setFill(_1b).setStroke(_1a.series.stroke);
this.dyn.push({fill:_1b,stroke:_1a.series.stroke});
if(_13){
var o={element:"slice",index:i,run:this.run,shape:_1c,x:i,y:typeof v=="number"?v:v.y,cx:_17.cx,cy:_17.cy,cr:r};
this._connectEvents(o);
_18[i]=o;
}
return true;
}
var end=_c+_19*2*Math.PI;
if(i+1==_f.length){
end=_b+2*Math.PI;
}
var _1d=end-_c,x1=_17.cx+r*Math.cos(_c),y1=_17.cy+r*Math.sin(_c),x2=_17.cx+r*Math.cos(end),y2=_17.cy+r*Math.sin(end);
var _1e=m._degToRad(this.opt.fanSize);
if(_1a.series.fill&&_1a.series.fill.type==="radial"&&this.opt.radGrad==="fan"&&_1d>_1e){
var _1f=s.createGroup(),_20=Math.ceil(_1d/_1e),_21=_1d/_20;
_1b=this._shapeFill(_1a.series.fill,{x:_17.cx-_17.r,y:_17.cy-_17.r,width:2*_17.r,height:2*_17.r});
for(var j=0;j<_20;++j){
var _22=j==0?x1:_17.cx+r*Math.cos(_c+(j-_1)*_21),_23=j==0?y1:_17.cy+r*Math.sin(_c+(j-_1)*_21),_24=j==_20-1?x2:_17.cx+r*Math.cos(_c+(j+1+_1)*_21),_25=j==_20-1?y2:_17.cy+r*Math.sin(_c+(j+1+_1)*_21),fan=_1f.createPath({}).moveTo(_17.cx,_17.cy).lineTo(_22,_23).arcTo(r,r,0,_21>Math.PI,true,_24,_25).lineTo(_17.cx,_17.cy).closePath().setFill(this._pseudoRadialFill(_1b,{x:_17.cx,y:_17.cy},r,_c+(j+0.5)*_21,_c+(j+0.5)*_21));
}
_1f.createPath({}).moveTo(_17.cx,_17.cy).lineTo(x1,y1).arcTo(r,r,0,_1d>Math.PI,true,x2,y2).lineTo(_17.cx,_17.cy).closePath().setStroke(_1a.series.stroke);
_1c=_1f;
}else{
_1c=s.createPath({}).moveTo(_17.cx,_17.cy).lineTo(x1,y1).arcTo(r,r,0,_1d>Math.PI,true,x2,y2).lineTo(_17.cx,_17.cy).closePath().setStroke(_1a.series.stroke);
var _1b=_1a.series.fill;
if(_1b&&_1b.type==="radial"){
_1b=this._shapeFill(_1b,{x:_17.cx-_17.r,y:_17.cy-_17.r,width:2*_17.r,height:2*_17.r});
if(this.opt.radGrad==="linear"){
_1b=this._pseudoRadialFill(_1b,{x:_17.cx,y:_17.cy},r,_c,end);
}
}else{
if(_1b&&_1b.type==="linear"){
_1b=this._plotFill(_1b,_6,_7);
_1b=this._shapeFill(_1b,_1c.getBoundingBox());
}
}
_1c.setFill(_1b);
}
this.dyn.push({fill:_1b,stroke:_1a.series.stroke});
if(_13){
var o={element:"slice",index:i,run:this.run,shape:_1c,x:i,y:typeof v=="number"?v:v.y,cx:_17.cx,cy:_17.cy,cr:r};
this._connectEvents(o);
_18[i]=o;
}
_c=end;
return false;
},this);
if(this.opt.labels){
if(this.opt.labelStyle=="default"){
_c=_b;
dojo.some(_f,function(_26,i){
if(_26<=0){
return false;
}
var _27=_14[i];
if(_26>=1){
var v=run[i],_28=da.createText[this.opt.htmlLabels&&dojox.gfx.renderer!="vml"?"html":"gfx"](this.chart,s,_17.cx,_17.cy+_9/2,"middle",_10[i],_27.series.font,_27.series.fontColor);
if(this.opt.htmlLabels){
this.htmlElements.push(_28);
}
return true;
}
var end=_c+_26*2*Math.PI,v=run[i];
if(i+1==_f.length){
end=_b+2*Math.PI;
}
var _29=(_c+end)/2,x=_17.cx+_12*Math.cos(_29),y=_17.cy+_12*Math.sin(_29)+_9/2;
var _28=da.createText[this.opt.htmlLabels&&dojox.gfx.renderer!="vml"?"html":"gfx"](this.chart,s,x,y,"middle",_10[i],_27.series.font,_27.series.fontColor);
if(this.opt.htmlLabels){
this.htmlElements.push(_28);
}
_c=end;
return false;
},this);
}else{
if(this.opt.labelStyle=="columns"){
_c=_b;
var _2a=[];
dojo.forEach(_f,function(_2b,i){
var end=_c+_2b*2*Math.PI;
if(i+1==_f.length){
end=_b+2*Math.PI;
}
var _2c=(_c+end)/2;
_2a.push({angle:_2c,left:Math.cos(_2c)<0,theme:_14[i],index:i,omit:end-_c<0.001});
_c=end;
});
var _2d=dojox.gfx._base._getTextBox("a",{font:_8}).h;
this._getProperLabelRadius(_2a,_2d,_17.r*1.1);
dojo.forEach(_2a,function(_2e,i){
if(!_2e.omit){
var _2f=_17.cx-_17.r*2,_30=_17.cx+_17.r*2,_31=dojox.gfx._base._getTextBox(_10[i],{font:_8}).w,x=_17.cx+_2e.labelR*Math.cos(_2e.angle),y=_17.cy+_2e.labelR*Math.sin(_2e.angle),_32=(_2e.left)?(_2f+_31):(_30-_31),_33=(_2e.left)?_2f:_32;
var _34=s.createPath().moveTo(_17.cx+_17.r*Math.cos(_2e.angle),_17.cy+_17.r*Math.sin(_2e.angle));
if(Math.abs(_2e.labelR*Math.cos(_2e.angle))<_17.r*2-_31){
_34.lineTo(x,y);
}
_34.lineTo(_32,y).setStroke(_2e.theme.series.labelWiring);
var _35=da.createText[this.opt.htmlLabels&&dojox.gfx.renderer!="vml"?"html":"gfx"](this.chart,s,_33,y,"left",_10[i],_2e.theme.series.font,_2e.theme.series.fontColor);
if(this.opt.htmlLabels){
this.htmlElements.push(_35);
}
}
},this);
}
}
}
var esi=0;
this._eventSeries[this.run.name]=df.map(run,function(v){
return v<=0?null:_18[esi++];
});
return this;
},_getProperLabelRadius:function(_36,_37,_38){
var _39={},_3a={},_3b=1,_3c=1;
if(_36.length==1){
_36[0].labelR=_38;
return;
}
for(var i=0;i<_36.length;i++){
var _3d=Math.abs(Math.sin(_36[i].angle));
if(_36[i].left){
if(_3b>_3d){
_3b=_3d;
_39=_36[i];
}
}else{
if(_3c>_3d){
_3c=_3d;
_3a=_36[i];
}
}
}
_39.labelR=_3a.labelR=_38;
this._caculateLabelR(_39,_36,_37);
this._caculateLabelR(_3a,_36,_37);
},_caculateLabelR:function(_3e,_3f,_40){
var i=_3e.index,_41=_3f.length,_42=_3e.labelR;
while(!(_3f[i%_41].left^_3f[(i+1)%_41].left)){
if(!_3f[(i+1)%_41].omit){
var _43=(Math.sin(_3f[i%_41].angle)*_42+((_3f[i%_41].left)?(-_40):_40))/Math.sin(_3f[(i+1)%_41].angle);
_42=(_43<_3e.labelR)?_3e.labelR:_43;
_3f[(i+1)%_41].labelR=_42;
}
i++;
}
i=_3e.index,j=(i==0)?_41-1:i-1;
while(!(_3f[i].left^_3f[j].left)){
if(!_3f[j].omit){
var _43=(Math.sin(_3f[i].angle)*_42+((_3f[i].left)?_40:(-_40)))/Math.sin(_3f[j].angle);
_42=(_43<_3e.labelR)?_3e.labelR:_43;
_3f[j].labelR=_42;
}
i--;
j--;
i=(i<0)?i+_3f.length:i;
j=(j<0)?j+_3f.length:j;
}
},_getLabel:function(_44){
return dc.getLabel(_44,this.opt.fixed,this.opt.precision);
}});
})();
}
