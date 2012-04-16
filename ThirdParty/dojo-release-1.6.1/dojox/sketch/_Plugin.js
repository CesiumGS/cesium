/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sketch._Plugin"]){
dojo._hasResource["dojox.sketch._Plugin"]=true;
dojo.provide("dojox.sketch._Plugin");
dojo.require("dijit.form.Button");
dojo.declare("dojox.sketch._Plugin",null,{constructor:function(_1){
if(_1){
dojo.mixin(this,_1);
}
this._connects=[];
},figure:null,iconClassPrefix:"dojoxSketchIcon",itemGroup:"toolsGroup",button:null,queryCommand:null,shape:"",useDefaultCommand:true,buttonClass:dijit.form.ToggleButton,_initButton:function(){
if(this.shape.length){
var _2=this.iconClassPrefix+" "+this.iconClassPrefix+this.shape.charAt(0).toUpperCase()+this.shape.substr(1);
if(!this.button){
var _3={label:this.shape,showLabel:false,iconClass:_2,dropDown:this.dropDown,tabIndex:"-1"};
this.button=new this.buttonClass(_3);
this.connect(this.button,"onClick","activate");
}
}
},attr:function(_4,_5){
return this.button.attr(_4,_5);
},onActivate:function(){
},activate:function(e){
this.onActivate();
this.figure.setTool(this);
this.attr("checked",true);
},onMouseDown:function(e){
},onMouseMove:function(e){
},onMouseUp:function(e){
},destroy:function(f){
dojo.forEach(this._connects,dojo.disconnect);
},connect:function(o,f,tf){
this._connects.push(dojo.connect(o,f,this,tf));
},setFigure:function(_6){
this.figure=_6;
},setToolbar:function(_7){
this._initButton();
if(this.button){
_7.addChild(this.button);
}
if(this.itemGroup){
_7.addGroupItem(this,this.itemGroup);
}
}});
}
