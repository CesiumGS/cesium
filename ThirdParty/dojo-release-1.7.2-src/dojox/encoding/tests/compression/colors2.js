dojo.provide("dojox.encoding.tests.compression.colors2");

// all CSS3 colors
dojox.encoding.tests.compression.colors2 = {};

(function(){
	var n = "!mi-='%@Md%8;F\"=E5(:$@nHf!(;HYAOL),#XJKa#UHDMYQ0@q6C8='JBa#m1`YRS;3_\\P=@.(bN\\!)0d:Nar*Fo]]G`\\[X7Cb@r#pc;D3!k*8^\"bS8DAYbu'J5[`7Fh5S1e8`@1^N\"n8R:+ZQt]Ab.S>NP-jkO\"N$oQpbVbYtZl1&rSs%_;'!e8\"ij:*R!%9&P.+o0%cF&0F<\"eWn+rm!a<(02!d\\-J\\O@`K![IaPrqh6H4S!U<Nh]PS,\"!C;0W&Y]X[<[E&`1gQ?_;g\\mbQn^c!eV!05V['T@)Lio1O0QV>7CU!\"5jICR2\\X?!FilaO:$aE\"G1NIfMJ<.)1d;?OH9VU%LiGhi9=d?$EjW!BM0)1mGfg@\"os1\\E*A>+>YdjUK:P>T'7tj.UQ?<89]$:\\Li]GF*H8o*Z,o]Q_E]tq?C^%'^cfU9B9sH-^t.-R;J6P9!buNg*%$9#>Y'*n;MPc7=>*]sb&NmgKSZcd2nWt6I@SX7agi3!0)M'T3O@@/>W+I:H9?@A7tjT8':(9PG\\m@_T8Ws\\\".VLCkg7IYKZ7M3.XQqX$4V`bEQF?<#jJ>#4Z#6:ZeYffa.W#0CW3@s2*ESkiD6hN#EAhXBm5F%&U_=k*tFq@rYS/!:$=M9epZ<`=HN:X\"!CRI(`>iqTRe(S@A\"&0!Dib&)1p9P)$NZb^e+i_UHHq\\_8AYC+oiIMLj_TW=u'3Nn?c=#_6Z^s/;EY/3Z(cZ\"CaOq6g>>I+;'H>Nh`>\"-3N</&5*&\\7KQKk5tM(]O9-gi%iL^#RH+KW@$+oOOO9;*#)6$,]ge#)$j.>DnX+!(g67=pRcf38l7XNQ:_FJ,l2V)C@@A;H1dN#\\$n75qg6-:\".KQkn!?a7e\"J7C0p3Pn`]hKrG_4WG*5qo\\tH,20o2QOZljnj_lZ&C6!.u8Qu:_L$8$4.[V@`&A0J,fQL";
	var c = "nG*%[ldl.:s*t'unGiO]p\"]T._uKc;s6Io0!<7p,ih\\+ShRJ>JStLT5!7GR&s*mjUQ0nVHgtWT+!<<'!!/gi8Mn\"KLWMuisA,rU.WP,cVMZAZ8CG5^H!1>UdMZ<bAQ?nV)O%;El02G@s:JUu9d?FX[rtLXs^]/\"^Bk_9q*g$E-+sR'`n03c7rrE)Sgt_]\"s8U[Ng8,pBJ:IWM!3Q8SJ:N1>s7$&&[*;i\\9)sSDs7#O?N99:!s7#]/quHcnc)oX\\n:6&Is8VrldaQ[oORA4Ze'n?*_>g0S+L8#&cMDa@R<OITYf,Dus53nW!&DeSqXEYI!<7QL!+sKU!!(9T<R[.NgH;f^HYDgIqO0t&bf:HP)&[Dds8)cViW%uHs5'jX!.b%@k(%s^CQ9Y>V#^Na!8;DCmc^[<qj=STmb;]Es6nM<g:>I^5QAOBh4WT.i9#OiJH#TL]T8+>C#Ot='Dd6\"oV>kIMc]rOm\\!H0^qda@cKf4Kc#A2pE.F&MqYC3lIn#$sd^4r5J:Q:ef`,GO5iC#WK'r<gZiC(*p%A\"XrrAM41&q:S";
	var a = function(s){
		var n = s.length, r = [], b = [0, 0, 0, 0, 0], i, j, t, x, y, d;
		for(i = 0; i < n; i += 5){
			for(j = 0; j < 5; ++j){ b[j] = s.charCodeAt(i + j) - 33; }
			t = (((b[0] * 85 + b[1]) * 85 + b[2]) * 85 + b[3]) * 85 + b[4];
			x = t & 255; t >>>= 8; y = t & 255; t >>>= 8;
			r.push(t >>> 8, t & 255, y, x);
		}
		return r;
	};
	var B = function(f){ this.f = f; this.y = this.t = 0; };
	B.prototype.g = function(b){
		var r = 0;
		while(b){
			var w = Math.min(b, 8 - this.t), v = this.f[this.y] >>> (8 - this.t - w);
			r <<= w; r |= v & ~(~0 << w);
			if((this.t += w) == 8){ ++this.y; this.t = 0; }
			b -= w;
		}
		return r;
	};
	var D = function(n, w){
		this.c = new Array(n); this.w = w; this.p = -1;
		for(var i = 0; i < n; ++i){ this.c[i] = [i + 97]; }
	};
	D.prototype.d = function(s){
		var c = s.g(this.w), v;
		if(c < this.c.length){
			v = this.c[c];
			if(this.p >= 0){
				this.c.push(this.c[this.p].concat(v[0]));
			}
		}else{
			this.c.push([]);
			++this.w;
			return [];
		}
		this.p = c;
		return v;
	};
	var i = new B(a(n)), d = new D(27, 5), t = [];
	while(t.length < 1455){
		var v = d.d(i);
		dojo.forEach(v, function(x){ t.push(x); });
	}
	var n2 = dojo.map(t, function(x){ return String.fromCharCode(x); }).join("").split("{");
	i = a(c);
	for(var j = 0, k = 0; j < n2.length; ++j){
		dojox.encoding.tests.compression.colors2[n2[j]] = [i[k++], i[k++], i[k++]];
	}

})();
