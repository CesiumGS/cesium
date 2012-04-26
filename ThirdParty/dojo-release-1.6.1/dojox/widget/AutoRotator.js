/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.AutoRotator"]){
dojo._hasResource["dojox.widget.AutoRotator"]=true;
dojo.provide("dojox.widget.AutoRotator");
dojo.require("dojox.widget.Rotator");
(function(d){
d.declare("dojox.widget.AutoRotator",dojox.widget.Rotator,{suspendOnHover:false,duration:4000,autoStart:true,pauseOnManualChange:false,cycles:-1,random:false,reverse:false,constructor:function(){
var _1=this;
if(_1.cycles-0==_1.cycles&&_1.cycles>0){
_1.cycles++;
}else{
_1.cycles=_1.cycles?-1:0;
}
_1._connects=[d.connect(_1._domNode,"onmouseover",function(){
if(_1.suspendOnHover&&!_1.anim&&!_1.wfe){
var t=_1._endTime,n=_1._now();
_1._suspended=true;
_1._resetTimer();
_1._resumeDuration=t>n?t-n:0.01;
}
}),d.connect(_1._domNode,"onmouseout",function(){
if(_1.suspendOnHover&&!_1.anim){
_1._suspended=false;
if(_1.playing&&!_1.wfe){
_1.play(true);
}
}
})];
if(_1.autoStart&&_1.panes.length>1){
_1.play();
}else{
_1.pause();
}
},destroy:function(){
d.forEach(this._connects,d.disconnect);
this.inherited(arguments);
},play:function(_2,_3){
this.playing=true;
this._resetTimer();
if(_2!==true&&this.cycles>0){
this.cycles--;
}
if(this.cycles==0){
this.pause();
}else{
if(!this._suspended){
this.onUpdate("play");
if(_3){
this._cycle();
}else{
var r=(this._resumeDuration||0)-0,u=(r>0?r:(this.panes[this.idx].duration||this.duration))-0;
this._resumeDuration=0;
this._endTime=this._now()+u;
this._timer=setTimeout(d.hitch(this,"_cycle",false),u);
}
}
}
},pause:function(){
this.playing=this._suspended=false;
this.cycles=-1;
this._resetTimer();
this.onUpdate("pause");
},_now:function(){
return (new Date()).getTime();
},_resetTimer:function(){
clearTimeout(this._timer);
},_cycle:function(_4){
var _5=this,i=_5.idx,j;
if(_5.random){
do{
j=Math.floor(Math.random()*_5.panes.length+1);
}while(j==i);
}else{
j=i+(_5.reverse?-1:1);
}
var _6=_5.go(j);
if(_6){
_6.addCallback(function(_7){
_5.onUpdate("cycle");
if(_5.playing){
_5.play(false,_7);
}
});
}
},onManualChange:function(_8){
this.cycles=-1;
if(_8!="play"){
this._resetTimer();
if(this.pauseOnManualChange){
this.pause();
}
}
if(this.playing){
this.play();
}
}});
})(dojo);
}
