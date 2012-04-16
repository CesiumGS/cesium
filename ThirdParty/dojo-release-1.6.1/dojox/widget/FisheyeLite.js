/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.FisheyeLite"]){
dojo._hasResource["dojox.widget.FisheyeLite"]=true;
dojo.provide("dojox.widget.FisheyeLite");
dojo.experimental("dojox.widget.FisheyeLite");
dojo.require("dijit._Widget");
dojo.require("dojo.fx.easing");
dojo.declare("dojox.widget.FisheyeLite",dijit._Widget,{durationIn:350,easeIn:dojo.fx.easing.backOut,durationOut:1420,easeOut:dojo.fx.easing.elasticOut,properties:null,units:"px",constructor:function(_1,_2){
this.properties=_1.properties||{fontSize:2.75};
},postCreate:function(){
this.inherited(arguments);
this._target=dojo.query(".fisheyeTarget",this.domNode)[0]||this.domNode;
this._makeAnims();
this.connect(this.domNode,"onmouseover","show");
this.connect(this.domNode,"onmouseout","hide");
this.connect(this._target,"onclick","onClick");
},show:function(){
this._runningOut.stop();
this._runningIn.play();
},hide:function(){
this._runningIn.stop();
this._runningOut.play();
},_makeAnims:function(){
var _3={},_4={},cs=dojo.getComputedStyle(this._target);
for(var p in this.properties){
var _5=this.properties[p],_6=dojo.isObject(_5),v=parseInt(cs[p]);
_4[p]={end:v,units:this.units};
_3[p]=_6?_5:{end:_5*v,units:this.units};
}
this._runningIn=dojo.animateProperty({node:this._target,easing:this.easeIn,duration:this.durationIn,properties:_3});
this._runningOut=dojo.animateProperty({node:this._target,duration:this.durationOut,easing:this.easeOut,properties:_4});
this.connect(this._runningIn,"onEnd",dojo.hitch(this,"onSelected",this));
},onClick:function(e){
},onSelected:function(e){
}});
}
