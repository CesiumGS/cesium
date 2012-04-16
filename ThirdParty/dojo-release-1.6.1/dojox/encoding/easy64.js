/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.encoding.easy64"]){
dojo._hasResource["dojox.encoding.easy64"]=true;
dojo.provide("dojox.encoding.easy64");
dojo.getObject("encoding.easy64",true,dojox);
(function(){
var c=function(_1,_2,_3){
for(var i=0;i<_2;i+=3){
_3.push(String.fromCharCode((_1[i]>>>2)+33),String.fromCharCode(((_1[i]&3)<<4)+(_1[i+1]>>>4)+33),String.fromCharCode(((_1[i+1]&15)<<2)+(_1[i+2]>>>6)+33),String.fromCharCode((_1[i+2]&63)+33));
}
};
dojox.encoding.easy64.encode=function(_4){
var _5=[],_6=_4.length%3,_7=_4.length-_6;
c(_4,_7,_5);
if(_6){
var t=_4.slice(_7);
while(t.length<3){
t.push(0);
}
c(t,3,_5);
for(var i=3;i>_6;_5.pop(),--i){
}
}
return _5.join("");
};
dojox.encoding.easy64.decode=function(_8){
var n=_8.length,r=[],b=[0,0,0,0],i,j,d;
for(i=0;i<n;i+=4){
for(j=0;j<4;++j){
b[j]=_8.charCodeAt(i+j)-33;
}
d=n-i;
for(j=d;j<4;b[++j]=0){
}
r.push((b[0]<<2)+(b[1]>>>4),((b[1]&15)<<4)+(b[2]>>>2),((b[2]&3)<<6)+b[3]);
for(j=d;j<4;++j,r.pop()){
}
}
return r;
};
})();
}
