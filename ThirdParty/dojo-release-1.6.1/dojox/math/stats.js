/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.math.stats"]){
dojo._hasResource["dojox.math.stats"]=true;
dojo.provide("dojox.math.stats");
dojo.getObject("math.stats",true,dojox);
(function(){
var st=dojox.math.stats;
dojo.mixin(st,{sd:function(a){
return Math.sqrt(st.variance(a));
},variance:function(a){
var _1=0,_2=0;
dojo.forEach(a,function(_3){
_1+=_3;
_2+=Math.pow(_3,2);
});
return (_2/a.length)-Math.pow(_1/a.length,2);
},bestFit:function(a,_4,_5){
_4=_4||"x",_5=_5||"y";
if(a[0]!==undefined&&typeof (a[0])=="number"){
a=dojo.map(a,function(_6,_7){
return {x:_7,y:_6};
});
}
var sx=0,sy=0,_8=0,_9=0,_a=0,_b=0,_c=0,n=a.length,t;
for(var i=0;i<n;i++){
sx+=a[i][_4];
sy+=a[i][_5];
_8+=Math.pow(a[i][_4],2);
_9+=Math.pow(a[i][_5],2);
_a+=a[i][_4]*a[i][_5];
}
for(i=0;i<n;i++){
t=a[i][_4]-sx/n;
_b+=t*t;
_c+=t*a[i][_5];
}
var _d=_c/(_b||1);
var d=Math.sqrt((_8-Math.pow(sx,2)/n)*(_9-Math.pow(sy,2)/n));
if(d===0){
throw new Error("dojox.math.stats.bestFit: the denominator for Pearson's R is 0.");
}
var r=(_a-(sx*sy/n))/d;
var r2=Math.pow(r,2);
if(_d<0){
r=-r;
}
return {slope:_d,intercept:(sy-sx*_d)/(n||1),r:r,r2:r2};
},forecast:function(a,x,_e,_f){
var fit=st.bestFit(a,_e,_f);
return (fit.slope*x)+fit.intercept;
},mean:function(a){
var t=0;
dojo.forEach(a,function(v){
t+=v;
});
return t/Math.max(a.length,1);
},min:function(a){
return Math.min.apply(null,a);
},max:function(a){
return Math.max.apply(null,a);
},median:function(a){
var t=a.slice(0).sort(function(a,b){
return a-b;
});
return (t[Math.floor(a.length/2)]+t[Math.ceil(a.length/2)])/2;
},mode:function(a){
var o={},r=0,m=Number.MIN_VALUE;
dojo.forEach(a,function(v){
(o[v]!==undefined)?o[v]++:o[v]=1;
});
for(var p in o){
if(m<o[p]){
m=o[p],r=p;
}
}
return r;
},sum:function(a){
var sum=0;
dojo.forEach(a,function(n){
sum+=n;
});
return sum;
},approxLin:function(a,pos){
var p=pos*(a.length-1),t=Math.ceil(p),f=t-1;
if(f<0){
return a[0];
}
if(t>=a.length){
return a[a.length-1];
}
return a[f]*(t-p)+a[t]*(p-f);
},summary:function(a,_10){
if(!_10){
a=a.slice(0);
a.sort(function(a,b){
return a-b;
});
}
var l=st.approxLin,_11={min:a[0],p25:l(a,0.25),med:l(a,0.5),p75:l(a,0.75),max:a[a.length-1],p10:l(a,0.1),p90:l(a,0.9)};
return _11;
}});
})();
}
