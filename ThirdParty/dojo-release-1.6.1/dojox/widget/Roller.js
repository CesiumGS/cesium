/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Roller"]){
dojo._hasResource["dojox.widget.Roller"]=true;
dojo.provide("dojox.widget.Roller");
dojo.require("dijit._Widget");
dojo.declare("dojox.widget.Roller",dijit._Widget,{delay:2000,autoStart:true,itemSelector:"> li",durationIn:400,durationOut:275,_idx:-1,postCreate:function(){
if(!this["items"]){
this.items=[];
}
dojo.addClass(this.domNode,"dojoxRoller");
dojo.query(this.itemSelector,this.domNode).forEach(function(_1,i){
this.items.push(_1.innerHTML);
if(i==0){
this._roller=_1;
this._idx=0;
}else{
dojo.destroy(_1);
}
},this);
if(!this._roller){
this._roller=dojo.create("li",null,this.domNode);
}
this.makeAnims();
if(this.autoStart){
this.start();
}
},makeAnims:function(){
var n=this.domNode;
dojo.mixin(this,{_anim:{"in":dojo.fadeIn({node:n,duration:this.durationIn}),"out":dojo.fadeOut({node:n,duration:this.durationOut})}});
this._setupConnects();
},_setupConnects:function(){
var _2=this._anim;
this.connect(_2["out"],"onEnd",function(){
this._setIndex(this._idx+1);
_2["in"].play(15);
});
this.connect(_2["in"],"onEnd",function(){
this._timeout=setTimeout(dojo.hitch(this,"_run"),this.delay);
});
},start:function(){
if(!this.rolling){
this.rolling=true;
this._run();
}
},_run:function(){
this._anim["out"].gotoPercent(0,true);
},stop:function(){
this.rolling=false;
var m=this._anim,t=this._timeout;
if(t){
clearTimeout(t);
}
m["in"].stop();
m["out"].stop();
},_setIndex:function(i){
var l=this.items.length-1;
if(i<0){
i=l;
}
if(i>l){
i=0;
}
this._roller.innerHTML=this.items[i]||"error!";
this._idx=i;
}});
dojo.declare("dojox.widget.RollerSlide",dojox.widget.Roller,{durationOut:175,makeAnims:function(){
var n=this.domNode,_3="position",_4={top:{end:0,start:25},opacity:1};
dojo.style(n,_3,"relative");
dojo.style(this._roller,_3,"absolute");
dojo.mixin(this,{_anim:{"in":dojo.animateProperty({node:n,duration:this.durationIn,properties:_4}),"out":dojo.fadeOut({node:n,duration:this.durationOut})}});
this._setupConnects();
}});
dojo.declare("dojox.widget._RollerHover",null,{postCreate:function(){
this.inherited(arguments);
this.connect(this.domNode,"onmouseenter","stop");
this.connect(this.domNode,"onmouseleave","start");
}});
}
