/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.uuid._base"]){
dojo._hasResource["dojox.uuid._base"]=true;
dojo.provide("dojox.uuid._base");
dojox.uuid.NIL_UUID="00000000-0000-0000-0000-000000000000";
dojox.uuid.version={UNKNOWN:0,TIME_BASED:1,DCE_SECURITY:2,NAME_BASED_MD5:3,RANDOM:4,NAME_BASED_SHA1:5};
dojox.uuid.variant={NCS:"0",DCE:"10",MICROSOFT:"110",UNKNOWN:"111"};
dojox.uuid.assert=function(_1,_2){
if(!_1){
if(!_2){
_2="An assert statement failed.\n"+"The method dojox.uuid.assert() was called with a 'false' value.\n";
}
throw new Error(_2);
}
};
dojox.uuid.generateNilUuid=function(){
return dojox.uuid.NIL_UUID;
};
dojox.uuid.isValid=function(_3){
_3=_3.toString();
var _4=(dojo.isString(_3)&&(_3.length==36)&&(_3==_3.toLowerCase()));
if(_4){
var _5=_3.split("-");
_4=((_5.length==5)&&(_5[0].length==8)&&(_5[1].length==4)&&(_5[2].length==4)&&(_5[3].length==4)&&(_5[4].length==12));
var _6=16;
for(var i in _5){
var _7=_5[i];
var _8=parseInt(_7,_6);
_4=_4&&isFinite(_8);
}
}
return _4;
};
dojox.uuid.getVariant=function(_9){
if(!dojox.uuid._ourVariantLookupTable){
var _a=dojox.uuid.variant;
var _b=[];
_b[0]=_a.NCS;
_b[1]=_a.NCS;
_b[2]=_a.NCS;
_b[3]=_a.NCS;
_b[4]=_a.NCS;
_b[5]=_a.NCS;
_b[6]=_a.NCS;
_b[7]=_a.NCS;
_b[8]=_a.DCE;
_b[9]=_a.DCE;
_b[10]=_a.DCE;
_b[11]=_a.DCE;
_b[12]=_a.MICROSOFT;
_b[13]=_a.MICROSOFT;
_b[14]=_a.UNKNOWN;
_b[15]=_a.UNKNOWN;
dojox.uuid._ourVariantLookupTable=_b;
}
_9=_9.toString();
var _c=_9.charAt(19);
var _d=16;
var _e=parseInt(_c,_d);
dojox.uuid.assert((_e>=0)&&(_e<=16));
return dojox.uuid._ourVariantLookupTable[_e];
};
dojox.uuid.getVersion=function(_f){
var _10="dojox.uuid.getVersion() was not passed a DCE Variant UUID.";
dojox.uuid.assert(dojox.uuid.getVariant(_f)==dojox.uuid.variant.DCE,_10);
_f=_f.toString();
var _11=_f.charAt(14);
var _12=16;
var _13=parseInt(_11,_12);
return _13;
};
dojox.uuid.getNode=function(_14){
var _15="dojox.uuid.getNode() was not passed a TIME_BASED UUID.";
dojox.uuid.assert(dojox.uuid.getVersion(_14)==dojox.uuid.version.TIME_BASED,_15);
_14=_14.toString();
var _16=_14.split("-");
var _17=_16[4];
return _17;
};
dojox.uuid.getTimestamp=function(_18,_19){
var _1a="dojox.uuid.getTimestamp() was not passed a TIME_BASED UUID.";
dojox.uuid.assert(dojox.uuid.getVersion(_18)==dojox.uuid.version.TIME_BASED,_1a);
_18=_18.toString();
if(!_19){
_19=null;
}
switch(_19){
case "string":
case String:
return dojox.uuid.getTimestamp(_18,Date).toUTCString();
break;
case "hex":
var _1b=_18.split("-");
var _1c=_1b[0];
var _1d=_1b[1];
var _1e=_1b[2];
_1e=_1e.slice(1);
var _1f=_1e+_1d+_1c;
dojox.uuid.assert(_1f.length==15);
return _1f;
break;
case null:
case "date":
case Date:
var _20=3394248;
var _21=16;
var _22=_18.split("-");
var _23=parseInt(_22[0],_21);
var _24=parseInt(_22[1],_21);
var _25=parseInt(_22[2],_21);
var _26=_25&4095;
_26<<=16;
_26+=_24;
_26*=4294967296;
_26+=_23;
var _27=_26/10000;
var _28=60*60;
var _29=_20;
var _2a=_29*_28;
var _2b=_2a*1000;
var _2c=_27-_2b;
var _2d=new Date(_2c);
return _2d;
break;
default:
dojox.uuid.assert(false,"dojox.uuid.getTimestamp was not passed a valid returnType: "+_19);
break;
}
};
}
