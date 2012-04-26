/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.TableContainer"]){
dojo._hasResource["dojox.layout.TableContainer"]=true;
dojo.experimental("dojox.layout.TableContainer");
dojo.provide("dojox.layout.TableContainer");
dojo.require("dijit.layout._LayoutWidget");
dojo.declare("dojox.layout.TableContainer",dijit.layout._LayoutWidget,{cols:1,labelWidth:"100",showLabels:true,orientation:"horiz",spacing:1,customClass:"",postCreate:function(){
this.inherited(arguments);
this._children=[];
this.connect(this,"set",function(_1,_2){
if(_2&&(_1=="orientation"||_1=="customClass"||_1=="cols")){
this.layout();
}
});
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(this._initialized){
return;
}
var _3=this.getChildren();
if(_3.length<1){
return;
}
this._initialized=true;
dojo.addClass(this.domNode,"dijitTableLayout");
dojo.forEach(_3,function(_4){
if(!_4.started&&!_4._started){
_4.startup();
}
});
this.resize();
this.layout();
},resize:function(){
dojo.forEach(this.getChildren(),function(_5){
if(typeof _5.resize=="function"){
_5.resize();
}
});
},layout:function(){
if(!this._initialized){
return;
}
var _6=this.getChildren();
var _7={};
var _8=this;
function _9(_a,_b,_c){
if(_8.customClass!=""){
var _d=_8.customClass+"-"+(_b||_a.tagName.toLowerCase());
dojo.addClass(_a,_d);
if(arguments.length>2){
dojo.addClass(_a,_d+"-"+_c);
}
}
};
dojo.forEach(this._children,dojo.hitch(this,function(_e){
_7[_e.id]=_e;
}));
dojo.forEach(_6,dojo.hitch(this,function(_f,_10){
if(!_7[_f.id]){
this._children.push(_f);
}
}));
var _11=dojo.create("table",{"width":"100%","class":"tableContainer-table tableContainer-table-"+this.orientation,"cellspacing":this.spacing},this.domNode);
var _12=dojo.create("tbody");
_11.appendChild(_12);
_9(_11,"table",this.orientation);
var _13=Math.floor(100/this.cols)+"%";
var _14=dojo.create("tr",{},_12);
var _15=(!this.showLabels||this.orientation=="horiz")?_14:dojo.create("tr",{},_12);
var _16=this.cols*(this.showLabels?2:1);
var _17=0;
dojo.forEach(this._children,dojo.hitch(this,function(_18,_19){
var _1a=_18.colspan||1;
if(_1a>1){
_1a=this.showLabels?Math.min(_16-1,_1a*2-1):Math.min(_16,_1a);
}
if(_17+_1a-1+(this.showLabels?1:0)>=_16){
_17=0;
_14=dojo.create("tr",{},_12);
_15=this.orientation=="horiz"?_14:dojo.create("tr",{},_12);
}
var _1b;
if(this.showLabels){
_1b=dojo.create("td",{"class":"tableContainer-labelCell"},_14);
if(_18.spanLabel){
dojo.attr(_1b,this.orientation=="vert"?"rowspan":"colspan",2);
}else{
_9(_1b,"labelCell");
var _1c={"for":_18.get("id")};
var _1d=dojo.create("label",_1c,_1b);
if(Number(this.labelWidth)>-1||String(this.labelWidth).indexOf("%")>-1){
dojo.style(_1b,"width",String(this.labelWidth).indexOf("%")<0?this.labelWidth+"px":this.labelWidth);
}
_1d.innerHTML=_18.get("label")||_18.get("title");
}
}
var _1e;
if(_18.spanLabel&&_1b){
_1e=_1b;
}else{
_1e=dojo.create("td",{"class":"tableContainer-valueCell"},_15);
}
if(_1a>1){
dojo.attr(_1e,"colspan",_1a);
}
_9(_1e,"valueCell",_19);
_1e.appendChild(_18.domNode);
_17+=_1a+(this.showLabels?1:0);
}));
if(this.table){
this.table.parentNode.removeChild(this.table);
}
dojo.forEach(_6,function(_1f){
if(typeof _1f.layout=="function"){
_1f.layout();
}
});
this.table=_11;
this.resize();
},destroyDescendants:function(_20){
dojo.forEach(this._children,function(_21){
_21.destroyRecursive(_20);
});
},_setSpacingAttr:function(_22){
this.spacing=_22;
if(this.table){
this.table.cellspacing=Number(_22);
}
}});
dojo.extend(dijit._Widget,{label:"",title:"",spanLabel:false,colspan:1});
}
