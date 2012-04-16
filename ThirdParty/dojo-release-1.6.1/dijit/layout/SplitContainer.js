/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.SplitContainer"]){
dojo._hasResource["dijit.layout.SplitContainer"]=true;
dojo.provide("dijit.layout.SplitContainer");
dojo.require("dojo.cookie");
dojo.require("dijit.layout._LayoutWidget");
dojo.declare("dijit.layout.SplitContainer",dijit.layout._LayoutWidget,{constructor:function(){
dojo.deprecated("dijit.layout.SplitContainer is deprecated","use BorderContainer with splitter instead",2);
},activeSizing:false,sizerWidth:7,orientation:"horizontal",persist:true,baseClass:"dijitSplitContainer",postMixInProperties:function(){
this.inherited("postMixInProperties",arguments);
this.isHorizontal=(this.orientation=="horizontal");
},postCreate:function(){
this.inherited(arguments);
this.sizers=[];
if(dojo.isMozilla){
this.domNode.style.overflow="-moz-scrollbars-none";
}
if(typeof this.sizerWidth=="object"){
try{
this.sizerWidth=parseInt(this.sizerWidth.toString());
}
catch(e){
this.sizerWidth=7;
}
}
var _1=dojo.doc.createElement("div");
this.virtualSizer=_1;
_1.style.position="relative";
_1.style.zIndex=10;
_1.className=this.isHorizontal?"dijitSplitContainerVirtualSizerH":"dijitSplitContainerVirtualSizerV";
this.domNode.appendChild(_1);
dojo.setSelectable(_1,false);
},destroy:function(){
delete this.virtualSizer;
dojo.forEach(this._ownconnects,dojo.disconnect);
this.inherited(arguments);
},startup:function(){
if(this._started){
return;
}
dojo.forEach(this.getChildren(),function(_2,i,_3){
this._setupChild(_2);
if(i<_3.length-1){
this._addSizer();
}
},this);
if(this.persist){
this._restoreState();
}
this.inherited(arguments);
},_setupChild:function(_4){
this.inherited(arguments);
_4.domNode.style.position="absolute";
dojo.addClass(_4.domNode,"dijitSplitPane");
},_onSizerMouseDown:function(e){
if(e.target.id){
for(var i=0;i<this.sizers.length;i++){
if(this.sizers[i].id==e.target.id){
break;
}
}
if(i<this.sizers.length){
this.beginSizing(e,i);
}
}
},_addSizer:function(_5){
_5=_5===undefined?this.sizers.length:_5;
var _6=dojo.doc.createElement("div");
_6.id=dijit.getUniqueId("dijit_layout_SplitterContainer_Splitter");
this.sizers.splice(_5,0,_6);
this.domNode.appendChild(_6);
_6.className=this.isHorizontal?"dijitSplitContainerSizerH":"dijitSplitContainerSizerV";
var _7=dojo.doc.createElement("div");
_7.className="thumb";
_6.appendChild(_7);
this.connect(_6,"onmousedown","_onSizerMouseDown");
dojo.setSelectable(_6,false);
},removeChild:function(_8){
if(this.sizers.length){
var i=dojo.indexOf(this.getChildren(),_8);
if(i!=-1){
if(i==this.sizers.length){
i--;
}
dojo.destroy(this.sizers[i]);
this.sizers.splice(i,1);
}
}
this.inherited(arguments);
if(this._started){
this.layout();
}
},addChild:function(_9,_a){
this.inherited(arguments);
if(this._started){
var _b=this.getChildren();
if(_b.length>1){
this._addSizer(_a);
}
this.layout();
}
},layout:function(){
this.paneWidth=this._contentBox.w;
this.paneHeight=this._contentBox.h;
var _c=this.getChildren();
if(!_c.length){
return;
}
var _d=this.isHorizontal?this.paneWidth:this.paneHeight;
if(_c.length>1){
_d-=this.sizerWidth*(_c.length-1);
}
var _e=0;
dojo.forEach(_c,function(_f){
_e+=_f.sizeShare;
});
var _10=_d/_e;
var _11=0;
dojo.forEach(_c.slice(0,_c.length-1),function(_12){
var _13=Math.round(_10*_12.sizeShare);
_12.sizeActual=_13;
_11+=_13;
});
_c[_c.length-1].sizeActual=_d-_11;
this._checkSizes();
var pos=0;
var _14=_c[0].sizeActual;
this._movePanel(_c[0],pos,_14);
_c[0].position=pos;
pos+=_14;
if(!this.sizers){
return;
}
dojo.some(_c.slice(1),function(_15,i){
if(!this.sizers[i]){
return true;
}
this._moveSlider(this.sizers[i],pos,this.sizerWidth);
this.sizers[i].position=pos;
pos+=this.sizerWidth;
_14=_15.sizeActual;
this._movePanel(_15,pos,_14);
_15.position=pos;
pos+=_14;
},this);
},_movePanel:function(_16,pos,_17){
if(this.isHorizontal){
_16.domNode.style.left=pos+"px";
_16.domNode.style.top=0;
var box={w:_17,h:this.paneHeight};
if(_16.resize){
_16.resize(box);
}else{
dojo.marginBox(_16.domNode,box);
}
}else{
_16.domNode.style.left=0;
_16.domNode.style.top=pos+"px";
var box={w:this.paneWidth,h:_17};
if(_16.resize){
_16.resize(box);
}else{
dojo.marginBox(_16.domNode,box);
}
}
},_moveSlider:function(_18,pos,_19){
if(this.isHorizontal){
_18.style.left=pos+"px";
_18.style.top=0;
dojo.marginBox(_18,{w:_19,h:this.paneHeight});
}else{
_18.style.left=0;
_18.style.top=pos+"px";
dojo.marginBox(_18,{w:this.paneWidth,h:_19});
}
},_growPane:function(_1a,_1b){
if(_1a>0){
if(_1b.sizeActual>_1b.sizeMin){
if((_1b.sizeActual-_1b.sizeMin)>_1a){
_1b.sizeActual=_1b.sizeActual-_1a;
_1a=0;
}else{
_1a-=_1b.sizeActual-_1b.sizeMin;
_1b.sizeActual=_1b.sizeMin;
}
}
}
return _1a;
},_checkSizes:function(){
var _1c=0;
var _1d=0;
var _1e=this.getChildren();
dojo.forEach(_1e,function(_1f){
_1d+=_1f.sizeActual;
_1c+=_1f.sizeMin;
});
if(_1c<=_1d){
var _20=0;
dojo.forEach(_1e,function(_21){
if(_21.sizeActual<_21.sizeMin){
_20+=_21.sizeMin-_21.sizeActual;
_21.sizeActual=_21.sizeMin;
}
});
if(_20>0){
var _22=this.isDraggingLeft?_1e.reverse():_1e;
dojo.forEach(_22,function(_23){
_20=this._growPane(_20,_23);
},this);
}
}else{
dojo.forEach(_1e,function(_24){
_24.sizeActual=Math.round(_1d*(_24.sizeMin/_1c));
});
}
},beginSizing:function(e,i){
var _25=this.getChildren();
this.paneBefore=_25[i];
this.paneAfter=_25[i+1];
this.isSizing=true;
this.sizingSplitter=this.sizers[i];
if(!this.cover){
this.cover=dojo.create("div",{style:{position:"absolute",zIndex:5,top:0,left:0,width:"100%",height:"100%"}},this.domNode);
}else{
this.cover.style.zIndex=5;
}
this.sizingSplitter.style.zIndex=6;
this.originPos=dojo.position(_25[0].domNode,true);
if(this.isHorizontal){
var _26=e.layerX||e.offsetX||0;
var _27=e.pageX;
this.originPos=this.originPos.x;
}else{
var _26=e.layerY||e.offsetY||0;
var _27=e.pageY;
this.originPos=this.originPos.y;
}
this.startPoint=this.lastPoint=_27;
this.screenToClientOffset=_27-_26;
this.dragOffset=this.lastPoint-this.paneBefore.sizeActual-this.originPos-this.paneBefore.position;
if(!this.activeSizing){
this._showSizingLine();
}
this._ownconnects=[];
this._ownconnects.push(dojo.connect(dojo.doc.documentElement,"onmousemove",this,"changeSizing"));
this._ownconnects.push(dojo.connect(dojo.doc.documentElement,"onmouseup",this,"endSizing"));
dojo.stopEvent(e);
},changeSizing:function(e){
if(!this.isSizing){
return;
}
this.lastPoint=this.isHorizontal?e.pageX:e.pageY;
this.movePoint();
if(this.activeSizing){
this._updateSize();
}else{
this._moveSizingLine();
}
dojo.stopEvent(e);
},endSizing:function(e){
if(!this.isSizing){
return;
}
if(this.cover){
this.cover.style.zIndex=-1;
}
if(!this.activeSizing){
this._hideSizingLine();
}
this._updateSize();
this.isSizing=false;
if(this.persist){
this._saveState(this);
}
dojo.forEach(this._ownconnects,dojo.disconnect);
},movePoint:function(){
var p=this.lastPoint-this.screenToClientOffset;
var a=p-this.dragOffset;
a=this.legaliseSplitPoint(a);
p=a+this.dragOffset;
this.lastPoint=p+this.screenToClientOffset;
},legaliseSplitPoint:function(a){
a+=this.sizingSplitter.position;
this.isDraggingLeft=!!(a>0);
if(!this.activeSizing){
var min=this.paneBefore.position+this.paneBefore.sizeMin;
if(a<min){
a=min;
}
var max=this.paneAfter.position+(this.paneAfter.sizeActual-(this.sizerWidth+this.paneAfter.sizeMin));
if(a>max){
a=max;
}
}
a-=this.sizingSplitter.position;
this._checkSizes();
return a;
},_updateSize:function(){
var pos=this.lastPoint-this.dragOffset-this.originPos;
var _28=this.paneBefore.position;
var _29=this.paneAfter.position+this.paneAfter.sizeActual;
this.paneBefore.sizeActual=pos-_28;
this.paneAfter.position=pos+this.sizerWidth;
this.paneAfter.sizeActual=_29-this.paneAfter.position;
dojo.forEach(this.getChildren(),function(_2a){
_2a.sizeShare=_2a.sizeActual;
});
if(this._started){
this.layout();
}
},_showSizingLine:function(){
this._moveSizingLine();
dojo.marginBox(this.virtualSizer,this.isHorizontal?{w:this.sizerWidth,h:this.paneHeight}:{w:this.paneWidth,h:this.sizerWidth});
this.virtualSizer.style.display="block";
},_hideSizingLine:function(){
this.virtualSizer.style.display="none";
},_moveSizingLine:function(){
var pos=(this.lastPoint-this.startPoint)+this.sizingSplitter.position;
dojo.style(this.virtualSizer,(this.isHorizontal?"left":"top"),pos+"px");
},_getCookieName:function(i){
return this.id+"_"+i;
},_restoreState:function(){
dojo.forEach(this.getChildren(),function(_2b,i){
var _2c=this._getCookieName(i);
var _2d=dojo.cookie(_2c);
if(_2d){
var pos=parseInt(_2d);
if(typeof pos=="number"){
_2b.sizeShare=pos;
}
}
},this);
},_saveState:function(){
if(!this.persist){
return;
}
dojo.forEach(this.getChildren(),function(_2e,i){
dojo.cookie(this._getCookieName(i),_2e.sizeShare,{expires:365});
},this);
}});
dojo.extend(dijit._Widget,{sizeMin:10,sizeShare:10});
}
