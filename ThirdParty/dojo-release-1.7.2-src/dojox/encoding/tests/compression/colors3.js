dojo.provide("dojox.encoding.tests.compression.colors3");

// all CSS3 colors
dojox.encoding.tests.compression.colors3 = {};

(function(){
	var n = "!N!C@\",5%;!.4)1D7()4E!K!FS-!2).Q:52E`!B\"!;!)*+I!M!#&'E+9%(#!T9Q=.\"TE5F'6%$B91H/)DCQW=^&G#QY>:\"!!?*#D.57Z.]5**+0]/!G!!,X=/%2O'%1U&#W9%%86_BQU3#!N.!DA-%F>X'#9;6\"%+EK)X#A+A;+-+\"G\"T$76:L1;)'+?ENA1%L+C\\O+U+\"Q!+#,E+.E1H-[VA#\"5%O\\X)BS:%V2&2#,3I0NWE%F7?L8U!U\\\\B3C_GZ?P3N]A3\\]$)%TUK$E9EL6ZA`T%IFY$Q?/3;=Q)$QE#AQ\\11$&M!'$$XK!T?2%C7QU\"110A#/#:'U=C!7,\"=*!+BQ)%AG[)W&#CFBG\"A!/1E!5/$AU\"A/$J:*E+LQ77;%M6H/XD,H1'!)#U=&K1\"&R02U'$H5*[%Y+$3;/1'#\"-XQV8C(/GABVQQW+RS5U3QE!V<6[=YS@!0=1!:Z=93M$7W\":3;!Z0!GJM'\"QGAJ*=3(C&5I=0,6AP6H4+=:M:B)CO-D?]<,2^H-`7S<E8%#\\\\G=1ZM^B)8$9VJHI]>EB(B5N5%Z9P!8BM`FK@D!9*!ZQ]]/D1SF[%RG.D+HO(8QI.BK.RS*/C#/GJOTUU/WSTX19$R[$T#'P&L\"]V03\\_Y5_UH!?/!;\"J>YHO%8S_`2]/H`T_'%?B4?AX!.:^X!Z9E0A!!S\"5M\"A:2^?AA2R*9;!.!!&1!!E:AN)7'16,AM\"+\"Y'D0.'*Q=.%!S)!'*S)@5*$7D*9H@#U710\"MUG4,)<Q;DI95OE%9DY\"1_I4E3!2C7+/I[+\"*A0E!\"\",!>Z'!F-%15E\"\"J!#+$A0':>#G?1%8G#29I31U:2H\"I:3A<V'DC!-!RB2]:BI;>K4C&C;ZY\"J[C]HG6!3&*4K!!AP9:IA#T2\"'A%-+9]WWJ*MU3I\"MWY\")$79\"*]QZ@:[ZZ#^43G=Q;!P)E%QN3RZQ4!Y.KP\"J_8\\B/3RD#S6+YB]*&!3M6A+#2Q'9M-&DI!!";
	var c = "]0D`_OP8!0``@``5]0``^@8=`_4%!!!!`_P.!!$`CCPCJ3IKXLC(8Z[A@`]!UGE?`X^1:*8N``D=X\"1]!0``!!#,!)O,O)9,K;GJ!'1!K;GJP<>LCQ#,67MP`YQ!G4,-CQ!![::[D\\S03$W,,U^0,U^0!-\\2F!$4`R34!,``;7FJ;7FJ(J$`MC)C``LQ)IMC`Q$`X.T=_0D``^=!WK5AA)#!!)!!L@]PA)#!]0`Q`WGUT6R=3Q##```Q]/;-ZO<[``$V@0Q!``L.L>DG])#!Y0``_PL3U^04E/[1U^04`\\<\"`[\"[),+KB]\\[>YC:>YC:M-4?```A!0]!-MUS_P$G`Q$`A!!!:MWK!!$.OF84EX$<0,.R?WDO!0K;3.(-RR7&'2FQ^@`[`_4B`_3V`^[N!!#!`@8GA)!!;YYD`[5!`U5!WH$7\\OCKG0O9L_\\OWX#4`_`6`^KZT95``]$,X;$>M/$GA!#!`Q!!P)_017HBCU54_I\"S^+2A,IN8``8OI&)NQ-$!B]\\L;FL.=)#1=)#1``L[!0^`2I+UUL3-!)#!W,`9`W.(1/$1\\I,O^>[T````^@8V``]!GMUS!!!!";
	var B = function(f){ var t = this; t.f = f; t.y = t.t = 0; t.x = f.charCodeAt(0) - 33; };
	B.prototype.g = function(b){
		var r = 0, t = this;
		while(b){
			var w = Math.min(b, 6 - t.t), v = t.x >>> (6 - t.t - w);
			r <<= w; r |= v & ~(~0 << w);
			if((t.t += w) == 6){ t.x = t.f.charCodeAt(++t.y) - 33; t.t = 0; }
			b -= w;
		}
		return r;
	};
	var D = function(n, w){
		this.c = new Array(n); this.w = w; this.p = -1;
		for(var i = 0; i < n; ++i){ this.c[i] = [i + 97]; }
	};
	D.prototype.d = function(s){
		var c = s.g(this.w), t = this, v;
		if(c < t.c.length){
			v = t.c[c];
			if(t.p >= 0){
				t.c.push(t.c[t.p].concat(v[0]));
			}
		}else{
			t.c.push([]);
			++t.w;
			return [];
		}
		t.p = c;
		return v;
	};
	var i = new B(n), d = new D(27, 5), t = [];
	while(t.length < 1455){
		var v = d.d(i);
		dojo.forEach(v, function(x){ t.push(x); });
	}
	var n2 = dojo.map(t, function(x){ return String.fromCharCode(x); }).join("").split("{");
	i = new B(c);
	for(var j = 0; j < n2.length; ++j){
		dojox.encoding.tests.compression.colors3[n2[j]] = [i.g(8), i.g(8), i.g(8)];
	}
})();
