/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.color.Colorspace"]){
dojo._hasResource["dojox.color.Colorspace"]=true;
dojo.provide("dojox.color.Colorspace");
dojo.require("dojox.math.matrix");
dojox.color.Colorspace=new (function(){
var _1=dojox.color;
var _2=dojox.math.matrix;
var _3=this;
var _4={"2":{"E":{x:1/3,y:1/3,t:5400},"D50":{x:0.34567,y:0.3585,t:5000},"D55":{x:0.33242,y:0.34743,t:5500},"D65":{x:0.31271,y:0.32902,t:6500},"D75":{x:0.29902,y:0.31485,t:7500},"A":{x:0.44757,y:0.40745,t:2856},"B":{x:0.34842,y:0.35161,t:4874},"C":{x:0.31006,y:0.31616,t:6774},"9300":{x:0.2848,y:0.2932,t:9300},"F2":{x:0.37207,y:0.37512,t:4200},"F7":{x:0.31285,y:0.32918,t:6500},"F11":{x:0.38054,y:0.37691,t:4000}},"10":{"E":{x:1/3,y:1/3,t:5400},"D50":{x:0.34773,y:0.35952,t:5000},"D55":{x:0.33411,y:0.34877,t:5500},"D65":{x:0.31382,y:0.331,t:6500},"D75":{x:0.29968,y:0.3174,t:7500},"A":{x:0.45117,y:0.40594,t:2856},"B":{x:0.3498,y:0.3527,t:4874},"C":{x:0.31039,y:0.31905,t:6774},"F2":{x:0.37928,y:0.36723,t:4200},"F7":{x:0.31565,y:0.32951,t:6500},"F11":{x:0.38543,y:0.3711,t:4000}}};
var _5={"Adobe RGB 98":[2.2,"D65",0.64,0.33,0.297361,0.21,0.71,0.627355,0.15,0.06,0.075285],"Apple RGB":[1.8,"D65",0.625,0.34,0.244634,0.28,0.595,0.672034,0.155,0.07,0.083332],"Best RGB":[2.2,"D50",0.7347,0.2653,0.228457,0.215,0.775,0.737352,0.13,0.035,0.034191],"Beta RGB":[2.2,"D50",0.6888,0.3112,0.303273,0.1986,0.7551,0.663786,0.1265,0.0352,0.032941],"Bruce RGB":[2.2,"D65",0.64,0.33,0.240995,0.28,0.65,0.683554,0.15,0.06,0.075452],"CIE RGB":[2.2,"E",0.735,0.265,0.176204,0.274,0.717,0.812985,0.167,0.009,0.010811],"ColorMatch RGB":[1.8,"D50",0.63,0.34,0.274884,0.295,0.605,0.658132,0.15,0.075,0.066985],"DON RGB 4":[2.2,"D50",0.696,0.3,0.27835,0.215,0.765,0.68797,0.13,0.035,0.03368],"ECI RGB":[1.8,"D50",0.67,0.33,0.32025,0.21,0.71,0.602071,0.14,0.08,0.077679],"EktaSpace PS5":[2.2,"D50",0.695,0.305,0.260629,0.26,0.7,0.734946,0.11,0.005,0.004425],"NTSC RGB":[2.2,"C",0.67,0.33,0.298839,0.21,0.71,0.586811,0.14,0.08,0.11435],"PAL/SECAM RGB":[2.2,"D65",0.64,0.33,0.222021,0.29,0.6,0.706645,0.15,0.06,0.071334],"Pro Photo RGB":[1.8,"D50",0.7347,0.2653,0.28804,0.1596,0.8404,0.711874,0.0366,0.0001,0.000086],"SMPTE/C RGB":[2.2,"D65",0.63,0.34,0.212395,0.31,0.595,0.701049,0.155,0.07,0.086556],"sRGB":[2.2,"D65",0.64,0.33,0.212656,0.3,0.6,0.715158,0.15,0.06,0.072186],"Wide Gamut RGB":[2.2,"D50",0.735,0.265,0.258187,0.115,0.826,0.724938,0.157,0.018,0.016875]};
var _6={"XYZ scaling":{ma:[[1,0,0],[0,1,0],[0,0,1]],mai:[[1,0,0],[0,1,0],[0,0,1]]},"Bradford":{ma:[[0.8951,-0.7502,0.0389],[0.2664,1.7135,-0.0685],[-0.1614,0.0367,1.0296]],mai:[[0.986993,0.432305,-0.008529],[-0.147054,0.51836,0.040043],[0.159963,0.049291,0.968487]]},"Von Kries":{ma:[[0.40024,-0.2263,0],[0.7076,1.16532,0],[-0.08081,0.0457,0.91822]],mai:[[1.859936,0.361191,0],[-1.129382,0.638812,0],[0.219897,-0.000006,1.089064]]}};
var _7={"XYZ":{"xyY":function(_8,_9){
_9=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:true},_9||{});
var wp=_3.whitepoint(_9.whitepoint,_9.observer);
var _a=_8.X+_8.Y+_8.Z;
if(_a==0){
var x=wp.x,y=wp.y;
}else{
var x=_8.X/_a,y=_8.Y/_a;
}
return {x:x,y:y,Y:_8.Y};
},"Lab":function(_b,_c){
_c=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:true},_c||{});
var _d=_3.kappa(_c.useApproximation),_e=_3.epsilon(_c.useApproximation);
var wp=_3.whitepoint(_c.whitepoint,_c.observer);
var xr=_b.X/wp.x,yr=_b.Y/wp.y,zr=_b.z/wp.z;
var fx=(xr>_e)?Math.pow(xr,1/3):(_d*xr+16)/116;
var fy=(yr>_e)?Math.pow(yr,1/3):(_d*yr+16)/116;
var fz=(zr>_e)?Math.pow(zr,1/3):(_d*zr+16)/116;
var L=116*fy-16,a=500*(fx-fy),b=200*(fy-fz);
return {L:L,a:a,b:b};
},"Luv":function(_f,_10){
_10=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:true},_10||{});
var _11=_3.kappa(_10.useApproximation),_12=_3.epsilon(_10.useApproximation);
var wp=_3.whitepoint(_10.whitepoint,_10.observer);
var ud=(4*_f.X)/(_f.X+15*_f.Y+3*_f.Z);
var vd=(9*_f.Y)/(_f.X+15*_f.Y+3*_f.Z);
var udr=(4*wp.x)/(wp.x+15*wp.y+3*wp.z);
var vdr=(9*wp.y)/(wp.x+15*wp.y+3*wp.z);
var yr=_f.Y/wp.y;
var L=(yr>_12)?116*Math.pow(yr,1/3)-16:_11*yr;
var u=13*L*(ud-udr);
var v=13*L*(vd-vdr);
return {L:L,u:u,v:v};
}},"xyY":{"XYZ":function(xyY){
if(xyY.y==0){
var X=0,Y=0,Z=0;
}else{
var X=(xyY.x*xyY.Y)/xyY.y;
var Y=xyY.Y;
var Z=((1-xyY.x-xyY.y)*xyY.Y)/xyY.y;
}
return {X:X,Y:Y,Z:Z};
}},"Lab":{"XYZ":function(lab,_13){
_13=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:true},_13||{});
var b=_13.useApproximation,_14=_3.kappa(b),_15=_3.epsilon(b);
var wp=_3.whitepoint(_13.whitepoint,_13.observer);
var yr=(lab.L>(_14*_15))?Math.pow((lab.L+16)/116,3):lab.L/_14;
var fy=(yr>_15)?(lab.L+16)/116:(_14*yr+16)/116;
var fx=(lab.a/500)+fy;
var fz=fy-(lab.b/200);
var _16=Math.pow(fx,3),_17=Math.pow(fz,3);
var xr=(_16>_15)?_16:(116*fx-16)/_14;
var zr=(_17>_15)?_17:(116*fz-16)/_14;
return {X:xr*wp.x,Y:yr*wp.y,Z:zr*wp.z};
},"LCHab":function(lab){
var L=lab.L,C=Math.pow(lab.a*lab.a+lab.b*lab.b,0.5),H=Math.atan(lab.b,lab.a)*(180/Math.PI);
if(H<0){
H+=360;
}
if(H<360){
H-=360;
}
return {L:L,C:C,H:H};
}},"LCHab":{"Lab":function(lch){
var _18=lch.H*(Math.PI/180),L=lch.L,a=lch.C/Math.pow(Math.pow(Math.tan(_18),2)+1,0.5);
if(90<lchH&&lch.H<270){
a=-a;
}
var b=Math.pow(Math.pow(lch.C,2)-Math.pow(a,2),0.5);
if(lch.H>180){
b=-b;
}
return {L:L,a:a,b:b};
}},"Luv":{"XYZ":function(Luv,_19){
_19=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:true},_19||{});
var b=_19.useApproximation,_1a=_3.kappa(b),_1b=_3.epsilon(b);
var wp=_3.whitepoint(_19.whitepoint,_19.observer);
var uz=(4*wp.x)/(wp.x+15*wp.y+3*wp.z);
var vz=(9*wp.y)/(wp.x+15*wp.y+3*wp.z);
var Y=(Luv.L>_1a*_1b)?Math.pow((Luv.L+16)/116,3):Luv.L/_1a;
var a=(1/3)*(((52*Luv.L)/(Luv.u+13*Luv.L*uz))-1);
var b=-5*Y,c=-(1/3),d=Y*(((39*Luv.L)/(Luv.v+13*Luv.L*vz))-5);
var X=(d-b)/(a-c),Z=X*a+b;
return {X:X,Y:Y,Z:Z};
},"LCHuv":function(Luv){
var L=Luv.L,C=Math.pow(Luv.u*Luv.u+Luv.v*Luv*v,0.5),H=Math.atan(Luv.v,Luv.u)*(180/Math.PI);
if(H<0){
H+=360;
}
if(H>360){
H-=360;
}
return {L:L,C:C,H:H};
}},"LCHuv":{"Luv":function(LCH){
var _1c=LCH.H*(Math.PI/180);
var L=LCH.L,u=LCH.C/Math.pow(Math.pow(Math.tan(_1c),2)+1,0.5);
var v=Math.pow(LCH.C*LCH.C-u*u,0.5);
if(90<LCH.H&&LCH.H>270){
u*=-1;
}
if(LCH.H>180){
v*=-1;
}
return {L:L,u:u,v:v};
}}};
var _1d={"CMY":{"CMYK":function(obj,_1e){
return _1.fromCmy(obj).toCmyk();
},"HSL":function(obj,_1f){
return _1.fromCmy(obj).toHsl();
},"HSV":function(obj,_20){
return _1.fromCmy(obj).toHsv();
},"Lab":function(obj,_21){
return _7["XYZ"]["Lab"](_1.fromCmy(obj).toXYZ(_21));
},"LCHab":function(obj,_22){
return _7["Lab"]["LCHab"](_1d["CMY"]["Lab"](obj));
},"LCHuv":function(obj,_23){
return _7["LCHuv"]["Luv"](_7["Luv"]["XYZ"](_1.fromCmy(obj).toXYZ(_23)));
},"Luv":function(obj,_24){
return _7["Luv"]["XYZ"](_1.fromCmy(obj).toXYZ(_24));
},"RGB":function(obj,_25){
return _1.fromCmy(obj);
},"XYZ":function(obj,_26){
return _1.fromCmy(obj).toXYZ(_26);
},"xyY":function(obj,_27){
return _7["XYZ"]["xyY"](_1.fromCmy(obj).toXYZ(_27));
}},"CMYK":{"CMY":function(obj,_28){
return _1.fromCmyk(obj).toCmy();
},"HSL":function(obj,_29){
return _1.fromCmyk(obj).toHsl();
},"HSV":function(obj,_2a){
return _1.fromCmyk(obj).toHsv();
},"Lab":function(obj,_2b){
return _7["XYZ"]["Lab"](_1.fromCmyk(obj).toXYZ(_2b));
},"LCHab":function(obj,_2c){
return _7["Lab"]["LCHab"](_1d["CMYK"]["Lab"](obj));
},"LCHuv":function(obj,_2d){
return _7["LCHuv"]["Luv"](_7["Luv"]["XYZ"](_1.fromCmyk(obj).toXYZ(_2d)));
},"Luv":function(obj,_2e){
return _7["Luv"]["XYZ"](_1.fromCmyk(obj).toXYZ(_2e));
},"RGB":function(obj,_2f){
return _1.fromCmyk(obj);
},"XYZ":function(obj,_30){
return _1.fromCmyk(obj).toXYZ(_30);
},"xyY":function(obj,_31){
return _7["XYZ"]["xyY"](_1.fromCmyk(obj).toXYZ(_31));
}},"HSL":{"CMY":function(obj,_32){
return _1.fromHsl(obj).toCmy();
},"CMYK":function(obj,_33){
return _1.fromHsl(obj).toCmyk();
},"HSV":function(obj,_34){
return _1.fromHsl(obj).toHsv();
},"Lab":function(obj,_35){
return _7["XYZ"]["Lab"](_1.fromHsl(obj).toXYZ(_35));
},"LCHab":function(obj,_36){
return _7["Lab"]["LCHab"](_1d["CMYK"]["Lab"](obj));
},"LCHuv":function(obj,_37){
return _7["LCHuv"]["Luv"](_7["Luv"]["XYZ"](_1.fromHsl(obj).toXYZ(_37)));
},"Luv":function(obj,_38){
return _7["Luv"]["XYZ"](_1.fromHsl(obj).toXYZ(_38));
},"RGB":function(obj,_39){
return _1.fromHsl(obj);
},"XYZ":function(obj,_3a){
return _1.fromHsl(obj).toXYZ(_3a);
},"xyY":function(obj,_3b){
return _7["XYZ"]["xyY"](_1.fromHsl(obj).toXYZ(_3b));
}},"HSV":{"CMY":function(obj,_3c){
return _1.fromHsv(obj).toCmy();
},"CMYK":function(obj,_3d){
return _1.fromHsv(obj).toCmyk();
},"HSL":function(obj,_3e){
return _1.fromHsv(obj).toHsl();
},"Lab":function(obj,_3f){
return _7["XYZ"]["Lab"](_1.fromHsv(obj).toXYZ(_3f));
},"LCHab":function(obj,_40){
return _7["Lab"]["LCHab"](_1d["CMYK"]["Lab"](obj));
},"LCHuv":function(obj,_41){
return _7["LCHuv"]["Luv"](_7["Luv"]["XYZ"](_1.fromHsv(obj).toXYZ(_41)));
},"Luv":function(obj,_42){
return _7["Luv"]["XYZ"](_1.fromHsv(obj).toXYZ(_42));
},"RGB":function(obj,_43){
return _1.fromHsv(obj);
},"XYZ":function(obj,_44){
return _1.fromHsv(obj).toXYZ(_44);
},"xyY":function(obj,_45){
return _7["XYZ"]["xyY"](_1.fromHsv(obj).toXYZ(_45));
}},"Lab":{"CMY":function(obj,_46){
return _1.fromXYZ(_7["Lab"]["XYZ"](obj,_46)).toCmy();
},"CMYK":function(obj,_47){
return _1.fromXYZ(_7["Lab"]["XYZ"](obj,_47)).toCmyk();
},"HSL":function(obj,_48){
return _1.fromXYZ(_7["Lab"]["XYZ"](obj,_48)).toHsl();
},"HSV":function(obj,_49){
return _1.fromXYZ(_7["Lab"]["XYZ"](obj,_49)).toHsv();
},"LCHab":function(obj,_4a){
return _7["Lab"]["LCHab"](obj,_4a);
},"LCHuv":function(obj,_4b){
return _7["Luv"]["LCHuv"](_7["Lab"]["XYZ"](obj,_4b),_4b);
},"Luv":function(obj,_4c){
return _7["XYZ"]["Luv"](_7["Lab"]["XYZ"](obj,_4c),_4c);
},"RGB":function(obj,_4d){
return _1.fromXYZ(_7["Lab"]["XYZ"](obj,_4d));
},"XYZ":function(obj,_4e){
return _7["Lab"]["XYZ"](obj,_4e);
},"xyY":function(obj,_4f){
return _7["XYZ"]["xyY"](_7["Lab"]["XYZ"](obj,_4f),_4f);
}},"LCHab":{"CMY":function(obj,_50){
return _1.fromXYZ(_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_50),_50).toCmy();
},"CMYK":function(obj,_51){
return _1.fromXYZ(_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_51),_51).toCmyk();
},"HSL":function(obj,_52){
return _1.fromXYZ(_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_52),_52).toHsl();
},"HSV":function(obj,_53){
return _1.fromXYZ(_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_53),_53).toHsv();
},"Lab":function(obj,_54){
return _7["Lab"]["LCHab"](obj,_54);
},"LCHuv":function(obj,_55){
return _7["Luv"]["LCHuv"](_7["XYZ"]["Luv"](_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_55),_55),_55);
},"Luv":function(obj,_56){
return _7["XYZ"]["Luv"](_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_56),_56);
},"RGB":function(obj,_57){
return _1.fromXYZ(_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_57),_57);
},"XYZ":function(obj,_58){
return _7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj,_58),_58);
},"xyY":function(obj,_59){
return _7["XYZ"]["xyY"](_7["Lab"]["XYZ"](_7["LCHab"]["Lab"](obj),_59),_59);
}},"LCHuv":{"CMY":function(obj,_5a){
return _1.fromXYZ(_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_5a),_5a).toCmy();
},"CMYK":function(obj,_5b){
return _1.fromXYZ(_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_5b),_5b).toCmyk();
},"HSL":function(obj,_5c){
return _1.fromXYZ(_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_5c),_5c).toHsl();
},"HSV":function(obj,_5d){
return _1.fromXYZ(_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_5d),_5d).toHsv();
},"Lab":function(obj,_5e){
return _7["XYZ"]["Lab"](_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_5e),_5e);
},"LCHab":function(obj,_5f){
return _7["Lab"]["LCHab"](_7["XYZ"]["Lab"](_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_5f),_5f),_5f);
},"Luv":function(obj,_60){
return _7["LCHuv"]["Luv"](obj,_60);
},"RGB":function(obj,_61){
return _1.fromXYZ(_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_61),_61);
},"XYZ":function(obj,_62){
return _7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_62);
},"xyY":function(obj,_63){
return _7["XYZ"]["xyY"](_7["Luv"]["XYZ"](_7["LCHuv"]["Luv"](obj),_63),_63);
}},"Luv":{"CMY":function(obj,_64){
return _1.fromXYZ(_7["Luv"]["XYZ"](obj,_64),_64).toCmy();
},"CMYK":function(obj,_65){
return _1.fromXYZ(_7["Luv"]["XYZ"](obj,_65),_65).toCmyk();
},"HSL":function(obj,_66){
return _1.fromXYZ(_7["Luv"]["XYZ"](obj,_66),_66).toHsl();
},"HSV":function(obj,_67){
return _1.fromXYZ(_7["Luv"]["XYZ"](obj,_67),_67).toHsv();
},"Lab":function(obj,_68){
return _7["XYZ"]["Lab"](_7["Luv"]["XYZ"](obj,_68),_68);
},"LCHab":function(obj,_69){
return _7["Lab"]["LCHab"](_7["XYZ"]["Lab"](_7["Luv"]["XYZ"](obj,_69),_69),_69);
},"LCHuv":function(obj,_6a){
return _7["Luv"]["LCHuv"](obj,_6a);
},"RGB":function(obj,_6b){
return _1.fromXYZ(_7["Luv"]["XYZ"](obj,_6b),_6b);
},"XYZ":function(obj,_6c){
return _7["Luv"]["XYZ"](obj,_6c);
},"xyY":function(obj,_6d){
return _7["XYZ"]["xyY"](_7["Luv"]["XYZ"](obj,_6d),_6d);
}},"RGB":{"CMY":function(obj,_6e){
return obj.toCmy();
},"CMYK":function(obj,_6f){
return obj.toCmyk();
},"HSL":function(obj,_70){
return obj.toHsl();
},"HSV":function(obj,_71){
return obj.toHsv();
},"Lab":function(obj,_72){
return _7["XYZ"]["Lab"](obj.toXYZ(_72),_72);
},"LCHab":function(obj,_73){
return _7["LCHab"]["Lab"](_7["XYZ"]["Lab"](obj.toXYZ(_73),_73),_73);
},"LCHuv":function(obj,_74){
return _7["LCHuv"]["Luv"](_7["XYZ"]["Luv"](obj.toXYZ(_74),_74),_74);
},"Luv":function(obj,_75){
return _7["XYZ"]["Luv"](obj.toXYZ(_75),_75);
},"XYZ":function(obj,_76){
return obj.toXYZ(_76);
},"xyY":function(obj,_77){
return _7["XYZ"]["xyY"](obj.toXYZ(_77),_77);
}},"XYZ":{"CMY":function(obj,_78){
return _1.fromXYZ(obj,_78).toCmy();
},"CMYK":function(obj,_79){
return _1.fromXYZ(obj,_79).toCmyk();
},"HSL":function(obj,_7a){
return _1.fromXYZ(obj,_7a).toHsl();
},"HSV":function(obj,_7b){
return _1.fromXYZ(obj,_7b).toHsv();
},"Lab":function(obj,_7c){
return _7["XYZ"]["Lab"](obj,_7c);
},"LCHab":function(obj,_7d){
return _7["Lab"]["LCHab"](_7["XYZ"]["Lab"](obj,_7d),_7d);
},"LCHuv":function(obj,_7e){
return _7["Luv"]["LCHuv"](_7["XYZ"]["Luv"](obj,_7e),_7e);
},"Luv":function(obj,_7f){
return _7["XYZ"]["Luv"](obj,_7f);
},"RGB":function(obj,_80){
return _1.fromXYZ(obj,_80);
},"xyY":function(obj,_81){
return _7["XYZ"]["xyY"](_1.fromXYZ(obj,_81),_81);
}},"xyY":{"CMY":function(obj,_82){
return _1.fromXYZ(_7["xyY"]["XYZ"](obj,_82),_82).toCmy();
},"CMYK":function(obj,_83){
return _1.fromXYZ(_7["xyY"]["XYZ"](obj,_83),_83).toCmyk();
},"HSL":function(obj,_84){
return _1.fromXYZ(_7["xyY"]["XYZ"](obj,_84),_84).toHsl();
},"HSV":function(obj,_85){
return _1.fromXYZ(_7["xyY"]["XYZ"](obj,_85),_85).toHsv();
},"Lab":function(obj,_86){
return _7["Lab"]["XYZ"](_7["xyY"]["XYZ"](obj,_86),_86);
},"LCHab":function(obj,_87){
return _7["LCHab"]["Lab"](_7["Lab"]["XYZ"](_7["xyY"]["XYZ"](obj,_87),_87),_87);
},"LCHuv":function(obj,_88){
return _7["LCHuv"]["Luv"](_7["Luv"]["XYZ"](_7["xyY"]["XYZ"](obj,_88),_88),_88);
},"Luv":function(obj,_89){
return _7["Luv"]["XYZ"](_7["xyY"]["XYZ"](obj,_89),_89);
},"RGB":function(obj,_8a){
return _1.fromXYZ(_7["xyY"]["XYZ"](obj,_8a),_8a);
},"XYZ":function(obj,_8b){
return _7["xyY"]["XYZ"](obj,_8b);
}}};
this.whitepoint=function(_8c,_8d){
_8d=_8d||"10";
var x=0,y=0,t=0;
if(_4[_8d]&&_4[_8d][_8c]){
x=_4[_8d][_8c].x;
y=_4[_8d][_8c].y;
t=_4[_8d][_8c].t;
}else{
console.warn("dojox.color.Colorspace::whitepoint: either the observer or the whitepoint name was not found. ",_8d,_8c);
}
var wp={x:x,y:y,z:(1-x-y),t:t,Y:1};
return this.convert(wp,"xyY","XYZ");
};
this.tempToWhitepoint=function(t){
if(t<4000){
console.warn("dojox.color.Colorspace::tempToWhitepoint: can't find a white point for temperatures less than 4000K. (Passed ",t,").");
return {x:0,y:0};
}
if(t>25000){
console.warn("dojox.color.Colorspace::tempToWhitepoint: can't find a white point for temperatures greater than 25000K. (Passed ",t,").");
return {x:0,y:0};
}
var t1=t,t2=t*t,t3=t2*t;
var _8e=Math.pow(10,9),_8f=Math.pow(10,6),_90=Math.pow(10,3);
if(t<=7000){
var x=(-4.607*_8e/t3)+(2.9678*_8f/t2)+(0.09911*_90/t)+0.2444063;
}else{
var x=(-2.0064*_8e/t3)+(1.9018*_8f/t2)+(0.24748*_90/t)+0.23704;
}
var y=-3*x*x+2.87*x-0.275;
return {x:x,y:y};
};
this.primaries=function(_91){
_91=dojo.mixin({profile:"sRGB",whitepoint:"D65",observer:"10",adaptor:"Bradford"},_91||{});
var m=[];
if(_5[_91.profile]){
m=_5[_91.profile].slice(0);
}else{
console.warn("dojox.color.Colorspace::primaries: the passed profile was not found.  ","Available profiles include: ",_5,".  The profile passed was ",_91.profile);
}
var _92={name:_91.profile,gamma:m[0],whitepoint:m[1],xr:m[2],yr:m[3],Yr:m[4],xg:m[5],yg:m[6],Yg:m[7],xb:m[8],yb:m[9],Yb:m[10]};
if(_91.whitepoint!=_92.whitepoint){
var r=this.convert(this.adapt({color:this.convert({x:xr,y:yr,Y:Yr},"xyY","XYZ"),adaptor:_91.adaptor,source:_92.whitepoint,destination:_91.whitepoint}),"XYZ","xyY");
var g=this.convert(this.adapt({color:this.convert({x:xg,y:yg,Y:Yg},"xyY","XYZ"),adaptor:_91.adaptor,source:_92.whitepoint,destination:_91.whitepoint}),"XYZ","xyY");
var b=this.convert(this.adapt({color:this.convert({x:xb,y:yb,Y:Yb},"xyY","XYZ"),adaptor:_91.adaptor,source:_92.whitepoint,destination:_91.whitepoint}),"XYZ","xyY");
_92=dojo.mixin(_92,{xr:r.x,yr:r.y,Yr:r.Y,xg:g.x,yg:g.y,Yg:g.Y,xb:b.x,yb:b.y,Yb:b.Y,whitepoint:_91.whitepoint});
}
return dojo.mixin(_92,{zr:1-_92.xr-_92.yr,zg:1-_92.xg-_92.yg,zb:1-_92.xb-_92.yb});
};
this.adapt=function(_93){
if(!_93.color||!_93.source){
console.error("dojox.color.Colorspace::adapt: color and source arguments are required. ",_93);
}
_93=dojo.mixin({adaptor:"Bradford",destination:"D65"},_93);
var swp=this.whitepoint(_93.source);
var dwp=this.whitepoint(_93.destination);
if(_6[_93.adaptor]){
var ma=_6[_93.adaptor].ma;
var mai=_6[_93.adaptor].mai;
}else{
console.warn("dojox.color.Colorspace::adapt: the passed adaptor '",_93.adaptor,"' was not found.");
}
var _94=_2.multiply([[swp.x,swp.y,swp.z]],ma);
var _95=_2.multiply([[dwp.x,dwp.y,dwp.z]],ma);
var _96=[[_95[0][0]/_94[0][0],0,0],[0,_95[0][1]/_94[0][1],0],[0,0,_95[0][2]/_94[0][2]]];
var m=_2.multiply(_2.multiply(ma,_96),mai);
var r=_2.multiply([[_93.color.X,_93.color.Y,_93.color.Z]],m)[0];
return {X:r[0],Y:r[1],Z:r[2]};
};
this.matrix=function(to,_97){
var p=_97,wp=this.whitepoint(p.whitepoint);
var Xr=p.xr/p.yr,Yr=1,Zr=(1-p.xr-p.yr)/p.yr;
var Xg=p.xg/p.yg,Yg=1,Zg=(1-p.xg-p.yg)/p.yg;
var Xb=p.xb/p.yb,Yb=1,Zb=(1-p.xb-p.yb)/p.yb;
var m1=[[Xr,Yr,Zr],[Xg,Yg,Zg],[Xb,Yb,Zb]];
var m2=[[wp.X,wp.Y,wp.Z]];
var sm=_2.multiply(m2,_2.inverse(m1));
var Sr=sm[0][0],Sg=sm[0][1],Sb=sm[0][2];
var _98=[[Sr*Xr,Sr*Yr,Sr*Zr],[Sg*Xg,Sg*Yg,Sg*Zg],[Sb*Xb,Sb*Yb,Sb*Zb]];
if(to=="RGB"){
return _2.inverse(_98);
}
return _98;
};
this.epsilon=function(_99){
return (_99||typeof (_99)=="undefined")?0.008856:216/24289;
};
this.kappa=function(_9a){
return (_9a||typeof (_9a)=="undefined")?903.3:24389/27;
};
this.convert=function(_9b,_9c,to,_9d){
if(_1d[_9c]&&_1d[_9c][to]){
return _1d[_9c][to](_9b,_9d);
}
console.warn("dojox.color.Colorspace::convert: Can't convert ",_9b," from ",_9c," to ",to,".");
};
})();
dojo.mixin(dojox.color,{fromXYZ:function(xyz,_9e){
_9e=_9e||{};
var p=dojox.color.Colorspace.primaries(_9e);
var m=dojox.color.Colorspace.matrix("RGB",p);
var rgb=dojox.math.matrix.multiply([[xyz.X,xyz.Y,xyz.Z]],m);
var r=rgb[0][0],g=rgb[0][1],b=rgb[0][2];
if(p.profile=="sRGB"){
var R=(r>0.0031308)?(1.055*Math.pow(r,1/2.4))-0.055:12.92*r;
var G=(g>0.0031308)?(1.055*Math.pow(g,1/2.4))-0.055:12.92*g;
var B=(b>0.0031308)?(1.055*Math.pow(b,1/2.4))-0.055:12.92*b;
}else{
var R=Math.pow(r,1/p.gamma),G=Math.pow(g,1/p.gamma),B=Math.pow(b,1/p.gamma);
}
return new dojox.color.Color({r:Math.floor(R*255),g:Math.floor(G*255),b:Math.floor(B*255)});
}});
dojo.extend(dojox.color.Color,{toXYZ:function(_9f){
_9f=_9f||{};
var p=dojox.color.Colorspace.primaries(_9f);
var m=dojox.color.Colorspace.matrix("XYZ",p);
var _a0=this.r/255,_a1=this.g/255,_a2=this.b/255;
if(p.profile=="sRGB"){
var r=(_a0>0.04045)?Math.pow(((_a0+0.055)/1.055),2.4):_a0/12.92;
var g=(_a1>0.04045)?Math.pow(((_a1+0.055)/1.055),2.4):_a1/12.92;
var b=(_a2>0.04045)?Math.pow(((_a2+0.055)/1.055),2.4):_a2/12.92;
}else{
var r=Math.pow(_a0,p.gamma),g=Math.pow(_a1,p.gamma),b=Math.pow(_a2,p.gamma);
}
var xyz=dojox.math.matrix([[r,g,b]],m);
return {X:xyz[0][0],Y:xyz[0][1],Z:xyz[0][2]};
}});
}
