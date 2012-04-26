/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.math.random.prng4"]){
dojo._hasResource["dojox.math.random.prng4"]=true;
dojo.provide("dojox.math.random.prng4");
dojo.getObject("math.random.prng4",true,dojox);
(function(){
function _1(){
this.i=0;
this.j=0;
this.S=new Array(256);
};
dojo.extend(_1,{init:function(_2){
var i,j,t,S=this.S,_3=_2.length;
for(i=0;i<256;++i){
S[i]=i;
}
j=0;
for(i=0;i<256;++i){
j=(j+S[i]+_2[i%_3])&255;
t=S[i];
S[i]=S[j];
S[j]=t;
}
this.i=0;
this.j=0;
},next:function(){
var t,i,j,S=this.S;
this.i=i=(this.i+1)&255;
this.j=j=(this.j+S[i])&255;
t=S[i];
S[i]=S[j];
S[j]=t;
return S[(t+S[i])&255];
}});
dojox.math.random.prng4=function(){
return new _1();
};
dojox.math.random.prng4.size=256;
})();
}
