/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.encoding.compression.lzw"]){
dojo._hasResource["dojox.encoding.compression.lzw"]=true;
dojo.provide("dojox.encoding.compression.lzw");
dojo.require("dojox.encoding.bits");
dojo.getObject("encoding.compression.lzw",true,dojox);
(function(){
var _1=function(x){
var w=1;
for(var v=2;x>=v;v<<=1,++w){
}
return w;
};
dojox.encoding.compression.lzw.Encoder=function(n){
this.size=n;
this.init();
};
dojo.extend(dojox.encoding.compression.lzw.Encoder,{init:function(){
this.dict={};
for(var i=0;i<this.size;++i){
this.dict[String.fromCharCode(i)]=i;
}
this.width=_1(this.code=this.size);
this.p="";
},encode:function(_2,_3){
var c=String.fromCharCode(_2),p=this.p+c,r=0;
if(p in this.dict){
this.p=p;
return r;
}
_3.putBits(this.dict[this.p],this.width);
if((this.code&(this.code+1))==0){
_3.putBits(this.code++,r=this.width++);
}
this.dict[p]=this.code++;
this.p=c;
return r+this.width;
},flush:function(_4){
if(this.p.length==0){
return 0;
}
_4.putBits(this.dict[this.p],this.width);
this.p="";
return this.width;
}});
dojox.encoding.compression.lzw.Decoder=function(n){
this.size=n;
this.init();
};
dojo.extend(dojox.encoding.compression.lzw.Decoder,{init:function(){
this.codes=new Array(this.size);
for(var i=0;i<this.size;++i){
this.codes[i]=String.fromCharCode(i);
}
this.width=_1(this.size);
this.p=-1;
},decode:function(_5){
var c=_5.getBits(this.width),v;
if(c<this.codes.length){
v=this.codes[c];
if(this.p>=0){
this.codes.push(this.codes[this.p]+v.substr(0,1));
}
}else{
if((c&(c+1))==0){
this.codes.push("");
++this.width;
return "";
}
var x=this.codes[this.p];
v=x+x.substr(0,1);
this.codes.push(v);
}
this.p=c;
return v;
}});
})();
}
