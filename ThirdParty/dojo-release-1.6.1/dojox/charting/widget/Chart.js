/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.widget.Chart"]){
dojo._hasResource["dojox.charting.widget.Chart"]=true;
dojo.provide("dojox.charting.widget.Chart");
dojo.require("dijit._Widget");
dojo.require("dojox.charting.Chart");
dojo.require("dojox.lang.functional");
(function(){
var _1,_2,_3,_4,_5,_6=function(o){
return o;
},df=dojox.lang.functional,du=dojox.lang.utils,dc=dojox.charting,d=dojo;
dojo.declare("dojox.charting.widget.Chart",dijit._Widget,{theme:null,margins:null,stroke:null,fill:null,buildRendering:function(){
var n=this.domNode=this.srcNodeRef;
var _7=d.query("> .axis",n).map(_2).filter(_6),_8=d.query("> .plot",n).map(_3).filter(_6),_9=d.query("> .action",n).map(_4).filter(_6),_a=d.query("> .series",n).map(_5).filter(_6);
n.innerHTML="";
var c=this.chart=new dc.Chart(n,{margins:this.margins,stroke:this.stroke,fill:this.fill});
if(this.theme){
c.setTheme(this.theme);
}
_7.forEach(function(_b){
c.addAxis(_b.name,_b.kwArgs);
});
_8.forEach(function(_c){
c.addPlot(_c.name,_c.kwArgs);
});
this.actions=_9.map(function(_d){
return new _d.action(c,_d.plot,_d.kwArgs);
});
var _e=df.foldl(_a,function(_f,_10){
if(_10.type=="data"){
c.addSeries(_10.name,_10.data,_10.kwArgs);
_f=true;
}else{
c.addSeries(_10.name,[0],_10.kwArgs);
var kw={};
du.updateWithPattern(kw,_10.kwArgs,{"query":"","queryOptions":null,"start":0,"count":1},true);
if(_10.kwArgs.sort){
kw.sort=dojo.clone(_10.kwArgs.sort);
}
d.mixin(kw,{onComplete:function(_11){
var _12;
if("valueFn" in _10.kwArgs){
var fn=_10.kwArgs.valueFn;
_12=d.map(_11,function(x){
return fn(_10.data.getValue(x,_10.field,0));
});
}else{
_12=d.map(_11,function(x){
return _10.data.getValue(x,_10.field,0);
});
}
c.addSeries(_10.name,_12,_10.kwArgs).render();
}});
_10.data.fetch(kw);
}
return _f;
},false);
if(_e){
c.render();
}
},destroy:function(){
this.chart.destroy();
this.inherited(arguments);
},resize:function(box){
this.chart.resize(box);
}});
_1=function(_13,_14,kw){
var dp=eval("("+_14+".prototype.defaultParams)");
var x,_15;
for(x in dp){
if(x in kw){
continue;
}
_15=_13.getAttribute(x);
kw[x]=du.coerceType(dp[x],_15==null||typeof _15=="undefined"?dp[x]:_15);
}
var op=eval("("+_14+".prototype.optionalParams)");
for(x in op){
if(x in kw){
continue;
}
_15=_13.getAttribute(x);
if(_15!=null){
kw[x]=du.coerceType(op[x],_15);
}
}
};
_2=function(_16){
var _17=_16.getAttribute("name"),_18=_16.getAttribute("type");
if(!_17){
return null;
}
var o={name:_17,kwArgs:{}},kw=o.kwArgs;
if(_18){
if(dc.axis2d[_18]){
_18=dojox._scopeName+".charting.axis2d."+_18;
}
var _19=eval("("+_18+")");
if(_19){
kw.type=_19;
}
}else{
_18=dojox._scopeName+".charting.axis2d.Default";
}
_1(_16,_18,kw);
if(kw.font||kw.fontColor){
if(!kw.tick){
kw.tick={};
}
if(kw.font){
kw.tick.font=kw.font;
}
if(kw.fontColor){
kw.tick.fontColor=kw.fontColor;
}
}
return o;
};
_3=function(_1a){
var _1b=_1a.getAttribute("name"),_1c=_1a.getAttribute("type");
if(!_1b){
return null;
}
var o={name:_1b,kwArgs:{}},kw=o.kwArgs;
if(_1c){
if(dc.plot2d&&dc.plot2d[_1c]){
_1c=dojox._scopeName+".charting.plot2d."+_1c;
}
var _1d=eval("("+_1c+")");
if(_1d){
kw.type=_1d;
}
}else{
_1c=dojox._scopeName+".charting.plot2d.Default";
}
_1(_1a,_1c,kw);
return o;
};
_4=function(_1e){
var _1f=_1e.getAttribute("plot"),_20=_1e.getAttribute("type");
if(!_1f){
_1f="default";
}
var o={plot:_1f,kwArgs:{}},kw=o.kwArgs;
if(_20){
if(dc.action2d[_20]){
_20=dojox._scopeName+".charting.action2d."+_20;
}
var _21=eval("("+_20+")");
if(!_21){
return null;
}
o.action=_21;
}else{
return null;
}
_1(_1e,_20,kw);
return o;
};
_5=function(_22){
var ga=d.partial(d.attr,_22);
var _23=ga("name");
if(!_23){
return null;
}
var o={name:_23,kwArgs:{}},kw=o.kwArgs,t;
t=ga("plot");
if(t!=null){
kw.plot=t;
}
t=ga("marker");
if(t!=null){
kw.marker=t;
}
t=ga("stroke");
if(t!=null){
kw.stroke=eval("("+t+")");
}
t=ga("outline");
if(t!=null){
kw.outline=eval("("+t+")");
}
t=ga("shadow");
if(t!=null){
kw.shadow=eval("("+t+")");
}
t=ga("fill");
if(t!=null){
kw.fill=eval("("+t+")");
}
t=ga("font");
if(t!=null){
kw.font=t;
}
t=ga("fontColor");
if(t!=null){
kw.fontColor=eval("("+t+")");
}
t=ga("legend");
if(t!=null){
kw.legend=t;
}
t=ga("data");
if(t!=null){
o.type="data";
o.data=t?dojo.map(String(t).split(","),Number):[];
return o;
}
t=ga("array");
if(t!=null){
o.type="data";
o.data=eval("("+t+")");
return o;
}
t=ga("store");
if(t!=null){
o.type="store";
o.data=eval("("+t+")");
t=ga("field");
o.field=t!=null?t:"value";
t=ga("query");
if(!!t){
kw.query=t;
}
t=ga("queryOptions");
if(!!t){
kw.queryOptions=eval("("+t+")");
}
t=ga("start");
if(!!t){
kw.start=Number(t);
}
t=ga("count");
if(!!t){
kw.count=Number(t);
}
t=ga("sort");
if(!!t){
kw.sort=eval("("+t+")");
}
t=ga("valueFn");
if(!!t){
kw.valueFn=df.lambda(t);
}
return o;
}
return null;
};
})();
}
