/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.math.random.Secure"]){
dojo._hasResource["dojox.math.random.Secure"]=true;
dojo.provide("dojox.math.random.Secure");
dojo.declare("dojox.math.random.Secure",null,{constructor:function(_1,_2){
this.prng=_1;
var p=this.pool=new Array(_1.size);
this.pptr=0;
for(var i=0,_3=_1.size;i<_3;){
var t=Math.floor(65536*Math.random());
p[i++]=t>>>8;
p[i++]=t&255;
}
this.seedTime();
if(!_2){
this.h=[dojo.connect(dojo.body(),"onclick",this,"seedTime"),dojo.connect(dojo.body(),"onkeypress",this,"seedTime")];
}
},destroy:function(){
if(this.h){
dojo.forEach(this.h,dojo.disconnect);
}
},nextBytes:function(_4){
var _5=this.state;
if(!_5){
this.seedTime();
_5=this.state=this.prng();
_5.init(this.pool);
for(var p=this.pool,i=0,_6=p.length;i<_6;p[i++]=0){
}
this.pptr=0;
}
for(var i=0,_6=_4.length;i<_6;++i){
_4[i]=_5.next();
}
},seedTime:function(){
this._seed_int(new Date().getTime());
},_seed_int:function(x){
var p=this.pool,i=this.pptr;
p[i++]^=x&255;
p[i++]^=(x>>8)&255;
p[i++]^=(x>>16)&255;
p[i++]^=(x>>24)&255;
if(i>=this.prng.size){
i-=this.prng.size;
}
this.pptr=i;
}});
}
