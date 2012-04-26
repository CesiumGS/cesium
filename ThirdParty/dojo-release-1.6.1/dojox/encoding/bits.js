/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.encoding.bits"]){
dojo._hasResource["dojox.encoding.bits"]=true;
dojo.provide("dojox.encoding.bits");
dojo.getObject("encoding.bits",true,dojox);
dojox.encoding.bits.OutputStream=function(){
this.reset();
};
dojo.extend(dojox.encoding.bits.OutputStream,{reset:function(){
this.buffer=[];
this.accumulator=0;
this.available=8;
},putBits:function(_1,_2){
while(_2){
var w=Math.min(_2,this.available);
var v=(w<=_2?_1>>>(_2-w):_1)<<(this.available-w);
this.accumulator|=v&(255>>>(8-this.available));
this.available-=w;
if(!this.available){
this.buffer.push(this.accumulator);
this.accumulator=0;
this.available=8;
}
_2-=w;
}
},getWidth:function(){
return this.buffer.length*8+(8-this.available);
},getBuffer:function(){
var b=this.buffer;
if(this.available<8){
b.push(this.accumulator&(255<<this.available));
}
this.reset();
return b;
}});
dojox.encoding.bits.InputStream=function(_3,_4){
this.buffer=_3;
this.width=_4;
this.bbyte=this.bit=0;
};
dojo.extend(dojox.encoding.bits.InputStream,{getBits:function(_5){
var r=0;
while(_5){
var w=Math.min(_5,8-this.bit);
var v=this.buffer[this.bbyte]>>>(8-this.bit-w);
r<<=w;
r|=v&~(~0<<w);
this.bit+=w;
if(this.bit==8){
++this.bbyte;
this.bit=0;
}
_5-=w;
}
return r;
},getWidth:function(){
return this.width-this.bbyte*8-this.bit;
}});
}
