/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.timezone"]){
dojo._hasResource["dojox.date.timezone"]=true;
dojo.experimental("dojox.date.timezone");
dojo.provide("dojox.date.timezone");
dojo.require("dojo.date.locale");
(function(_1){
var _2=_1.config;
var _3=["africa","antarctica","asia","australasia","backward","etcetera","europe","northamerica","pacificnew","southamerica"];
var _4=1835,_5=2038;
var _6={},_7={},_8={},_9={};
var _a=_2.timezoneFileBasePath||_1.moduleUrl("dojox.date","zoneinfo");
var _b=_2.timezoneLoadingScheme||"preloadAll";
var _c=_2.defaultZoneFile||((_b=="preloadAll")?_3:"northamerica");
_1._contentHandlers["olson-zoneinfo"]=function(_d){
var _e=_1._contentHandlers["text"](_d);
var s="";
var _f=_e.split("\n");
var arr=[];
var _10="";
var _11=null;
var _12=null;
var ret={zones:{},rules:{}};
for(var i=0;i<_f.length;i++){
var l=_f[i];
if(l.match(/^\s/)){
l="Zone "+_11+l;
}
l=l.split("#")[0];
if(l.length>3){
arr=l.split(/\s+/);
_10=arr.shift();
switch(_10){
case "Zone":
_11=arr.shift();
if(arr[0]){
if(!ret.zones[_11]){
ret.zones[_11]=[];
}
ret.zones[_11].push(arr);
}
break;
case "Rule":
_12=arr.shift();
if(!ret.rules[_12]){
ret.rules[_12]=[];
}
ret.rules[_12].push(arr);
break;
case "Link":
if(ret.zones[arr[1]]){
throw new Error("Error with Link "+arr[1]);
}
ret.zones[arr[1]]=arr[0];
break;
case "Leap":
break;
default:
break;
}
}
}
return ret;
};
function _13(_14){
_14=_14||{};
_7=_1.mixin(_7,_14.zones||{});
_9=_1.mixin(_9,_14.rules||{});
};
function _15(e){
console.error("Error loading zone file:",e);
throw e;
};
function _16(_17){
_6[_17]=true;
_1.xhrGet({url:_a+"/"+_17,sync:true,handleAs:"olson-zoneinfo",load:_13,error:_15});
};
var _18={"jan":0,"feb":1,"mar":2,"apr":3,"may":4,"jun":5,"jul":6,"aug":7,"sep":8,"oct":9,"nov":10,"dec":11},_19={"sun":0,"mon":1,"tue":2,"wed":3,"thu":4,"fri":5,"sat":6},_1a={"EST":"northamerica","MST":"northamerica","HST":"northamerica","EST5EDT":"northamerica","CST6CDT":"northamerica","MST7MDT":"northamerica","PST8PDT":"northamerica","America":"northamerica","Pacific":"australasia","Atlantic":"europe","Africa":"africa","Indian":"africa","Antarctica":"antarctica","Asia":"asia","Australia":"australasia","Europe":"europe","WET":"europe","CET":"europe","MET":"europe","EET":"europe"},_1b={"Pacific/Honolulu":"northamerica","Atlantic/Bermuda":"northamerica","Atlantic/Cape_Verde":"africa","Atlantic/St_Helena":"africa","Indian/Kerguelen":"antarctica","Indian/Chagos":"asia","Indian/Maldives":"asia","Indian/Christmas":"australasia","Indian/Cocos":"australasia","America/Danmarkshavn":"europe","America/Scoresbysund":"europe","America/Godthab":"europe","America/Thule":"europe","Asia/Yekaterinburg":"europe","Asia/Omsk":"europe","Asia/Novosibirsk":"europe","Asia/Krasnoyarsk":"europe","Asia/Irkutsk":"europe","Asia/Yakutsk":"europe","Asia/Vladivostok":"europe","Asia/Sakhalin":"europe","Asia/Magadan":"europe","Asia/Kamchatka":"europe","Asia/Anadyr":"europe","Africa/Ceuta":"europe","America/Argentina/Buenos_Aires":"southamerica","America/Argentina/Cordoba":"southamerica","America/Argentina/Tucuman":"southamerica","America/Argentina/La_Rioja":"southamerica","America/Argentina/San_Juan":"southamerica","America/Argentina/Jujuy":"southamerica","America/Argentina/Catamarca":"southamerica","America/Argentina/Mendoza":"southamerica","America/Argentina/Rio_Gallegos":"southamerica","America/Argentina/Ushuaia":"southamerica","America/Aruba":"southamerica","America/La_Paz":"southamerica","America/Noronha":"southamerica","America/Belem":"southamerica","America/Fortaleza":"southamerica","America/Recife":"southamerica","America/Araguaina":"southamerica","America/Maceio":"southamerica","America/Bahia":"southamerica","America/Sao_Paulo":"southamerica","America/Campo_Grande":"southamerica","America/Cuiaba":"southamerica","America/Porto_Velho":"southamerica","America/Boa_Vista":"southamerica","America/Manaus":"southamerica","America/Eirunepe":"southamerica","America/Rio_Branco":"southamerica","America/Santiago":"southamerica","Pacific/Easter":"southamerica","America/Bogota":"southamerica","America/Curacao":"southamerica","America/Guayaquil":"southamerica","Pacific/Galapagos":"southamerica","Atlantic/Stanley":"southamerica","America/Cayenne":"southamerica","America/Guyana":"southamerica","America/Asuncion":"southamerica","America/Lima":"southamerica","Atlantic/South_Georgia":"southamerica","America/Paramaribo":"southamerica","America/Port_of_Spain":"southamerica","America/Montevideo":"southamerica","America/Caracas":"southamerica"},_1c={"US":"S","Chatham":"S","NZ":"S","NT_YK":"S","Edm":"S","Salv":"S","Canada":"S","StJohns":"S","TC":"S","Guat":"S","Mexico":"S","Haiti":"S","Barb":"S","Belize":"S","CR":"S","Moncton":"S","Swift":"S","Hond":"S","Thule":"S","NZAQ":"S","Zion":"S","ROK":"S","PRC":"S","Taiwan":"S","Ghana":"GMT","SL":"WAT","Chicago":"S","Detroit":"S","Vanc":"S","Denver":"S","Halifax":"S","Cuba":"S","Indianapolis":"S","Starke":"S","Marengo":"S","Pike":"S","Perry":"S","Vincennes":"S","Pulaski":"S","Louisville":"S","CA":"S","Nic":"S","Menominee":"S","Mont":"S","Bahamas":"S","NYC":"S","Regina":"S","Resolute":"ES","DR":"S","Toronto":"S","Winn":"S"};
function _1d(t){
throw new Error("Timezone \""+t+"\" is either incorrect, or not loaded in the timezone registry.");
};
function _1e(tz){
var ret=_1b[tz];
if(!ret){
var reg=tz.split("/")[0];
ret=_1a[reg];
if(!ret){
var _1f=_7[tz];
if(typeof _1f=="string"){
return _1e(_1f);
}else{
if(!_6.backward){
_16("backward");
return _1e(tz);
}else{
_1d(tz);
}
}
}
}
return ret;
};
function _20(str){
var pat=/(\d+)(?::0*(\d*))?(?::0*(\d*))?([su])?$/;
var hms=str.match(pat);
if(!hms){
return null;
}
hms[1]=parseInt(hms[1],10);
hms[2]=hms[2]?parseInt(hms[2],10):0;
hms[3]=hms[3]?parseInt(hms[3],10):0;
return hms;
};
function _21(y,m,d,h,mn,s,off){
return Date.UTC(y,m,d,h,mn,s)+((off||0)*60*1000);
};
function _22(m){
return _18[m.substr(0,3).toLowerCase()];
};
function _23(str){
var off=_20(str);
if(off===null){
return 0;
}
var adj=str.indexOf("-")===0?-1:1;
off=adj*(((off[1]*60+off[2])*60+off[3])*1000);
return -off/60/1000;
};
function _24(_25,_26,off){
var _27=_22(_25[3]),day=_25[4],_28=_20(_25[5]);
if(_28[4]=="u"){
off=0;
}
var d,_29,_2a;
if(isNaN(day)){
if(day.substr(0,4)=="last"){
day=_19[day.substr(4,3).toLowerCase()];
d=new Date(_21(_26,_27+1,1,_28[1]-24,_28[2],_28[3],off));
_29=_1.date.add(d,"minute",-off).getUTCDay();
_2a=(day>_29)?(day-_29-7):(day-_29);
if(_2a!==0){
d=_1.date.add(d,"hour",_2a*24);
}
return d;
}else{
day=_19[day.substr(0,3).toLowerCase()];
if(day!="undefined"){
if(_25[4].substr(3,2)==">="){
d=new Date(_21(_26,_27,parseInt(_25[4].substr(5),10),_28[1],_28[2],_28[3],off));
_29=_1.date.add(d,"minute",-off).getUTCDay();
_2a=(day<_29)?(day-_29+7):(day-_29);
if(_2a!==0){
d=_1.date.add(d,"hour",_2a*24);
}
return d;
}else{
if(day.substr(3,2)=="<="){
d=new Date(_21(_26,_27,parseInt(_25[4].substr(5),10),_28[1],_28[2],_28[3],off));
_29=_1.date.add(d,"minute",-off).getUTCDay();
_2a=(day>_29)?(day-_29-7):(day-_29);
if(_2a!==0){
d=_1.date.add(d,"hour",_2a*24);
}
return d;
}
}
}
}
}else{
d=new Date(_21(_26,_27,parseInt(day,10),_28[1],_28[2],_28[3],off));
return d;
}
return null;
};
function _2b(_2c,_2d){
var _2e=[];
_1.forEach(_9[_2c[1]]||[],function(r){
for(var i=0;i<2;i++){
switch(r[i]){
case "min":
r[i]=_4;
break;
case "max":
r[i]=_5;
break;
case "only":
break;
default:
r[i]=parseInt(r[i],10);
if(isNaN(r[i])){
throw new Error("Invalid year found on rule");
}
break;
}
}
if(typeof r[6]=="string"){
r[6]=_23(r[6]);
}
if((r[0]<=_2d&&r[1]>=_2d)||(r[0]==_2d&&r[1]=="only")){
_2e.push({r:r,d:_24(r,_2d,_2c[0])});
}
});
return _2e;
};
function _2f(tz,_30){
var zr=_8[tz]=[];
for(var i=0;i<_30.length;i++){
var z=_30[i];
var r=zr[i]=[];
var _31=null;
var _32=null;
var _33=[];
if(typeof z[0]=="string"){
z[0]=_23(z[0]);
}
if(i===0){
r[0]=Date.UTC(_4,0,1,0,0,0,0);
}else{
r[0]=zr[i-1][1];
_31=_30[i-1];
_32=zr[i-1];
_33=_32[2];
}
var _34=new Date(r[0]).getUTCFullYear();
var _35=z[3]?parseInt(z[3],10):_5;
var rlz=[];
var j;
for(j=_34;j<=_35;j++){
rlz=rlz.concat(_2b(z,j));
}
rlz.sort(function(a,b){
return _1.date.compare(a.d,b.d);
});
var rl;
for(j=0,rl;(rl=rlz[j]);j++){
var _36=j>0?rlz[j-1]:null;
if(rl.r[5].indexOf("u")<0&&rl.r[5].indexOf("s")<0){
if(j===0&&i>0){
if(_33.length){
rl.d=_1.date.add(rl.d,"minute",_33[_33.length-1].r[6]);
}else{
if(_1.date.compare(new Date(_32[1]),rl.d,"date")===0){
rl.d=new Date(_32[1]);
}else{
rl.d=_1.date.add(rl.d,"minute",_23(_31[1]));
}
}
}else{
if(j>0){
rl.d=_1.date.add(rl.d,"minute",_36.r[6]);
}
}
}
}
r[2]=rlz;
if(!z[3]){
r[1]=Date.UTC(_5,11,31,23,59,59,999);
}else{
var _37=parseInt(z[3],10),_38=_22(z[4]||"Jan"),day=parseInt(z[5]||"1",10),_39=_20(z[6]||"0");
var _3a=r[1]=_21(_37,_38,day,_39[1],_39[2],_39[3],((_39[4]=="u")?0:z[0]));
if(isNaN(_3a)){
_3a=r[1]=_24([0,0,0,z[4],z[5],z[6]||"0"],_37,((_39[4]=="u")?0:z[0])).getTime();
}
var _3b=_1.filter(rlz,function(rl,idx){
var o=idx>0?rlz[idx-1].r[6]*60*1000:0;
return (rl.d.getTime()<_3a+o);
});
if(_39[4]!="u"&&_39[4]!="s"){
if(_3b.length){
r[1]+=_3b[_3b.length-1].r[6]*60*1000;
}else{
r[1]+=_23(z[1])*60*1000;
}
}
}
}
};
function _3c(dt,tz){
var t=tz;
var _3d=_7[t];
while(typeof _3d=="string"){
t=_3d;
_3d=_7[t];
}
if(!_3d){
if(!_6.backward){
var _3e=_16("backward",true);
return _3c(dt,tz);
}
_1d(t);
}
if(!_8[tz]){
_2f(tz,_3d);
}
var _3f=_8[tz];
var tm=dt.getTime();
for(var i=0,r;(r=_3f[i]);i++){
if(tm>=r[0]&&tm<r[1]){
return {zone:_3d[i],range:_3f[i],idx:i};
}
}
throw new Error("No Zone found for \""+tz+"\" on "+dt);
};
function _40(dt,_41){
var _42=-1;
var _43=_41.range[2]||[];
var tsp=dt.getTime();
var zr=_41.range;
for(var i=0,r;(r=_43[i]);i++){
if(tsp>=r.d.getTime()){
_42=i;
}
}
if(_42>=0){
return _43[_42].r;
}
return null;
};
function _44(tz,_45,_46){
var res;
var _47=_45.zone;
var _48=_47[2];
if(_48.indexOf("%s")>-1){
var _49;
if(_46){
_49=_46[7];
if(_49=="-"){
_49="";
}
}else{
if(_47[1] in _1c){
_49=_1c[_47[1]];
}else{
if(_45.idx>0){
var pz=_7[tz][_45.idx-1];
var pb=pz[2];
if(pb.indexOf("%s")<0){
if(_48.replace("%s","S")==pb){
_49="S";
}else{
_49="";
}
}else{
_49="";
}
}else{
_49="";
}
}
}
res=_48.replace("%s",_49);
}else{
if(_48.indexOf("/")>-1){
var bs=_48.split("/");
if(_46){
res=bs[_46[6]===0?0:1];
}else{
res=bs[0];
}
}else{
res=_48;
}
}
return res;
};
_1.setObject("dojox.date.timezone",{getTzInfo:function(dt,tz){
if(_b=="lazyLoad"){
var _4a=_1e(tz);
if(!_4a){
throw new Error("Not a valid timezone ID.");
}else{
if(!_6[_4a]){
_16(_4a);
}
}
}
var _4b=_3c(dt,tz);
var off=_4b.zone[0];
var _4c=_40(dt,_4b);
if(_4c){
off+=_4c[6];
}else{
if(_9[_4b.zone[1]]&&_4b.idx>0){
off+=_23(_7[tz][_4b.idx-1][1]);
}else{
off+=_23(_4b.zone[1]);
}
}
var _4d=_44(tz,_4b,_4c);
return {tzOffset:off,tzAbbr:_4d};
},loadZoneData:function(_4e){
_13(_4e);
},getAllZones:function(){
var arr=[];
for(var z in _7){
arr.push(z);
}
arr.sort();
return arr;
}});
if(typeof _c=="string"&&_c){
_c=[_c];
}
if(_1.isArray(_c)){
_1.forEach(_c,function(f){
_16(f);
});
}
var _4f=_1.date.locale.format,_50=_1.date.locale._getZone;
_1.date.locale.format=function(_51,_52){
_52=_52||{};
if(_52.timezone&&!_52._tzInfo){
_52._tzInfo=dojox.date.timezone.getTzInfo(_51,_52.timezone);
}
if(_52._tzInfo){
var _53=_51.getTimezoneOffset()-_52._tzInfo.tzOffset;
_51=new Date(_51.getTime()+(_53*60*1000));
}
return _4f.call(this,_51,_52);
};
_1.date.locale._getZone=function(_54,_55,_56){
if(_56._tzInfo){
return _55?_56._tzInfo.tzAbbr:_56._tzInfo.tzOffset;
}
return _50.call(this,_54,_55,_56);
};
})(dojo);
}
