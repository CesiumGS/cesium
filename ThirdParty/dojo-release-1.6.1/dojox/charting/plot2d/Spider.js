/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.Spider"]){
dojo._hasResource["dojox.charting.plot2d.Spider"]=true;
dojo.provide("dojox.charting.plot2d.Spider");
dojo.experimental("dojox.charting.plot2d.Spider");
dojo.require("dojox.charting.Element");
dojo.require("dojox.charting.plot2d._PlotEvents");
dojo.require("dojox.charting.axis2d.common");
dojo.require("dojox.charting.plot2d.common");
dojo.require("dojox.charting.scaler.primitive");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.utils");
dojo.require("dojox.gfx");
dojo.require("dojo.fx");
dojo.require("dojo.fx.easing");
dojo.require("dojox.gfx.fx");
(function(){
var df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting.plot2d.common,da=dojox.charting.axis2d.common,g=dojox.gfx,m=g.matrix,_1=0.2;
dojo.declare("dojox.charting.plot2d.Spider",[dojox.charting.Element,dojox.charting.plot2d._PlotEvents],{defaultParams:{labels:true,ticks:false,fixed:true,precision:1,labelOffset:-10,labelStyle:"default",htmlLabels:true,startAngle:-90,divisions:3,axisColor:"",axisWidth:0,spiderColor:"",spiderWidth:0,seriesWidth:0,seriesFillAlpha:0.2,spiderOrigin:0.16,markerSize:3,spiderType:"polygon",animationType:dojo.fx.easing.backOut,axisTickFont:"",axisTickFontColor:"",axisFont:"",axisFontColor:""},optionalParams:{radius:0,font:"",fontColor:""},constructor:function(_2,_3){
this.opt=dojo.clone(this.defaultParams);
du.updateWithObject(this.opt,_3);
du.updateWithPattern(this.opt,_3,this.optionalParams);
this.series=[];
this.dyn=[];
this.datas={};
this.labelKey=[];
this.oldSeriePoints={};
this.animations={};
},clear:function(){
this.dirty=true;
this.dyn=[];
this.series=[];
this.datas={};
this.labelKey=[];
this.oldSeriePoints={};
this.animations={};
return this;
},setAxis:function(_4){
return this;
},addSeries:function(_5){
var _6=false;
this.series.push(_5);
for(var _7 in _5.data){
var _8=_5.data[_7],_9=this.datas[_7];
if(_9){
_9.vlist.push(_8);
_9.min=Math.min(_9.min,_8);
_9.max=Math.max(_9.max,_8);
}else{
this.datas[_7]={min:_8,max:_8,vlist:[_8]};
}
}
if(this.labelKey.length<=0){
for(var _7 in _5.data){
this.labelKey.push(_7);
}
}
return this;
},getSeriesStats:function(){
return dojox.charting.plot2d.common.collectSimpleStats(this.series);
},calculateAxes:function(_a){
this.initializeScalers(_a,this.getSeriesStats());
return this;
},getRequiredColors:function(){
return this.series.length;
},initializeScalers:function(_b,_c){
if(this._hAxis){
if(!this._hAxis.initialized()){
this._hAxis.calculate(_c.hmin,_c.hmax,_b.width);
}
this._hScaler=this._hAxis.getScaler();
}else{
this._hScaler=dojox.charting.scaler.primitive.buildScaler(_c.hmin,_c.hmax,_b.width);
}
if(this._vAxis){
if(!this._vAxis.initialized()){
this._vAxis.calculate(_c.vmin,_c.vmax,_b.height);
}
this._vScaler=this._vAxis.getScaler();
}else{
this._vScaler=dojox.charting.scaler.primitive.buildScaler(_c.vmin,_c.vmax,_b.height);
}
return this;
},render:function(_d,_e){
if(!this.dirty){
return this;
}
this.dirty=false;
this.cleanGroup();
var s=this.group,t=this.chart.theme;
this.resetEvents();
if(!this.series||!this.series.length){
return this;
}
var o=this.opt,ta=t.axis,rx=(_d.width-_e.l-_e.r)/2,ry=(_d.height-_e.t-_e.b)/2,r=Math.min(rx,ry),_f=o.font||(ta.majorTick&&ta.majorTick.font)||(ta.tick&&ta.tick.font)||"normal normal normal 7pt Tahoma",_10=o.axisFont||(ta.tick&&ta.tick.titleFont)||"normal normal normal 11pt Tahoma",_11=o.axisTickFontColor||(ta.majorTick&&ta.majorTick.fontColor)||(ta.tick&&ta.tick.fontColor)||"silver",_12=o.axisFontColor||(ta.tick&&ta.tick.titleFontColor)||"black",_13=o.axisColor||(ta.tick&&ta.tick.axisColor)||"silver",_14=o.spiderColor||(ta.tick&&ta.tick.spiderColor)||"silver",_15=o.axisWidth||(ta.stroke&&ta.stroke.width)||2,_16=o.spiderWidth||(ta.stroke&&ta.stroke.width)||2,_17=o.seriesWidth||(ta.stroke&&ta.stroke.width)||2,_18=g.normalizedLength(g.splitFontString(_10).size),_19=m._degToRad(o.startAngle),_1a=_19,_1b,_1c,_1d,_1e,_1f,_20,_21,_22,_23,_24,_25,ro=o.spiderOrigin,dv=o.divisions>=3?o.divisions:3,ms=o.markerSize,spt=o.spiderType,at=o.animationType,_26=o.labelOffset<-10?o.labelOffset:-10,_27=0.2;
if(o.labels){
_1e=dojo.map(this.series,function(s){
return s.name;
},this);
_1f=df.foldl1(df.map(_1e,function(_28,i){
var _29=t.series.font;
return dojox.gfx._base._getTextBox(_28,{font:_29}).w;
},this),"Math.max(a, b)")/2;
r=Math.min(rx-2*_1f,ry-_18)+_26;
_20=r-_26;
}
if("radius" in o){
r=o.radius;
_20=r-_26;
}
r/=(1+_27);
var _2a={cx:_e.l+rx,cy:_e.t+ry,r:r};
for(var i=this.series.length-1;i>=0;i--){
var _2b=this.series[i];
if(!this.dirty&&!_2b.dirty){
t.skip();
continue;
}
_2b.cleanGroup();
var run=_2b.data;
if(run!==null){
var len=this._getObjectLength(run);
if(!_21||_21.length<=0){
_21=[],_22=[],_25=[];
this._buildPoints(_21,len,_2a,r,_1a,true);
this._buildPoints(_22,len,_2a,r*ro,_1a,true);
this._buildPoints(_25,len,_2a,_20,_1a);
if(dv>2){
_23=[],_24=[];
for(var j=0;j<dv-2;j++){
_23[j]=[];
this._buildPoints(_23[j],len,_2a,r*(ro+(1-ro)*(j+1)/(dv-1)),_1a,true);
_24[j]=r*(ro+(1-ro)*(j+1)/(dv-1));
}
}
}
}
}
var _2c=s.createGroup(),_2d={color:_13,width:_15},_2e={color:_14,width:_16};
for(var j=_21.length-1;j>=0;--j){
var _2f=_21[j],st={x:_2f.x+(_2f.x-_2a.cx)*_27,y:_2f.y+(_2f.y-_2a.cy)*_27},nd={x:_2f.x+(_2f.x-_2a.cx)*_27/2,y:_2f.y+(_2f.y-_2a.cy)*_27/2};
_2c.createLine({x1:_2a.cx,y1:_2a.cy,x2:st.x,y2:st.y}).setStroke(_2d);
this._drawArrow(_2c,st,nd,_2d);
}
var _30=s.createGroup();
for(var j=_25.length-1;j>=0;--j){
var _2f=_25[j],_31=dojox.gfx._base._getTextBox(this.labelKey[j],{font:_10}).w||0,_32=this.opt.htmlLabels&&dojox.gfx.renderer!="vml"?"html":"gfx";
elem=da.createText[_32](this.chart,_30,(!dojo._isBodyLtr()&&_32=="html")?(_2f.x+_31-_d.width):_2f.x,_2f.y,"middle",this.labelKey[j],_10,_12);
if(this.opt.htmlLabels){
this.htmlElements.push(elem);
}
}
var _33=s.createGroup();
if(spt=="polygon"){
_33.createPolyline(_21).setStroke(_2e);
_33.createPolyline(_22).setStroke(_2e);
if(_23.length>0){
for(var j=_23.length-1;j>=0;--j){
_33.createPolyline(_23[j]).setStroke(_2e);
}
}
}else{
var _34=this._getObjectLength(this.datas);
_33.createCircle({cx:_2a.cx,cy:_2a.cy,r:r}).setStroke(_2e);
_33.createCircle({cx:_2a.cx,cy:_2a.cy,r:r*ro}).setStroke(_2e);
if(_24.length>0){
for(var j=_24.length-1;j>=0;--j){
_33.createCircle({cx:_2a.cx,cy:_2a.cy,r:_24[j]}).setStroke(_2e);
}
}
}
var _35=s.createGroup(),len=this._getObjectLength(this.datas),k=0;
for(var key in this.datas){
var _36=this.datas[key],min=_36.min,max=_36.max,_37=max-min,end=_1a+2*Math.PI*k/len;
for(var i=0;i<dv;i++){
var _38=min+_37*i/(dv-1),_2f=this._getCoordinate(_2a,r*(ro+(1-ro)*i/(dv-1)),end);
_38=this._getLabel(_38);
var _31=dojox.gfx._base._getTextBox(_38,{font:_f}).w||0,_32=this.opt.htmlLabels&&dojox.gfx.renderer!="vml"?"html":"gfx";
if(this.opt.htmlLabels){
this.htmlElements.push(da.createText[_32](this.chart,_35,(!dojo._isBodyLtr()&&_32=="html")?(_2f.x+_31-_d.width):_2f.x,_2f.y,"start",_38,_f,_11));
}
}
k++;
}
this.chart.seriesShapes={};
var _39=[];
for(var i=this.series.length-1;i>=0;i--){
var _2b=this.series[i],run=_2b.data;
if(run!==null){
var _3a=[],k=0,_3b=[];
for(var key in run){
var _36=this.datas[key],min=_36.min,max=_36.max,_37=max-min,_3c=run[key],end=_1a+2*Math.PI*k/len,_2f=this._getCoordinate(_2a,r*(ro+(1-ro)*(_3c-min)/_37),end);
_3a.push(_2f);
_3b.push({sname:_2b.name,key:key,data:_3c});
k++;
}
_3a[_3a.length]=_3a[0];
_3b[_3b.length]=_3b[0];
var _3d=this._getBoundary(_3a),_3e=t.next("spider",[o,_2b]),ts=_2b.group,f=g.normalizeColor(_3e.series.fill),sk={color:_3e.series.fill,width:_17};
f.a=o.seriesFillAlpha;
_2b.dyn={fill:f,stroke:sk};
var _3f=this.oldSeriePoints[_2b.name];
var cs=this._createSeriesEntry(ts,(_3f||_22),_3a,f,sk,r,ro,ms,at);
this.chart.seriesShapes[_2b.name]=cs;
this.oldSeriePoints[_2b.name]=_3a;
var po={element:"spider_poly",index:i,id:"spider_poly_"+_2b.name,run:_2b,plot:this,shape:cs.poly,parent:ts,brect:_3d,cx:_2a.cx,cy:_2a.cy,cr:r,f:f,s:s};
this._connectEvents(po);
var so={element:"spider_plot",index:i,id:"spider_plot_"+_2b.name,run:_2b,plot:this,shape:_2b.group};
this._connectEvents(so);
dojo.forEach(cs.circles,function(c,i){
var _40=c.getShape(),co={element:"spider_circle",index:i,id:"spider_circle_"+_2b.name+i,run:_2b,plot:this,shape:c,parent:ts,tdata:_3b[i],cx:_3a[i].x,cy:_3a[i].y,f:f,s:s};
this._connectEvents(co);
},this);
}
}
return this;
},_createSeriesEntry:function(ts,_41,sps,f,sk,r,ro,ms,at){
var _42=ts.createPolyline(_41).setFill(f).setStroke(sk),_43=[];
for(var j=0;j<_41.length;j++){
var _44=_41[j],cr=ms;
var _45=ts.createCircle({cx:_44.x,cy:_44.y,r:cr}).setFill(f).setStroke(sk);
_43.push(_45);
}
var _46=dojo.map(sps,function(np,j){
var sp=_41[j],_47=new dojo._Animation({duration:1000,easing:at,curve:[sp.y,np.y]});
var spl=_42,sc=_43[j];
dojo.connect(_47,"onAnimate",function(y){
var _48=spl.getShape();
_48.points[j].y=y;
spl.setShape(_48);
var _49=sc.getShape();
_49.cy=y;
sc.setShape(_49);
});
return _47;
});
var _4a=dojo.map(sps,function(np,j){
var sp=_41[j],_4b=new dojo._Animation({duration:1000,easing:at,curve:[sp.x,np.x]});
var spl=_42,sc=_43[j];
dojo.connect(_4b,"onAnimate",function(x){
var _4c=spl.getShape();
_4c.points[j].x=x;
spl.setShape(_4c);
var _4d=sc.getShape();
_4d.cx=x;
sc.setShape(_4d);
});
return _4b;
});
var _4e=dojo.fx.combine(_46.concat(_4a));
_4e.play();
return {group:ts,poly:_42,circles:_43};
},plotEvent:function(o){
var _4f=o.id?o.id:"default",a;
if(_4f in this.animations){
a=this.animations[_4f];
a.anim&&a.anim.stop(true);
}else{
a=this.animations[_4f]={};
}
if(o.element=="spider_poly"){
if(!a.color){
var _50=o.shape.getFill();
if(!_50||!(_50 instanceof dojo.Color)){
return;
}
a.color={start:_50,end:_51(_50)};
}
var _52=a.color.start,end=a.color.end;
if(o.type=="onmouseout"){
var t=_52;
_52=end;
end=t;
}
a.anim=dojox.gfx.fx.animateFill({shape:o.shape,duration:800,easing:dojo.fx.easing.backOut,color:{start:_52,end:end}});
a.anim.play();
}else{
if(o.element=="spider_circle"){
var _53,_54,_55=1.5;
if(o.type=="onmouseover"){
_53=dojox.gfx.matrix.identity;
_54=_55;
var _56={type:"rect"};
_56.x=o.cx;
_56.y=o.cy;
_56.width=_56.height=1;
var lt=dojo.coords(this.chart.node,true);
_56.x+=lt.x;
_56.y+=lt.y;
_56.x=Math.round(_56.x);
_56.y=Math.round(_56.y);
_56.width=Math.ceil(_56.width);
_56.height=Math.ceil(_56.height);
this.aroundRect=_56;
var _57=["after","before"];
if(dijit&&dijit.Tooltip){
dijit.showTooltip(o.tdata.sname+"<br/>"+o.tdata.key+"<br/>"+o.tdata.data,this.aroundRect,_57);
}
}else{
_53=dojox.gfx.matrix.scaleAt(_55,o.cx,o.cy);
_54=1/_55;
if(dijit&&dijit.Tooltip){
this.aroundRect&&dijit.hideTooltip(this.aroundRect);
}
}
var cs=o.shape.getShape(),_53=m.scaleAt(_55,cs.cx,cs.cy),_58={shape:o.shape,duration:200,easing:dojo.fx.easing.backOut,transform:[{name:"scaleAt",start:[1,cs.cx,cs.cy],end:[_54,cs.cx,cs.cy]},_53]};
a.anim=dojox.gfx.fx.animateTransform(_58);
a.anim.play();
}else{
if(o.element=="spider_plot"){
if(o.type=="onmouseover"&&!dojo.isIE){
o.shape.moveToFront();
}
}
}
}
},_getBoundary:function(_59){
var _5a=_59[0].x,_5b=_59[0].x,_5c=_59[0].y,_5d=_59[0].y;
for(var i=0;i<_59.length;i++){
var _5e=_59[i];
_5a=Math.max(_5e.x,_5a);
_5c=Math.max(_5e.y,_5c);
_5b=Math.min(_5e.x,_5b);
_5d=Math.min(_5e.y,_5d);
}
return {x:_5b,y:_5d,width:_5a-_5b,height:_5c-_5d};
},_drawArrow:function(s,_5f,end,_60){
var len=Math.sqrt(Math.pow(end.x-_5f.x,2)+Math.pow(end.y-_5f.y,2)),sin=(end.y-_5f.y)/len,cos=(end.x-_5f.x)/len,_61={x:end.x+(len/3)*(-sin),y:end.y+(len/3)*cos},_62={x:end.x+(len/3)*sin,y:end.y+(len/3)*(-cos)};
s.createPolyline([_5f,_61,_62]).setFill(_60.color).setStroke(_60);
},_buildPoints:function(_63,_64,_65,_66,_67,_68){
for(var i=0;i<_64;i++){
var end=_67+2*Math.PI*i/_64;
_63.push(this._getCoordinate(_65,_66,end));
}
if(_68){
_63.push(this._getCoordinate(_65,_66,_67+2*Math.PI));
}
},_getCoordinate:function(_69,_6a,_6b){
return {x:_69.cx+_6a*Math.cos(_6b),y:_69.cy+_6a*Math.sin(_6b)};
},_getObjectLength:function(obj){
var _6c=0;
if(dojo.isObject(obj)){
for(var key in obj){
_6c++;
}
}
return _6c;
},_getLabel:function(_6d){
return dc.getLabel(_6d,this.opt.fixed,this.opt.precision);
}});
function _51(_6e){
var a=new dojox.color.Color(_6e),x=a.toHsl();
if(x.s==0){
x.l=x.l<50?100:0;
}else{
x.s=100;
if(x.l<50){
x.l=75;
}else{
if(x.l>75){
x.l=50;
}else{
x.l=x.l-50>75-x.l?50:75;
}
}
}
var _6e=dojox.color.fromHsl(x);
_6e.a=0.7;
return _6e;
};
})();
}
