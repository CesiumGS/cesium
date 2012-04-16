/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.encoding.crypto.RSAKey-ext"]){
dojo._hasResource["dojox.encoding.crypto.RSAKey-ext"]=true;
dojo.provide("dojox.encoding.crypto.RSAKey-ext");
dojo.require("dojox.encoding.crypto.RSAKey");
dojo.require("dojox.math.BigInteger-ext");
dojo.experimental("dojox.encoding.crypto.RSAKey-ext");
(function(){
var _1=dojox.math.BigInteger;
function _2(d,n){
var b=d.toByteArray();
for(var i=0,_3=b.length;i<_3&&!b[i];++i){
}
if(b.length-i!==n-1||b[i]!==2){
return null;
}
for(++i;b[i];){
if(++i>=_3){
return null;
}
}
var _4="";
while(++i<_3){
_4+=String.fromCharCode(b[i]);
}
return _4;
};
dojo.extend(dojox.encoding.crypto.RSAKey,{setPrivate:function(N,E,D){
if(N&&E&&N.length&&E.length){
this.n=new _1(N,16);
this.e=parseInt(E,16);
this.d=new _1(D,16);
}else{
throw new Error("Invalid RSA private key");
}
},setPrivateEx:function(N,E,D,P,Q,DP,DQ,C){
if(N&&E&&N.length&&E.length){
this.n=new _1(N,16);
this.e=parseInt(E,16);
this.d=new _1(D,16);
this.p=new _1(P,16);
this.q=new _1(Q,16);
this.dmp1=new _1(DP,16);
this.dmq1=new _1(DQ,16);
this.coeff=new _1(C,16);
}else{
throw new Error("Invalid RSA private key");
}
},generate:function(B,E){
var _5=this.rngf(),qs=B>>1;
this.e=parseInt(E,16);
var ee=new _1(E,16);
for(;;){
for(;;){
this.p=new _1(B-qs,1,_5);
if(!this.p.subtract(_1.ONE).gcd(ee).compareTo(_1.ONE)&&this.p.isProbablePrime(10)){
break;
}
}
for(;;){
this.q=new _1(qs,1,_5);
if(!this.q.subtract(_1.ONE).gcd(ee).compareTo(_1.ONE)&&this.q.isProbablePrime(10)){
break;
}
}
if(this.p.compareTo(this.q)<=0){
var t=this.p;
this.p=this.q;
this.q=t;
}
var p1=this.p.subtract(_1.ONE);
var q1=this.q.subtract(_1.ONE);
var _6=p1.multiply(q1);
if(!_6.gcd(ee).compareTo(_1.ONE)){
this.n=this.p.multiply(this.q);
this.d=ee.modInverse(_6);
this.dmp1=this.d.mod(p1);
this.dmq1=this.d.mod(q1);
this.coeff=this.q.modInverse(this.p);
break;
}
}
_5.destroy();
},decrypt:function(_7){
var c=new _1(_7,16),m;
if(!this.p||!this.q){
m=c.modPow(this.d,this.n);
}else{
var cp=c.mod(this.p).modPow(this.dmp1,this.p),cq=c.mod(this.q).modPow(this.dmq1,this.q);
while(cp.compareTo(cq)<0){
cp=cp.add(this.p);
}
m=cp.subtract(cq).multiply(this.coeff).mod(this.p).multiply(this.q).add(cq);
}
if(!m){
return null;
}
return _2(m,(this.n.bitLength()+7)>>3);
}});
})();
}
