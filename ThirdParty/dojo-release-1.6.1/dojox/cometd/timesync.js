/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.cometd.timesync"]){
dojo._hasResource["dojox.cometd.timesync"]=true;
dojo.provide("dojox.cometd.timesync");
dojo.require("dojox.cometd._base");
dojox.cometd.timesync=new function(){
this._window=10;
this._lags=[];
this._offsets=[];
this.lag=0;
this.offset=0;
this.samples=0;
this.getServerTime=function(){
return new Date().getTime()+this.offset;
};
this.getServerDate=function(){
return new Date(this.getServerTime());
};
this.setTimeout=function(_1,_2){
var ts=(_2 instanceof Date)?_2.getTime():(0+_2);
var tc=ts-this.offset;
var _3=tc-new Date().getTime();
if(_3<=0){
_3=1;
}
return setTimeout(_1,_3);
};
this._in=function(_4){
var _5=_4.channel;
if(_5&&_5.indexOf("/meta/")==0){
if(_4.ext&&_4.ext.timesync){
var _6=_4.ext.timesync;
var _7=new Date().getTime();
var l=(_7-_6.tc-_6.p)/2-_6.a;
var o=_6.ts-_6.tc-l;
this._lags.push(l);
this._offsets.push(o);
if(this._offsets.length>this._window){
this._offsets.shift();
this._lags.shift();
}
this.samples++;
l=0;
o=0;
for(var i in this._offsets){
l+=this._lags[i];
o+=this._offsets[i];
}
this.offset=parseInt((o/this._offsets.length).toFixed());
this.lag=parseInt((l/this._lags.length).toFixed());
}
}
return _4;
};
this._out=function(_8){
var _9=_8.channel;
if(_9&&_9.indexOf("/meta/")==0){
var _a=new Date().getTime();
if(!_8.ext){
_8.ext={};
}
_8.ext.timesync={tc:_a,l:this.lag,o:this.offset};
}
return _8;
};
};
dojox.cometd._extendInList.push(dojo.hitch(dojox.cometd.timesync,"_in"));
dojox.cometd._extendOutList.push(dojo.hitch(dojox.cometd.timesync,"_out"));
}
