/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.FixedSplitter"]){
dojo._hasResource["dojox.mobile.FixedSplitter"]=true;
dojo.provide("dojox.mobile.FixedSplitter");
dojo.require("dijit._WidgetBase");
dojo.declare("dojox.mobile.FixedSplitter",dijit._WidgetBase,{orientation:"H",isContainer:true,buildRendering:function(){
this.domNode=this.containerNode=this.srcNodeRef?this.srcNodeRef:dojo.doc.createElement("DIV");
dojo.addClass(this.domNode,"mblFixedSpliter");
},startup:function(){
var _1=dojo.filter(this.domNode.childNodes,function(_2){
return _2.nodeType==1;
});
dojo.forEach(_1,function(_3){
dojo.addClass(_3,"mblFixedSplitterPane"+this.orientation);
},this);
dojo.forEach(this.getChildren(),function(_4){
if(_4.startup){
_4.startup();
}
});
this._started=true;
var _5=this;
setTimeout(function(){
_5.resize();
},0);
var _6=dijit.getEnclosingWidget(this.domNode.parentNode);
if(!_6){
if(dojo.global.onorientationchange!==undefined){
this.connect(dojo.global,"onorientationchange","resize");
}else{
this.connect(dojo.global,"onresize","resize");
}
}
},resize:function(_7,_8){
this.layout();
},layout:function(){
var sz=this.orientation=="H"?"w":"h";
var _9=dojo.filter(this.domNode.childNodes,function(_a){
return _a.nodeType==1;
});
var _b=0;
for(var i=0;i<_9.length;i++){
dojo.marginBox(_9[i],this.orientation=="H"?{l:_b}:{t:_b});
if(i<_9.length-1){
_b+=dojo.marginBox(_9[i])[sz];
}
}
var l=dojo.marginBox(this.domNode)[sz]-_b;
var _c={};
_c[sz]=l;
dojo.marginBox(_9[_9.length-1],_c);
dojo.forEach(this.getChildren(),function(_d){
if(_d.resize){
_d.resize();
}
});
}});
dojo.declare("dojox.mobile.FixedSplitterPane",dijit._WidgetBase,{buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"mblFixedSplitterPane");
}});
}
