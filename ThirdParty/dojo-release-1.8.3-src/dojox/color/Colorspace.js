define(["./_base", "dojo/_base/lang", "dojox/math/matrix"],
	function(dcolor, lang, dxm){

dcolor.Colorspace = new (function(){
	var self=this;
	var wpMap={
		"2":{
			"E":	{ x:1/3,     y:1/3,     t:5400 },
			"D50":	{ x:0.34567, y:0.3585,  t:5000 },
			"D55":	{ x:0.33242, y:0.34743, t:5500 },
			"D65":	{ x:0.31271, y:0.32902, t:6500 },
			"D75":	{ x:0.29902, y:0.31485, t:7500 },
			"A":	{ x:0.44757, y:0.40745, t:2856 },
			"B":	{ x:0.34842, y:0.35161, t:4874 },
			"C":	{ x:0.31006, y:0.31616, t:6774 },
			"9300":	{ x:0.2848,  y:0.2932,  t:9300 },
			"F2":	{ x:0.37207, y:0.37512, t:4200 },
			"F7":	{ x:0.31285, y:0.32918, t:6500 },
			"F11":	{ x:0.38054, y:0.37691, t:4000 }
		},
		"10":{
			"E":	{ x:1/3,     y:1/3,     t:5400 },
			"D50":	{ x:0.34773, y:0.35952, t:5000 },
			"D55":	{ x:0.33411, y:0.34877, t:5500 },
			"D65":	{ x:0.31382, y:0.331,   t:6500 },
			"D75":	{ x:0.29968, y:0.3174,  t:7500 },
			"A":	{ x:0.45117, y:0.40594, t:2856 },
			"B":	{ x:0.3498,  y:0.3527,  t:4874 },
			"C":	{ x:0.31039, y:0.31905, t:6774 },
			"F2":	{ x:0.37928, y:0.36723, t:4200 },
			"F7":	{ x:0.31565, y:0.32951, t:6500 },
			"F11":	{ x:0.38543, y:0.3711,  t:4000 }
		}
	};

	var profiles={
		"Adobe RGB 98":[2.2, "D65", 0.64, 0.33, 0.297361, 0.21, 0.71, 0.627355, 0.15, 0.06, 0.075285],
		"Apple RGB":[1.8, "D65", 0.625, 0.34, 0.244634, 0.28, 0.595, 0.672034, 0.155, 0.07, 0.083332],
		"Best RGB":[2.2, "D50", 0.7347, 0.2653, 0.228457, 0.215, 0.775, 0.737352, 0.13, 0.035, 0.034191],
		"Beta RGB":[2.2, "D50", 0.6888, 0.3112, 0.303273, 0.1986, 0.7551, 0.663786, 0.1265, 0.0352, 0.032941],
		"Bruce RGB":[2.2, "D65", 0.64, 0.33, 0.240995, 0.28, 0.65, 0.683554, 0.15, 0.06, 0.075452],
		"CIE RGB":[2.2, "E", 0.735, 0.265, 0.176204, 0.274, 0.717, 0.812985, 0.167, 0.009, 0.010811],
		"ColorMatch RGB":[1.8, "D50", 0.63, 0.34, 0.274884, 0.295, 0.605, 0.658132, 0.15, 0.075, 0.066985],
		"DON RGB 4":[2.2, "D50", 0.696, 0.3, 0.27835, 0.215, 0.765, 0.68797, 0.13, 0.035, 0.03368],
		"ECI RGB":[1.8, "D50", 0.67, 0.33, 0.32025, 0.21, 0.71, 0.602071, 0.14, 0.08, 0.077679],
		"EktaSpace PS5":[2.2, "D50", 0.695, 0.305, 0.260629, 0.26, 0.7, 0.734946, 0.11, 0.005, 0.004425],
		"NTSC RGB":[2.2, "C", 0.67, 0.33, 0.298839, 0.21, 0.71, 0.586811, 0.14, 0.08, 0.11435],
		"PAL/SECAM RGB":[2.2, "D65", 0.64, 0.33, 0.222021, 0.29, 0.6, 0.706645, 0.15, 0.06, 0.071334],
		"Pro Photo RGB":[1.8, "D50", 0.7347, 0.2653, 0.28804, 0.1596, 0.8404, 0.711874, 0.0366, 0.0001, 0.000086],
		"SMPTE/C RGB":[2.2, "D65", 0.63, 0.34, 0.212395, 0.31, 0.595, 0.701049, 0.155, 0.07, 0.086556],
		"sRGB":[2.2, "D65", 0.64, 0.33, 0.212656, 0.3, 0.6, 0.715158, 0.15, 0.06, 0.072186],
		"Wide Gamut RGB":[2.2, "D50", 0.735, 0.265, 0.258187, 0.115, 0.826, 0.724938, 0.157, 0.018, 0.016875]
	};

	var adaptors={
		"XYZ scaling":{
			ma:  [[1,0,0], [0,1,0], [0,0,1]],
			mai: [[1,0,0], [0,1,0], [0,0,1]]
		},
		"Bradford":{
			ma:  [[0.8951, -0.7502, 0.0389], [0.2664, 1.7135, -0.0685], [-0.1614, 0.0367, 1.0296]],
			mai: [[0.986993, 0.432305, -0.008529], [-0.147054, 0.51836, 0.040043], [0.159963, 0.049291, 0.968487]]
		},
		"Von Kries":{
			ma:  [[0.40024, -0.2263, 0], [0.7076, 1.16532, 0], [-0.08081, 0.0457, 0.91822]],
			mai: [[1.859936, 0.361191, 0], [-1.129382, 0.638812, 0], [0.219897, -0.000006, 1.089064]]
		}
	};

	var cMaps={
		"XYZ":{
			"xyY":function(xyz, kwArgs){
				kwArgs=dojo.mixin({
					whitepoint:"D65",
					observer:"10",
					useApproximation:true
				}, kwArgs||{});
				var wp=self.whitepoint(kwArgs.whitepoint, kwArgs.observer);
				var sum=xyz.X+xyz.Y+xyz.Z;
				if(sum==0){ var x=wp.x, y=wp.y; }
				else{ var x=xyz.X/sum, y=xyz.Y/sum; }
				return { x:x, y:y, Y:xyz.Y };
			},
			"Lab":function(xyz, kwArgs){
				kwArgs=dojo.mixin({
					whitepoint:"D65",
					observer:"10",
					useApproximation:true
				}, kwArgs||{});

				var kappa=self.kappa(kwArgs.useApproximation), epsilon=self.epsilon(kwArgs.useApproximation);
				var wp=self.whitepoint(kwArgs.whitepoint, kwArgs.observer);
				var xr=xyz.X/wp.x, yr=xyz.Y/wp.y, zr=xyz.z/wp.z;
				var fx=(xr>epsilon)?Math.pow(xr,1/3):(kappa*xr+16)/116;
				var fy=(yr>epsilon)?Math.pow(yr,1/3):(kappa*yr+16)/116;
				var fz=(zr>epsilon)?Math.pow(zr,1/3):(kappa*zr+16)/116;
				var L=116*fy-16, a=500*(fx-fy), b=200*(fy-fz);
				return { L:L, a:a, b:b };
			},
			"Luv": function(xyz, kwArgs){
				kwArgs=dojo.mixin({
					whitepoint:"D65",
					observer:"10",
					useApproximation:true
				}, kwArgs||{});

				var kappa=self.kappa(kwArgs.useApproximation), epsilon=self.epsilon(kwArgs.useApproximation);
				var wp=self.whitepoint(kwArgs.whitepoint, kwArgs.observer);
				var ud=(4*xyz.X)/(xyz.X+15*xyz.Y+3*xyz.Z);
				var vd=(9*xyz.Y)/(xyz.X+15*xyz.Y+3*xyz.Z);
				var udr=(4*wp.x)/(wp.x+15*wp.y+3*wp.z);
				var vdr=(9*wp.y)/(wp.x+15*wp.y+3*wp.z);
				var yr=xyz.Y/wp.y;
				var L=(yr>epsilon)?116*Math.pow(yr, 1/3)-16:kappa*yr;
				var u=13*L*(ud-udr);
				var v=13*L*(vd-vdr);
				return { L:L, u:u, v:v };
			}
		},
		"xyY":{
			"XYZ":function(xyY){
				if(xyY.y==0){ var X=0, Y=0, Z=0; }
				else{
					var X=(xyY.x*xyY.Y)/xyY.y;
					var Y=xyY.Y;
					var Z=((1-xyY.x-xyY.y)*xyY.Y)/xyY.y;
				}
				return { X:X, Y:Y, Z:Z };
			}
		},
		"Lab":{
			"XYZ": function(lab, kwArgs){
				kwArgs=dojo.mixin({
					whitepoint:"D65",
					observer:"10",
					useApproximation:true
				}, kwArgs||{});

				var b=kwArgs.useApproximation, kappa=self.kappa(b), epsilon=self.epsilon(b);
				var wp=self.whitepoint(kwArgs.whitepoint, kwArgs.observer);
				var yr=(lab.L>(kappa*epsilon))?Math.pow((lab.L+16)/116, 3):lab.L/kappa;
				var fy=(yr>epsilon)?(lab.L+16)/116:(kappa*yr+16)/116;
				var fx=(lab.a/500)+fy;
				var fz=fy-(lab.b/200);
				var fxcube=Math.pow(fx, 3), fzcube=Math.pow(fz, 3);
				var xr=(fxcube>epsilon)?fxcube:(116*fx-16)/kappa;
				var zr=(fzcube>epsilon)?fzcube:(116*fz-16)/kappa;
				return { X: xr*wp.x, Y: yr*wp.y, Z: zr*wp.z };
			},
			"LCHab": function(lab){
				var L=lab.L, C=Math.pow(lab.a*lab.a+lab.b*lab.b, 0.5), H=Math.atan(lab.b, lab.a)*(180/Math.PI);
				if(H<0){ H+=360; }
				if(H<360){ H-=360; }
				return { L:L, C:C, H:H };
			}
		},
		"LCHab":{
			"Lab":function(lch){
				var hRad=lch.H*(Math.PI/180), L=lch.L, a=lch.C/Math.pow(Math.pow(Math.tan(hRad),2)+1, 0.5);
				if(90<lchH && lch.H<270){ a = -a; }
				var b=Math.pow(Math.pow(lch.C,2)-Math.pow(a, 2), 0.5);
				if(lch.H>180){ b = -b; }
				return { L: L, a:a, b:b };
			}
		},
		"Luv":{
			"XYZ": function(Luv, kwArgs){
				kwArgs=dojo.mixin({
					whitepoint:"D65",
					observer:"10",
					useApproximation:true
				}, kwArgs||{});

				var b=kwArgs.useApproximation, kappa=self.kappa(b), epsilon=self.epsilon(b);
				var wp=self.whitepoint(kwArgs.whitepoint, kwArgs.observer);
				var uz=(4*wp.x)/(wp.x+15*wp.y+3*wp.z);
				var vz=(9*wp.y)/(wp.x+15*wp.y+3*wp.z);
				var Y=(Luv.L>kappa*epsilon)?Math.pow((Luv.L+16)/116, 3):Luv.L/kappa;
				var a=(1/3)*(((52*Luv.L)/(Luv.u+13*Luv.L*uz))-1);
				var b=-5*Y, c=-(1/3), d=Y*(((39*Luv.L)/(Luv.v+13*Luv.L*vz))-5);
				var X=(d-b)/(a-c), Z=X*a+b;
				return { X:X, Y:Y, Z:Z };
			},
			"LCHuv": function(Luv){
				var L=Luv.L, C=Math.pow(Luv.u*Luv.u+Luv.v*Luv*v, 0.5), H=Math.atan(Luv.v, Luv.u)*(180/Math.PI);
				if(H<0){ H+=360; }
				if(H>360){ H-=360; }
				return { L:L, C:C, H:H };
			}
		},
		"LCHuv":{
			"Luv": function(LCH){
				var hRad=LCH.H*(Math.PI/180);
				var L=LCH.L, u=LCH.C/Math.pow(Math.pow(Math.tan(hRad),2)+1, 0.5);
				var v=Math.pow(LCH.C*LCH.C-u*u, 0.5);
				if(90<LCH.H && LCH.H>270){ u*=-1; }
				if(LCH.H>180){ v*=-1; }
				return { L:L, u:u, v:v };
			}
		}
	};
	var converters={
		"CMY":{
			"CMYK":function(obj, kwArgs){ return dcolor.fromCmy(obj).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromCmy(obj).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromCmy(obj).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](dcolor.fromCmy(obj).toXYZ(kwArgs)); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](converters["CMY"]["Lab"](obj)); },
			"LCHuv":function(obj, kwArgs){ return cMaps["LCHuv"]["Luv"](cMaps["Luv"]["XYZ"](dcolor.fromCmy(obj).toXYZ(kwArgs))); },
			"Luv":function(obj, kwArgs){ return cMaps["Luv"]["XYZ"](dcolor.fromCmy(obj).toXYZ(kwArgs)); },
			"RGB":function(obj, kwArgs){ return dcolor.fromCmy(obj); },
			"XYZ":function(obj, kwArgs){ return dcolor.fromCmy(obj).toXYZ(kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](dcolor.fromCmy(obj).toXYZ(kwArgs)); }
		},
		"CMYK":{
			"CMY":function(obj, kwArgs){ return dcolor.fromCmyk(obj).toCmy(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromCmyk(obj).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromCmyk(obj).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](dcolor.fromCmyk(obj).toXYZ(kwArgs)); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](converters["CMYK"]["Lab"](obj)); },
			"LCHuv":function(obj, kwArgs){ return cMaps["LCHuv"]["Luv"](cMaps["Luv"]["XYZ"](dcolor.fromCmyk(obj).toXYZ(kwArgs))); },
			"Luv":function(obj, kwArgs){ return cMaps["Luv"]["XYZ"](dcolor.fromCmyk(obj).toXYZ(kwArgs)); },
			"RGB":function(obj, kwArgs){ return dcolor.fromCmyk(obj); },
			"XYZ":function(obj, kwArgs){ return dcolor.fromCmyk(obj).toXYZ(kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](dcolor.fromCmyk(obj).toXYZ(kwArgs)); }
		},
		"HSL":{
			"CMY":function(obj, kwArgs){ return dcolor.fromHsl(obj).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromHsl(obj).toCmyk(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromHsl(obj).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](dcolor.fromHsl(obj).toXYZ(kwArgs)); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](converters["CMYK"]["Lab"](obj)); },
			"LCHuv":function(obj, kwArgs){ return cMaps["LCHuv"]["Luv"](cMaps["Luv"]["XYZ"](dcolor.fromHsl(obj).toXYZ(kwArgs))); },
			"Luv":function(obj, kwArgs){ return cMaps["Luv"]["XYZ"](dcolor.fromHsl(obj).toXYZ(kwArgs)); },
			"RGB":function(obj, kwArgs){ return dcolor.fromHsl(obj); },
			"XYZ":function(obj, kwArgs){ return dcolor.fromHsl(obj).toXYZ(kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](dcolor.fromHsl(obj).toXYZ(kwArgs)); }
		},
		"HSV":{
			"CMY":function(obj, kwArgs){ return dcolor.fromHsv(obj).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromHsv(obj).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromHsv(obj).toHsl(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](dcolor.fromHsv(obj).toXYZ(kwArgs)); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](converters["CMYK"]["Lab"](obj)); },
			"LCHuv":function(obj, kwArgs){ return cMaps["LCHuv"]["Luv"](cMaps["Luv"]["XYZ"](dcolor.fromHsv(obj).toXYZ(kwArgs))); },
			"Luv":function(obj, kwArgs){ return cMaps["Luv"]["XYZ"](dcolor.fromHsv(obj).toXYZ(kwArgs)); },
			"RGB":function(obj, kwArgs){ return dcolor.fromHsv(obj); },
			"XYZ":function(obj, kwArgs){ return dcolor.fromHsv(obj).toXYZ(kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](dcolor.fromHsv(obj).toXYZ(kwArgs)); }
		},
		"Lab":{
			"CMY":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](obj, kwArgs)).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](obj, kwArgs)).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](obj, kwArgs)).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](obj, kwArgs)).toHsv(); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](obj, kwArgs); },
			"LCHuv":function(obj, kwArgs){ return cMaps["Luv"]["LCHuv"](cMaps["Lab"]["XYZ"](obj, kwArgs), kwArgs); },
			"Luv":function(obj, kwArgs){ return cMaps["XYZ"]["Luv"](cMaps["Lab"]["XYZ"](obj, kwArgs), kwArgs); },
			"RGB":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](obj, kwArgs)); },
			"XYZ":function(obj, kwArgs){ return cMaps["Lab"]["XYZ"](obj, kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](cMaps["Lab"]["XYZ"](obj, kwArgs), kwArgs); }
		},
		"LCHab":{
			"CMY":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](obj, kwArgs); },
			"LCHuv":function(obj, kwArgs){ return cMaps["Luv"]["LCHuv"](cMaps["XYZ"]["Luv"](cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs), kwArgs);},
			"Luv":function(obj, kwArgs){ return cMaps["XYZ"]["Luv"](cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs);},
			"RGB":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs); },
			"XYZ":function(obj, kwArgs){ return cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj, kwArgs), kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](cMaps["Lab"]["XYZ"](cMaps["LCHab"]["Lab"](obj), kwArgs), kwArgs); }
		},
		"LCHuv":{
			"CMY":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](cMaps["XYZ"]["Lab"](cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs), kwArgs); },
			"Luv":function(obj, kwArgs){ return cMaps["LCHuv"]["Luv"](obj, kwArgs); },
			"RGB":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs); },
			"XYZ":function(obj, kwArgs){ return cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](cMaps["Luv"]["XYZ"](cMaps["LCHuv"]["Luv"](obj), kwArgs), kwArgs); }
		},
		"Luv":{
			"CMY":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](cMaps["XYZ"]["Lab"](cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs), kwArgs); },
			"LCHuv":function(obj, kwArgs){ return cMaps["Luv"]["LCHuv"](obj, kwArgs); },
			"RGB":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs); },
			"XYZ":function(obj, kwArgs){ return cMaps["Luv"]["XYZ"](obj, kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](cMaps["Luv"]["XYZ"](obj, kwArgs), kwArgs); }
		},
		"RGB":{
			"CMY":function(obj, kwArgs){ return obj.toCmy(); },
			"CMYK":function(obj, kwArgs){ return obj.toCmyk(); },
			"HSL":function(obj, kwArgs){ return obj.toHsl(); },
			"HSV":function(obj, kwArgs){ return obj.toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](obj.toXYZ(kwArgs), kwArgs); },
			"LCHab":function(obj, kwArgs){ return cMaps["LCHab"]["Lab"](cMaps["XYZ"]["Lab"](obj.toXYZ(kwArgs), kwArgs), kwArgs);},
			"LCHuv":function(obj, kwArgs){ return cMaps["LCHuv"]["Luv"](cMaps["XYZ"]["Luv"](obj.toXYZ(kwArgs), kwArgs), kwArgs);},
			"Luv":function(obj, kwArgs){ return cMaps["XYZ"]["Luv"](obj.toXYZ(kwArgs), kwArgs); },
			"XYZ":function(obj, kwArgs){ return obj.toXYZ(kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](obj.toXYZ(kwArgs), kwArgs); }
		},
		"XYZ":{
			"CMY":function(obj, kwArgs){ return dcolor.fromXYZ(obj, kwArgs).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromXYZ(obj, kwArgs).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromXYZ(obj, kwArgs).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromXYZ(obj, kwArgs).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["XYZ"]["Lab"](obj, kwArgs); },
			"LCHab":function(obj, kwArgs){ return cMaps["Lab"]["LCHab"](cMaps["XYZ"]["Lab"](obj, kwArgs), kwArgs); },
			"LCHuv":function(obj, kwArgs){ return cMaps["Luv"]["LCHuv"](cMaps["XYZ"]["Luv"](obj, kwArgs), kwArgs); },
			"Luv":function(obj, kwArgs){ return cMaps["XYZ"]["Luv"](obj, kwArgs); },
			"RGB":function(obj, kwArgs){ return dcolor.fromXYZ(obj, kwArgs); },
			"xyY":function(obj, kwArgs){ return cMaps["XYZ"]["xyY"](dcolor.fromXYZ(obj, kwArgs), kwArgs); }
		},
		// TODO: revisit this. xyY represents a single color, not a spectrum of colors.
		"xyY":{
			"CMY":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs).toCmy(); },
			"CMYK":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs).toCmyk(); },
			"HSL":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs).toHsl(); },
			"HSV":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs).toHsv(); },
			"Lab":function(obj, kwArgs){ return cMaps["Lab"]["XYZ"](cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs); },
			"LCHab":function(obj, kwArgs){ return cMaps["LCHab"]["Lab"](cMaps["Lab"]["XYZ"](cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs), kwArgs); },
			"LCHuv":function(obj, kwArgs){ return cMaps["LCHuv"]["Luv"](cMaps["Luv"]["XYZ"](cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs), kwArgs); },
			"Luv":function(obj, kwArgs){ return cMaps["Luv"]["XYZ"](cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs); },
			"RGB":function(obj, kwArgs){ return dcolor.fromXYZ(cMaps["xyY"]["XYZ"](obj, kwArgs), kwArgs); },
			"XYZ":function(obj, kwArgs){ return cMaps["xyY"]["XYZ"](obj, kwArgs); }
		}
	};

	this.whitepoint=function(/* String */wpName, /* String? */observer){
		observer=observer||"10";
		var x=0, y=0, t=0;
		if(wpMap[observer] && wpMap[observer][wpName]){
			x=wpMap[observer][wpName].x;
			y=wpMap[observer][wpName].y;
			t=wpMap[observer][wpName].t;
		} else {
			console.warn(
				"dojox.color.Colorspace::whitepoint: either the observer or the whitepoint name was not found. ",
				observer, wpName
			);
		}
		var wp={ x:x, y:y, z:(1-x-y), t:t, Y:1 };
		return this.convert(wp, "xyY", "XYZ");
	};

	this.tempToWhitepoint=function(/* Number */t){
		if(t<4000){
			console.warn("dojox.color.Colorspace::tempToWhitepoint: can't find a white point for temperatures less than 4000K. (Passed ", t, ").");
			return { x:0, y:0 };
		}
		if(t>25000){
			console.warn("dojox.color.Colorspace::tempToWhitepoint: can't find a white point for temperatures greater than 25000K. (Passed ", t, ").");
			return { x:0, y:0 };
		}
		var t1=t, t2=t*t, t3=t2*t;
		var ten9=Math.pow(10, 9), ten6=Math.pow(10, 6), ten3=Math.pow(10,3);
		if(t<=7000){
			var x=(-4.607*ten9/t3)+(2.9678*ten6/t2)+(0.09911*ten3/t)+0.2444063;
		} else {
			var x=(-2.0064*ten9/t3)+(1.9018*ten6/t2)+(0.24748*ten3/t)+0.23704;
		}
		var y=-3*x*x+2.87*x-0.275;
		return { x:x, y:y };
	};

	this.primaries=function(/* Object */kwArgs){
		//	mix in the defaults.
		kwArgs=dojo.mixin({
			profile:"sRGB",
			whitepoint:"D65",
			observer:"10",
			adaptor:"Bradford"
		}, kwArgs||{});

		var m=[];
		if(profiles[kwArgs.profile]){
			m=profiles[kwArgs.profile].slice(0);
		} else {
			console.warn(
				"dojox.color.Colorspace::primaries: the passed profile was not found.  ",
				"Available profiles include: ", profiles,
				".  The profile passed was ", kwArgs.profile
			);
		}
		var primary={
			name:kwArgs.profile,
			gamma:m[0], whitepoint:m[1],
			xr:m[2], yr:m[3], Yr:m[4],
			xg:m[5], yg:m[6], Yg:m[7],
			xb:m[8], yb:m[9], Yb:m[10]
		};

		//	convert for the whitepoint
		if(kwArgs.whitepoint!=primary.whitepoint){
			var r=this.convert(
				this.adapt({
					color:this.convert({ x:xr, y:yr, Y:Yr }, "xyY", "XYZ"),
					adaptor:kwArgs.adaptor,
					source:primary.whitepoint,
					destination:kwArgs.whitepoint
				}),
				"XYZ",
				"xyY"
			);
			var g=this.convert(
				this.adapt({
					color:this.convert({ x:xg, y:yg, Y:Yg }, "xyY", "XYZ"),
					adaptor:kwArgs.adaptor,
					source:primary.whitepoint,
					destination:kwArgs.whitepoint
				}),
				"XYZ",
				"xyY"
			);
			var b=this.convert(
				this.adapt({
					color:this.convert({ x:xb, y:yb, Y:Yb }, "xyY", "XYZ"),
					adaptor:kwArgs.adaptor,
					source:primary.whitepoint,
					destination:kwArgs.whitepoint
				}),
				"XYZ",
				"xyY"
			);
			primary=dojo.mixin(primary, {
				xr: r.x, yr: r.y, Yr: r.Y,
				xg: g.x, yg: g.y, Yg: g.Y,
				xb: b.x, yb: b.y, Yb: b.Y,
				whitepoint: kwArgs.whitepoint
			});
		}
		return dojo.mixin(primary, {
			zr: 1-primary.xr-primary.yr,
			zg: 1-primary.xg-primary.yg,
			zb: 1-primary.xb-primary.yb
		});		//	Object
	};

	this.adapt=function(/* Object */kwArgs){
		//	color is required in the form of XYZ, source whitepoint name is required.
		if(!kwArgs.color || !kwArgs.source){
			console.error("dojox.color.Colorspace::adapt: color and source arguments are required. ", kwArgs);
		}

		//	defaults
		kwArgs=dojo.mixin({
			adaptor:"Bradford",
			destination:"D65"
		}, kwArgs);

		//	adapt
		var swp = this.whitepoint(kwArgs.source);
		var dwp = this.whitepoint(kwArgs.destination);
		if(adaptors[kwArgs.adaptor]){
			var ma=adaptors[kwArgs.adaptor].ma;
			var mai=adaptors[kwArgs.adaptor].mai;
		}else{
			console.warn("dojox.color.Colorspace::adapt: the passed adaptor '", kwArgs.adaptor, "' was not found.");
		}
		var dSrc=dxm.multiply([[swp.x, swp.y, swp.z]], ma);
		var dDest=dxm.multiply([[dwp.x, dwp.y, dwp.z]], ma);
		var center=[
			[dDest[0][0]/dSrc[0][0], 0, 0],
			[0, dDest[0][1]/dSrc[0][1], 0],
			[0, 0, dDest[0][2]/dSrc[0][2]]
		];
		var m=dxm.multiply(dxm.multiply(ma, center), mai);
		var r=dxm.multiply([[ kwArgs.color.X, kwArgs.color.Y, kwArgs.color.Z ]], m)[0];
		return { X:r[0], Y:r[1], Z:r[2] };
	};

	this.matrix=function(/* String */to, /* Object */primary){
		var p=primary, wp=this.whitepoint(p.whitepoint);
		var Xr = p.xr/p.yr, Yr = 1, Zr = (1-p.xr-p.yr)/p.yr;
		var Xg = p.xg/p.yg, Yg = 1, Zg = (1-p.xg-p.yg)/p.yg;
		var Xb = p.xb/p.yb, Yb = 1, Zb = (1-p.xb-p.yb)/p.yb;

		var m1 = [[ Xr, Yr, Zr ], [ Xg, Yg, Zg ], [ Xb, Yb, Zb ]];
		var m2 = [[ wp.X, wp.Y, wp.Z ]];
		var sm = dxm.multiply(m2, dxm.inverse(m1));
		var Sr = sm[0][0], Sg = sm[0][1], Sb = sm[0][2];
		var result=[
			[Sr*Xr, Sr*Yr, Sr*Zr],
			[Sg*Xg, Sg*Yg, Sg*Zg],
			[Sb*Xb, Sb*Yb, Sb*Zb]
		];
		if(to=="RGB"){ return dxm.inverse(result); }
		return result;
	};

	this.epsilon=function(/* bool? */useApprox){
		return (useApprox || typeof(useApprox)=="undefined")? 0.008856: 216/24289;
	};
	this.kappa=function(/* bool? */useApprox){
		return (useApprox || typeof(useApprox)=="undefined")? 903.3: 24389/27;
	};

	this.convert=function(/* Object */color, /* string */from, /* string */to, /* Object? */kwArgs){
		if(converters[from] && converters[from][to]){
			return converters[from][to](color, kwArgs);
		}
		console.warn("dojox.color.Colorspace::convert: Can't convert ", color, " from ", from, " to ", to, ".");
	};
})();

