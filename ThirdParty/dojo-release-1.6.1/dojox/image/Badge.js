/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image.Badge"]){
dojo._hasResource["dojox.image.Badge"]=true;
dojo.provide("dojox.image.Badge");
dojo.experimental("dojox.image.Badge");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.fx.easing");
dojo.declare("dojox.image.Badge",[dijit._Widget,dijit._Templated],{baseClass:"dojoxBadge",templateString:"<div class=\"dojoxBadge\" dojoAttachPoint=\"containerNode\"></div>",children:"div.dojoxBadgeImage",rows:4,cols:5,cellSize:50,cellMargin:1,delay:2000,threads:1,easing:"dojo.fx.easing.backOut",startup:function(){
if(this._started){
return;
}
if(dojo.isString(this.easing)){
this.easing=dojo.getObject(this.easing);
}
this.inherited(arguments);
this._init();
},_init:function(){
var _1=0,_2=this.cellSize;
dojo.style(this.domNode,{width:_2*this.cols+"px",height:_2*this.rows+"px"});
this._nl=dojo.query(this.children,this.containerNode).forEach(function(n,_3){
var _4=_3%this.cols,t=_1*_2,l=_4*_2,m=this.cellMargin*2;
dojo.style(n,{top:t+"px",left:l+"px",width:_2-m+"px",height:_2-m+"px"});
if(_4==this.cols-1){
_1++;
}
dojo.addClass(n,this.baseClass+"Image");
},this);
var l=this._nl.length;
while(this.threads--){
var s=Math.floor(Math.random()*l);
setTimeout(dojo.hitch(this,"_enbiggen",{target:this._nl[s]}),this.delay*this.threads);
}
},_getCell:function(n){
var _5=this._nl.indexOf(n);
if(_5>=0){
var _6=_5%this.cols;
var _7=Math.floor(_5/this.cols);
return {x:_6,y:_7,n:this._nl[_5],io:_5};
}else{
return undefined;
}
},_getImage:function(){
return "url('')";
},_enbiggen:function(e){
var _8=this._getCell(e.target||e);
if(_8){
var m=this.cellMargin,_9=(this.cellSize*2)-(m*2),_a={height:_9,width:_9};
var _b=function(){
return Math.round(Math.random());
};
if(_8.x==this.cols-1||(_8.x>0&&_b())){
_a.left=this.cellSize*(_8.x-m);
}
if(_8.y==this.rows-1||(_8.y>0&&_b())){
_a.top=this.cellSize*(_8.y-m);
}
var bc=this.baseClass;
dojo.addClass(_8.n,bc+"Top");
dojo.addClass(_8.n,bc+"Seen");
dojo.animateProperty({node:_8.n,properties:_a,onEnd:dojo.hitch(this,"_loadUnder",_8,_a),easing:this.easing}).play();
}
},_loadUnder:function(_c,_d){
var _e=_c.io;
var _f=[];
var _10=(_d.left>=0);
var _11=(_d.top>=0);
var c=this.cols,e=_e+(_10?-1:1),f=_e+(_11?-c:c),g=(_11?(_10?e-c:f+1):(_10?f-1:e+c)),bc=this.baseClass;
dojo.forEach([e,f,g],function(x){
var n=this._nl[x];
if(n){
if(dojo.hasClass(n,bc+"Seen")){
dojo.removeClass(n,bc+"Seen");
}
}
},this);
setTimeout(dojo.hitch(this,"_disenbiggen",_c,_d),this.delay*1.25);
},_disenbiggen:function(_12,_13){
if(_13.top>=0){
_13.top+=this.cellSize;
}
if(_13.left>=0){
_13.left+=this.cellSize;
}
var _14=this.cellSize-(this.cellMargin*2);
dojo.animateProperty({node:_12.n,properties:dojo.mixin(_13,{width:_14,height:_14}),onEnd:dojo.hitch(this,"_cycle",_12,_13)}).play(5);
},_cycle:function(_15,_16){
var bc=this.baseClass;
dojo.removeClass(_15.n,bc+"Top");
var ns=this._nl.filter(function(n){
return !dojo.hasClass(n,bc+"Seen");
});
var c=ns[Math.floor(Math.random()*ns.length)];
setTimeout(dojo.hitch(this,"_enbiggen",{target:c}),this.delay/2);
}});
}
