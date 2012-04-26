/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.encoding.ascii85"]){
dojo._hasResource["dojox.encoding.ascii85"]=true;
dojo.provide("dojox.encoding.ascii85");
dojo.getObject("encoding.ascii85",true,dojox);
(function(){
var c=function(_1,_2,_3){
var i,j,n,b=[0,0,0,0,0];
for(i=0;i<_2;i+=4){
n=((_1[i]*256+_1[i+1])*256+_1[i+2])*256+_1[i+3];
if(!n){
_3.push("z");
}else{
for(j=0;j<5;b[j++]=n%85+33,n=Math.floor(n/85)){
}
}
_3.push(String.fromCharCode(b[4],b[3],b[2],b[1],b[0]));
}
};
dojox.encoding.ascii85.encode=function(_4){
var _5=[],_6=_4.length%4,_7=_4.length-_6;
c(_4,_7,_5);
if(_6){
var t=_4.slice(_7);
while(t.length<4){
t.push(0);
}
c(t,4,_5);
var x=_5.pop();
if(x=="z"){
x="!!!!!";
}
_5.push(x.substr(0,_6+1));
}
return _5.join("");
};
dojox.encoding.ascii85.decode=function(_8){
var n=_8.length,r=[],b=[0,0,0,0,0],i,j,t,x,y,d;
for(i=0;i<n;++i){
if(_8.charAt(i)=="z"){
r.push(0,0,0,0);
continue;
}
for(j=0;j<5;++j){
b[j]=_8.charCodeAt(i+j)-33;
}
d=n-i;
if(d<5){
for(j=d;j<4;b[++j]=0){
}
b[d]=85;
}
t=(((b[0]*85+b[1])*85+b[2])*85+b[3])*85+b[4];
x=t&255;
t>>>=8;
y=t&255;
t>>>=8;
r.push(t>>>8,t&255,y,x);
for(j=d;j<5;++j,r.pop()){
}
i+=4;
}
return r;
};
})();
}
