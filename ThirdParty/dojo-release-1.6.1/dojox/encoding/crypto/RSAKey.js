/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.encoding.crypto.RSAKey"]){
dojo._hasResource["dojox.encoding.crypto.RSAKey"]=true;
dojo.provide("dojox.encoding.crypto.RSAKey");
dojo.require("dojox.math.BigInteger");
dojo.require("dojox.math.random.Simple");
dojo.experimental("dojox.encoding.crypto.RSAKey");
(function(){
var dm=dojox.math,_1=dm.BigInteger,_2=dm.random.Simple,_3=function(){
return new _2();
};
function _4(s,n,_5){
if(n<s.length+11){
throw new Error("Message too long for RSA");
}
var ba=new Array(n);
var i=s.length;
while(i&&n){
ba[--n]=s.charCodeAt(--i);
}
ba[--n]=0;
var _6=_5();
var x=[0];
while(n>2){
x[0]=0;
while(x[0]==0){
_6.nextBytes(x);
}
ba[--n]=x[0];
}
ba[--n]=2;
ba[--n]=0;
_6.destroy();
return new _1(ba);
};
dojo.declare("dojox.encoding.crypto.RSAKey",null,{constructor:function(_7){
this.rngf=_7||_3;
this.e=0;
this.n=this.d=this.p=this.q=this.dmp1=this.dmq1=this.coeff=null;
},setPublic:function(N,E){
if(N&&E&&N.length&&E.length){
this.n=new _1(N,16);
this.e=parseInt(E,16);
}else{
throw new Error("Invalid RSA public key");
}
},encrypt:function(_8){
var m=_4(_8,(this.n.bitLength()+7)>>3,this.rngf);
if(!m){
return null;
}
var c=m.modPowInt(this.e,this.n);
if(!c){
return null;
}
var h=c.toString(16);
return h.length%2?"0"+h:h;
}});
})();
}