//	More dcolor and dojox.color.Color extensions
dojo.mixin(dcolor, {
	fromXYZ: function(/* Object */xyz, /* Object?*/kwArgs){
		kwArgs=kwArgs||{};
		var p=dcolor.Colorspace.primaries(kwArgs);
		var m=dcolor.Colorspace.matrix("RGB", p);
		var rgb=dojox.math.matrix.multiply([[ xyz.X, xyz.Y, xyz.Z ]], m);
		var r=rgb[0][0], g=rgb[0][1], b=rgb[0][2];
		if(p.profile=="sRGB"){
			var R = (r>0.0031308)?(1.055*Math.pow(r, 1/2.4))-0.055: 12.92*r;
			var G = (g>0.0031308)?(1.055*Math.pow(g, 1/2.4))-0.055: 12.92*g;
			var B = (b>0.0031308)?(1.055*Math.pow(b, 1/2.4))-0.055: 12.92*b;
		}else{
			var R=Math.pow(r, 1/p.gamma), G=Math.pow(g, 1/p.gamma), B=Math.pow(b, 1/p.gamma);
		}
		return new dcolor.Color({ r:Math.floor(R*255), g:Math.floor(G*255), b:Math.floor(B*255) });
	}
});

dojo.extend(dcolor.Color, {
	toXYZ: function(/* Object */kwArgs){
		kwArgs=kwArgs||{};
		var p=dcolor.Colorspace.primaries(kwArgs);
		var m=dcolor.Colorspace.matrix("XYZ", p);
		var _r=this.r/255, _g=this.g/255, _b=this.b/255;
		if(p.profile=="sRGB"){
			var r=(_r>0.04045) ? Math.pow(((_r+0.055)/1.055), 2.4):_r/12.92;
			var g=(_g>0.04045) ? Math.pow(((_g+0.055)/1.055), 2.4):_g/12.92;
			var b=(_b>0.04045) ? Math.pow(((_b+0.055)/1.055), 2.4):_b/12.92;
		} else {
			var r=Math.pow(_r, p.gamma), g=Math.pow(_g, p.gamma), b=Math.pow(_b, p.gamma);
		}
		var xyz=dxm([[ r, g, b ]], m);
		return { X: xyz[0][0], Y: xyz[0][1], Z: xyz[0][2] };	//	Object
	}
});

return dcolor.Colorspace;
});
