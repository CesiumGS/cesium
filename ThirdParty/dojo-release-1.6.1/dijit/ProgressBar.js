/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.ProgressBar"]){
dojo._hasResource["dijit.ProgressBar"]=true;
dojo.provide("dijit.ProgressBar");
dojo.require("dojo.fx");
dojo.require("dojo.number");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dijit.ProgressBar",[dijit._Widget,dijit._Templated],{progress:"0",value:"",maximum:100,places:0,indeterminate:false,label:"",name:"",templateString:dojo.cache("dijit","templates/ProgressBar.html","<div class=\"dijitProgressBar dijitProgressBarEmpty\" role=\"progressbar\"\n\t><div  dojoAttachPoint=\"internalProgress\" class=\"dijitProgressBarFull\"\n\t\t><div class=\"dijitProgressBarTile\" role=\"presentation\"></div\n\t\t><span style=\"visibility:hidden\">&nbsp;</span\n\t></div\n\t><div dojoAttachPoint=\"labelNode\" class=\"dijitProgressBarLabel\" id=\"${id}_label\"></div\n\t><img dojoAttachPoint=\"indeterminateHighContrastImage\" class=\"dijitProgressBarIndeterminateHighContrastImage\" alt=\"\"\n/></div>\n"),_indeterminateHighContrastImagePath:dojo.moduleUrl("dijit","themes/a11y/indeterminate_progress.gif"),postMixInProperties:function(){
this.inherited(arguments);
if(!("value" in this.params)){
this.value=this.indeterminate?Infinity:this.progress;
}
},buildRendering:function(){
this.inherited(arguments);
this.indeterminateHighContrastImage.setAttribute("src",this._indeterminateHighContrastImagePath.toString());
this.update();
},update:function(_1){
dojo.mixin(this,_1||{});
var _2=this.internalProgress,ap=this.domNode;
var _3=1;
if(this.indeterminate){
dijit.removeWaiState(ap,"valuenow");
dijit.removeWaiState(ap,"valuemin");
dijit.removeWaiState(ap,"valuemax");
}else{
if(String(this.progress).indexOf("%")!=-1){
_3=Math.min(parseFloat(this.progress)/100,1);
this.progress=_3*this.maximum;
}else{
this.progress=Math.min(this.progress,this.maximum);
_3=this.progress/this.maximum;
}
dijit.setWaiState(ap,"describedby",this.labelNode.id);
dijit.setWaiState(ap,"valuenow",this.progress);
dijit.setWaiState(ap,"valuemin",0);
dijit.setWaiState(ap,"valuemax",this.maximum);
}
this.labelNode.innerHTML=this.report(_3);
dojo.toggleClass(this.domNode,"dijitProgressBarIndeterminate",this.indeterminate);
_2.style.width=(_3*100)+"%";
this.onChange();
},_setValueAttr:function(v){
this._set("value",v);
if(v==Infinity){
this.update({indeterminate:true});
}else{
this.update({indeterminate:false,progress:v});
}
},_setLabelAttr:function(_4){
this._set("label",_4);
this.update();
},_setIndeterminateAttr:function(_5){
this.indeterminate=_5;
this.update();
},report:function(_6){
return this.label?this.label:(this.indeterminate?"&nbsp;":dojo.number.format(_6,{type:"percent",places:this.places,locale:this.lang}));
},onChange:function(){
}});
}
