dojo.provide("dojox.string.tests.BidiEngine.BidiEngineTest");
dojo.require("dojox.string.BidiEngine");
dojo.addOnLoad(function(){
			
	var unilisrc = [
		// 0
		"abc def ghij",
		// 1
		"abc\u0020\u05d4\u05d5\u05d6\u05d7\u0020\u05d8\u05d9\u05da\u0020\u05da\u05db\u05dc\u05dd\u0020opq rstu",
		// 2
		"abc !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ def",
		// 3
		"abc !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ \u05d4\u05d5\u05d6",
		// 4
		".-= abc def /\\",
		// 5
		".-= abc \u05d4\u05d5\u05d6 /\\",
		// 6
		"abc 123",
		// 7
		"abc 123 401",
		// 8
		"abc 123 ghi",
		// 9
		"abc 123 401 ghi",
		// 10
		"abc 123 \u05d7\u05d8\u05d9",
		// 11
		"abc 123 401 \u05d7\u05d8\u05d9",
		// 12
		"abc0123",
		// 13
		"abc0123 401",
		// 14
		"abc0123ghi",
		// 15
		"abc0123 401ghi",
		// 16
		"abc0123\u05d7\u05d8\u05d9",
		// 17
		"abc0123 401\u05d7\u05d8\u05d9",
		// 18
		"abc \u05d4\u05d5\u05d6 123",
		// 19
		"abc \u05d4\u05d5\u05d6 123 401",
		// 20
		"abc \u05d4\u05d5\u05d6 123 ghi",
		// 21
		"abc \u05d4\u05d5\u05d6 123 401 ghi",
		// 22
		"abc \u05d4\u05d5\u05d6 123 \u05d7\u05d8\u05d9",
		// 23
		"abc \u05d4\u05d5\u05d6 123 401 \u05d7\u05d8\u05d9",
		// 24
		"abc \u05d4\u05d5\u05d60123",
		// 25
		"abc \u05d4\u05d5\u05d60123 401",
		// 26
		"abc \u05d4\u05d5\u05d601234ghi",
		// 27
		"abc \u05d4\u05d5\u05d60123 401ghi",
		// 28
		"abc \u05d4\u05d5\u05d601234\u05d7\u05d8\u05d9",
		// 29
		"abc \u05d4\u05d5\u05d60123 401\u05d7\u05d8\u05d9",
		// 30
		"123 401 abc def",
		// 31
		"abc(\u05d4\u05d5\u05d6)\u05d7\u05d8\u05d9",
		// 32
		"abc(\u05d4\u05d5\u05d6)ghi",
		// 33
		"abc(def)\u05d7\u05d8\u05d9",
		// 34
		"abc(def)ghi",
		// 35
		"abc\u05bbde\u05b8fg",
		// 36
		"abc\u05bb\u05d4\u05d5\u05b8fg",
		// 37
		"abc \u05d4\u05d5\u05d6\u05d7	\u05d8\u05d9\u05da klm",
		// 38
		"abc \u05d4\u05d5\u05d6\u05d7	hij klm",
		// 39
		"abc defg	\u05d8\u05d9\u05da klm",
		// 40
		"abc defg	hij klm",
		// 41
		"abc \u05d4\u05d5\u05d6\u05d7    	  \u05d8\u05d9\u05da klm",
		// 42
		"abc \u05d4\u05d5\u05d6\u05d7    	  hij klm",
		// 43
		"abc defg    	  \u05d8\u05d9\u05da klm",
		// 44
		"abc defg    	  hij klm",
		// 45
		"abc \u05d4\u05d5\u05d6\u05d7 ._-	=\u005c\u05d8\u05d9\u05da klm",
		// 46
		"abc \u05d4\u05d5\u05d6\u05d7 ._-	=\hij klm",
		// 47
		"abc defg ._-	=\u005c\u05d8\u05d9\u05da klm",
		// 48
		"abc defg ._-	=\hij klm",
		// 49
		"abc \u05d4\u05d5\u05d6\u05d7 ._-    	  =\u005c\u05d8\u05d9\u05da klm",
		// 50
		"abc \u05d4\u05d5\u05d6\u05d7 ._-    	  =\hij klm",
		// 51
		"abc defg ._-    	  =\u005c\u05d8\u05d9\u05da klm",
		// 52
		"abc defg ._-    	  =\hij klm",
		// 53
		"   abc \u05d4\u05d5\u05d6 ghi",
		// 54
		".- abc \u05d4\u05d5\u05d6 ghi",
		// 55
		"12 abc \u05d4\u05d5\u05d6 ghi",
		// 56
		"/* 012$ % 3401$ < = 12 */"
		];

	var uniliout = [
		// 0
		"abc def ghij",
		// 1
		"abc \u05dd\u05dc\u05db\u05da\u0020\u05da\u05d9\u05d8\u0020\u05d7\u05d6\u05d5\u05d4 opq rstu",
		// 2
		"abc !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ def",
		// 3
		"abc !\"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ \u05d6\u05d5\u05d4",
		// 4
		".-= abc def /\\",
		// 5
		".-= abc \u05d6\u05d5\u05d4 /\\",
		// 6
		"abc 123",
		// 7
		"abc 123 401",
		// 8
		"abc 123 ghi",
		// 9
		"abc 123 401 ghi",
		// 10
		"abc 123 \u05d9\u05d8\u05d7",
		// 11
		"abc 123 401 \u05d9\u05d8\u05d7",
		// 12
		"abc0123",
		// 13
		"abc0123 401",
		// 14
		"abc0123ghi",
		// 15
		"abc0123 401ghi",
		// 16
		"abc0123\u05d9\u05d8\u05d7",
		// 17
		"abc0123 401\u05d9\u05d8\u05d7",
		// 18
		"abc 123 \u05d6\u05d5\u05d4",
		// 19
		"abc 401 123 \u05d6\u05d5\u05d4",
		// 20
		"abc 123 \u05d6\u05d5\u05d4 ghi",
		// 21
		"abc 401 123 \u05d6\u05d5\u05d4 ghi",
		// 22
		"abc \u05d9\u05d8\u05d7 123 \u05d6\u05d5\u05d4",
		// 23
		"abc \u05d9\u05d8\u05d7 401 123 \u05d6\u05d5\u05d4",
		// 24
		"abc 0123\u05d6\u05d5\u05d4",
		// 25
		"abc 401 0123\u05d6\u05d5\u05d4",
		// 26
		"abc 01234\u05d6\u05d5\u05d4ghi",
		// 27
		"abc 401 0123\u05d6\u05d5\u05d4ghi",
		// 28
		"abc \u05d9\u05d8\u05d701234\u05d6\u05d5\u05d4",
		// 29
		"abc \u05d9\u05d8\u05d7401 0123\u05d6\u05d5\u05d4",
		// 30
		"123 401 abc def",
		// 31
		"abc(\u05d9\u05d8\u05d7(\u05d6\u05d5\u05d4",
		// 32
		"abc(\u05d6\u05d5\u05d4)ghi",
		// 33
		"abc(def)\u05d9\u05d8\u05d7",
		// 34
		"abc(def)ghi",
		// 35
		"abc\u05bbde\u05b8fg",
		// 36
		"abc\u05bb\u05b8\u05d5\u05d4fg",
		// 37
		"abc \u05d7\u05d6\u05d5\u05d4	\u05da\u05d9\u05d8 klm",
		// 38
		"abc \u05d7\u05d6\u05d5\u05d4	hij klm",
		// 39
		"abc defg	\u05da\u05d9\u05d8 klm",
		// 40
		"abc defg	hij klm",
		// 41
		"abc \u05d7\u05d6\u05d5\u05d4    	\u05da\u05d9\u05d8   klm",
		// 42
		"abc \u05d7\u05d6\u05d5\u05d4    	  hij klm",
		// 43
		"abc defg    	  \u05da\u05d9\u05d8 klm",
		// 44
		"abc defg    	  hij klm",
		// 45
		"abc -_. \u05d7\u05d6\u05d5\u05d4	\u05da\u05d9\u05d8\u005c= klm",
		// 46
		"abc \u05d7\u05d6\u05d5\u05d4 ._-	=\hij klm",
		// 47
		"abc defg ._-	=\u005c\u05da\u05d9\u05d8 klm",
		// 48
		"abc defg ._-	=\hij klm",
		// 49
		"abc -_. \u05d7\u05d6\u05d5\u05d4    	\u05da\u05d9\u05d8\u005c=   klm",
		// 50
		"abc \u05d7\u05d6\u05d5\u05d4 ._-    	  =\hij klm",
		// 51
		"abc defg ._-    	  =\u005c\u05da\u05d9\u05d8 klm",
		// 52
		"abc defg ._-    	  =\hij klm",
		// 53
		"   abc \u05d6\u05d5\u05d4 ghi",
		// 54
		".- abc \u05d6\u05d5\u05d4 ghi",
		// 55
		"12 abc \u05d6\u05d5\u05d4 ghi",
		// 56
		"/* 012$ % 3401$ < = 12 */"
		];
	var unirisrc = [
		// 0
		"\u05d1\u05d2\u05d3\u0020\u05d4\u05d5\u05d6\u0020\u05d7\u05d8\u05d9\u05da",
		// 1
		"\u05d1\u05d2\u05d3 defg hij klmn \u05d6\u05d7\u05d8\u0020\u05d9\u05da\u05db\u05dc",
		// 2
		"\u05d1\u05d2\u05d3 #123 $234 %340 +401 -012 \u05d4\u05d5\u05d6",
		// 3
		"\u05d1\u05d2\u05d3 123# 234$ 340% 401+ 012- \u05d4\u05d5\u05d6",
		// 4
		"\u05d1\u05d2\u05d3 123#234$340%401+012-024 \u05d4\u05d5\u05d6",
		// 5
		"\u05d1\u05d2\u05d3 123-",
		// 6
		"\u05d9\u05d6 20 + 14 = 34?",
		// 7
		"\u05d1\u05d2\u05d3 123.",
		// 8
		"\u05d1\u05d2\u05d3 12,340,123.40:13:24/30/41 \u05d4\u05d5\u05d6",
		// 9
		"\u05d1\u05d2\u05d3 -12,340.13$ \u05d4\u05d5\u05d6",
		// 10
		"\u05d9\u0020\u05d3\u05dc\u05d1\u05d9\u05dd: 4.4-0.4=4.0, ok?",
		// 11
		"\u05d1\u05d2\u05d3 ,123 .234 :340 /401 \u05d4\u05d5\u05d6",
		// 12
		"\u05d1\u05d2\u05d3 123, 234. 340: 401/ \u05d4\u05d5\u05d6",
		// 13
		"\u05d1\u05d2\u05d3 123..40 \u05d4\u05d5\u05d6",
		// 14
		"\u05d1\u05d2\u05d3 123.,40 \u05d4\u05d5\u05d6",
		// 15
		"\u05d1\u05d2\u05d3 123/.40 \u05d4\u05d5\u05d6",
		// 16
		"\u05d1\u05d2\u05d3 ---123$$ \u05d4\u05d5\u05d6",
		// 17
		"\u05d1\u05d2\u05d3 +-123#$% \u05d4\u05d5\u05d6",
		// 18
		"\u05d1\u05d2\u05d3 123###234$%340%%%401+--012-++130 \u05d4\u05d5\u05d6",
		// 19
		"\u05d1\u05d2\u05d3 !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ \u05d4\u05d5\u05d6",
		// 20
		"\u05d1\u05d2\u05d3 !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ def",
		// 21
		".-= \u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6 /\\",
		// 22
		".-= \u05d1\u05d2\u05d3 def /\\",
		// 23
		"\u05d1\u05d2\u05d3 123",
		// 24
		"\u05d1\u05d2\u05d3 123 401",
		// 25
		"\u05d1\u05d2\u05d3 123 \u05d7\u05d8\u05d9",
		// 26
		"\u05d1\u05d2\u05d3 123 401 \u05d7\u05d8\u05d9",
		// 27
		"\u05d1\u05d2\u05d3 123 ghi",
		// 28
		"\u05d1\u05d2\u05d3 123 401 ghi",
		// 29
		"\u05d1\u05d2\u05d30123",
		// 30
		"\u05d1\u05d2\u05d30123 401",
		// 31
		"\u05d1\u05d2\u05d301234\u05d7\u05d8\u05d9",
		// 32
		"\u05d1\u05d2\u05d30123 401\u05d7\u05d8\u05d9",
		// 33
		"\u05d1\u05d2\u05d301234ghi",
		// 34
		"\u05d1\u05d2\u05d30123 401ghi",
		// 35
		"\u05d1\u05d2\u05d3 def 123",
		// 36
		"\u05d1\u05d2\u05d3 def 123 401",
		// 37
		"\u05d1\u05d2\u05d3 def 123 \u05d7\u05d8\u05d9",
		// 38
		"\u05d1\u05d2\u05d3 def 123 401 \u05d7\u05d8\u05d9",
		// 39
		"\u05d1\u05d2\u05d3 def 123 ghi",
		// 40
		"\u05d1\u05d2\u05d3 def 123 401 ghi",
		// 41
		"\u05d1\u05d2\u05d3 def123",
		// 42
		"\u05d1\u05d2\u05d3 def0123 401",
		// 43
		"\u05d1\u05d2\u05d3 def01234\u05d7\u05d8\u05d9",
		// 44
		"\u05d1\u05d2\u05d3 def0123 401\u05d7\u05d8\u05d9",
		// 45
		"\u05d1\u05d2\u05d3 def01234ghi",
		// 46
		"\u05d1\u05d2\u05d3 def0123 401ghi",
		// 47
		"123 401 \u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6",
		// 48
		"\u05d1\u05d2\u05d3(\u05d4\u05d5\u05d6)\u05d7\u05d8\u05d9",
		// 49
		"\u05d1\u05d2\u05d3(\u05d4\u05d5\u05d6)ghi",
		// 50
		"\u05d1\u05d2\u05d3(def)\u05d7\u05d8\u05d9",
		// 51
		"\u05d1\u05d2\u05d3(def)ghi",
		// 52
		"\u05d1\u05d2\u05d3 (\u05d4\u05d5\u05d6) [\u05d7\u05d8\u05d9] {\u05da\u05db\u05dc} <\u05dd\u05d1> \u05d2\u05d3\u05d4",
		// 53
		"\u05d1\u05d2\u05d3\u05bb\u05d4\u05d5\u05b8\u05d6\u05d7",
		// 54
		"\u05d1\u05d2\u05d3\u05bb\u0064\u05d5\u05b8\u05d6\u05d7",
		// 55
		"\u05bb\u05d4\u05d5",
		// 56
		"\u05d1\u05d2\u05d3 defg	hij \u05db\u05dc\u05dd",
		// 57
		"\u05d1\u05d2\u05d3 defg	\u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 58
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7	hij \u05db\u05dc\u05dd",
		// 59
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7	\u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 60
		"\u05d1\u05d2\u05d3 defg    	  hij \u05db\u05dc\u05dd",
		// 61
		"\u05d1\u05d2\u05d3 defg    	  \u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 62
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7    	  hij \u05db\u05dc\u05dd",
		// 63
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7    	  \u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 64
		"\u05d1\u05d2\u05d3 defg ._-	=\hij \u05db\u05dc\u05dd",
		// 65
		"\u05d1\u05d2\u05d3 defg ._-	=\u005c\u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 66
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7 ._-	=\hij \u05db\u05dc\u05dd",
		// 67
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7 ._-	=\u005c\u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 68
		"\u05d1\u05d2\u05d3 defg ._-    	  =\hij \u05db\u05dc\u05dd",
		// 69
		"\u05d1\u05d2\u05d3 defg ._-    	  =\u005c\u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 70
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7 ._-    	  =\hij \u05db\u05dc\u05dd",
		// 71
		"\u05d1\u05d2\u05d3 \u05d4\u05d5\u05d6\u05d7 ._-    	  =\u005c\u05d8\u05d9\u05da \u05db\u05dc\u05dd",
		// 72
		"   \u05d1\u05d2\u05d3 def \u05d7\u05d8\u05d9",
		// 73
		".- \u05d1\u05d2\u05d3 def \u05d7\u05d8\u05d9",
		// 74
		"12 \u05d1\u05d2\u05d3 def \u05d7\u05d8\u05d9",
		// 75
		"1. \u05d1\u05d2\u05d3 def \u05d7\u05d8\u05d9",
		// 76
		"1) \u05d1\u05d2\u05d3 def \u05d7\u05d8\u05d9",
		// 77
		".3 \u05d1\u05d2\u05d3 def \u05d7\u05d8\u05d9"
	];
	var uniriout = [
		// 0
		"\u05da\u05d9\u05d8\u05d7\u0020\u05d6\u05d5\u05d4\u0020\u05d3\u05d2\u05d1",
		// 1
		"\u05dc\u05db\u05da\u05d9 \u05d8\u05d7\u05d6 defg hij klmn \u05d3\u05d2\u05d1",
		// 2
		"\u05d6\u05d5\u05d4 012- 401+ %340 $234 #123 \u05d3\u05d2\u05d1",
		// 3
		"\u05d6\u05d5\u05d4 -012 +401 340% 234$ 123# \u05d3\u05d2\u05d1",
		// 4
		"\u05d6\u05d5\u05d4 123#234$340%401+012-024 \u05d3\u05d2\u05d1",
		// 5
		"-123 \u05d3\u05d2\u05d1",
		// 6
		"?34 = 14 + 20 \u05d6\u05d9",
		// 7
		".123 \u05d3\u05d2\u05d1",
		// 8
		"\u05d6\u05d5\u05d4 12,340,123.40:13:24/30/41 \u05d3\u05d2\u05d1",
		// 9
		"\u05d6\u05d5\u05d4 12,340.13$- \u05d3\u05d2\u05d1",
		// 10
		"?ok ,4.0=4.4-0.4 :\u05dd\u05d9\u05d1\u05dc\u05d3\u0020\u05d9",
		// 11
		"\u05d6\u05d5\u05d4 401/ 340: 234. 123, \u05d3\u05d2\u05d1",
		// 12
		"\u05d6\u05d5\u05d4 /401 :340 .234 ,123 \u05d3\u05d2\u05d1",
		// 13
		"\u05d6\u05d5\u05d4 40..123 \u05d3\u05d2\u05d1",
		// 14
		"\u05d6\u05d5\u05d4 40,.123 \u05d3\u05d2\u05d1",
		// 15
		"\u05d6\u05d5\u05d4 40./123 \u05d3\u05d2\u05d1",
		// 16
		"\u05d6\u05d5\u05d4 123$$--- \u05d3\u05d2\u05d1",
		// 17
		"\u05d6\u05d5\u05d4 123#$%-+ \u05d3\u05d2\u05d1",
		// 18
		"\u05d6\u05d5\u05d4 130++-012--+123###234$%340%%%401 \u05d3\u05d2\u05d1",
		// 19
		"\u05d6\u05d5\u05d4 ~{|}`_^[\\]@?<=>;:/.-,+*()'&%$#\"! \u05d3\u05d2\u05d1",
		// 20
		"def ~{|}`_^[\\]@?<=>;:/.-,+*()'&%$#\"! \u05d3\u05d2\u05d1",
		// 21
		"\\/ \u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1 =-.",
		// 22
		"\\/ def \u05d3\u05d2\u05d1 =-.",
		// 23
		"123 \u05d3\u05d2\u05d1",
		// 24
		"401 123 \u05d3\u05d2\u05d1",
		// 25
		"\u05d9\u05d8\u05d7 123 \u05d3\u05d2\u05d1",
		// 26
		"\u05d9\u05d8\u05d7 401 123 \u05d3\u05d2\u05d1",
		// 27
		"ghi 123 \u05d3\u05d2\u05d1",
		// 28
		"ghi 401 123 \u05d3\u05d2\u05d1",
		// 29
		"0123\u05d3\u05d2\u05d1",
		// 30
		"401 0123\u05d3\u05d2\u05d1",
		// 31
		"\u05d9\u05d8\u05d701234\u05d3\u05d2\u05d1",
		// 32
		"\u05d9\u05d8\u05d7401 0123\u05d3\u05d2\u05d1",
		// 33
		"01234ghi\u05d3\u05d2\u05d1",
		// 34
		"401ghi 0123\u05d3\u05d2\u05d1",
		// 35
		"def 123 \u05d3\u05d2\u05d1",
		// 36
		"def 123 401 \u05d3\u05d2\u05d1",
		// 37
		"\u05d9\u05d8\u05d7 def 123 \u05d3\u05d2\u05d1",
		// 38
		"\u05d9\u05d8\u05d7 def 123 401 \u05d3\u05d2\u05d1",
		// 39
		"def 123 ghi \u05d3\u05d2\u05d1",
		// 40
		"def 123 401 ghi \u05d3\u05d2\u05d1",
		// 41
		"def123 \u05d3\u05d2\u05d1",
		// 42
		"def0123 401 \u05d3\u05d2\u05d1",
		// 43
		"\u05d9\u05d8\u05d7def01234 \u05d3\u05d2\u05d1",
		// 44
		"\u05d9\u05d8\u05d7def0123 401 \u05d3\u05d2\u05d1",
		// 45
		"def01234ghi \u05d3\u05d2\u05d1",
		// 46
		"def0123 401ghi \u05d3\u05d2\u05d1",
		// 47
		"\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1 401 123",
		// 48
		"\u05d9\u05d8\u05d7(\u05d6\u05d5\u05d4)\u05d3\u05d2\u05d1",
		// 49
		"ghi(\u05d6\u05d5\u05d4)\u05d3\u05d2\u05d1",
		// 50
		"\u05d9\u05d8\u05d7(def)\u05d3\u05d2\u05d1",
		// 51
		"def)ghi)\u05d3\u05d2\u05d1",
		// 52
		"\u05d4\u05d3\u05d2 <\u05d1\u05dd> {\u05dc\u05db\u05da} [\u05d9\u05d8\u05d7] (\u05d6\u05d5\u05d4) \u05d3\u05d2\u05d1",
		// 53
		"\u05d7\u05d6\u05b8\u05d5\u05d4\u05bb\u05d3\u05d2\u05d1",
		// 54
		"\u05d7\u05d6\u05b8\u05d5\u0064\u05bb\u05d3\u05d2\u05d1",
		// 55
		"\u05d5\u05d4\u05bb",
		// 56
		"\u05dd\u05dc\u05db hij	defg \u05d3\u05d2\u05d1",
		// 57
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8	defg \u05d3\u05d2\u05d1",
		// 58
		"\u05dd\u05dc\u05db hij	\u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 59
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8	\u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 60
		"\u05dd\u05dc\u05db   hij	    defg \u05d3\u05d2\u05d1",
		// 61
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8  	    defg \u05d3\u05d2\u05d1",
		// 62
		"\u05dd\u05dc\u05db hij  	    \u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 63
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8  	    \u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 64
		"\u05dd\u05dc\u05db =\hij	defg ._- \u05d3\u05d2\u05d1",
		// 65
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8\u005c=	-_. defg \u05d3\u05d2\u05d1",
		// 66
		"\u05dd\u05dc\u05db hij\=	-_. \u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 67
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8\u005c=	-_. \u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 68
		"\u05dd\u05dc\u05db   =\hij	    defg ._- \u05d3\u05d2\u05d1",
		// 69
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8\u005c=  	    -_. defg \u05d3\u05d2\u05d1",
		// 70
		"\u05dd\u05dc\u05db hij\=  	    -_. \u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 71
		"\u05dd\u05dc\u05db \u05da\u05d9\u05d8\u005c=  	    -_. \u05d7\u05d6\u05d5\u05d4 \u05d3\u05d2\u05d1",
		// 72
		"\u05d9\u05d8\u05d7 def \u05d3\u05d2\u05d1   ",
		// 73
		"\u05d9\u05d8\u05d7 def \u05d3\u05d2\u05d1 -.",
		// 74
		"\u05d9\u05d8\u05d7 def \u05d3\u05d2\u05d1 12",
		// 75
		"\u05d9\u05d8\u05d7 def \u05d3\u05d2\u05d1 .1",
		// 76
		"\u05d9\u05d8\u05d7 def \u05d3\u05d2\u05d1 (1",
		// 77
		"\u05d9\u05d8\u05d7 def \u05d3\u05d2\u05d1 3."
	];
			
	var unilicrs = [
	    // 0
	    "jihg fed cba",
		// 1
		"utsr qpo \u05dd\u05dc\u05db\u05da\u0020\u05da\u05d9\u05d8\u0020\u05d7\u05d6\u05d5\u05d4 cba",
		// 2
		"fed ~}|{`_^]\[@?>=<;:/.-,+*)('&%$#\"! cba",
		// 3
		"\u05d6\u05d5\u05d4 ~}|{`_^]\[@?>=<;:/.-,+*)('&%$#\"! cba",
		// 4
		"\\/ fed cba =-.",
		// 5
		"\\/ \u05d6\u05d5\u05d4 cba =-.",
		// 6
		"321 cba",
		// 7
		"104 321 cba",
		// 8
		"ihg 321 cba",
		// 9
		"ihg 104 321 cba",
		// 10
		"\u05d9\u05d8\u05d7 321 cba",
		// 11
		"\u05d9\u05d8\u05d7 104 321 cba",
		// 12
		"3210cba",
		// 13
		"104 3210cba",
		// 14
		"ihg3210cba",
		// 15
		"ihg104 3210cba",
		// 16
		"\u05d9\u05d8\u05d73210cba",
		// 17
		"\u05d9\u05d8\u05d7104 3210cba",
		// 18
		"321 \u05d6\u05d5\u05d4 cba",
		// 19
		"104 321 \u05d6\u05d5\u05d4 cba",
		// 20
		"ihg 321 \u05d6\u05d5\u05d4 cba",
		// 21
		"ihg 104 321 \u05d6\u05d5\u05d4 cba",
		// 22
		"\u05d9\u05d8\u05d7 321 \u05d6\u05d5\u05d4 cba",
		// 23
		"\u05d9\u05d8\u05d7 104 321 \u05d6\u05d5\u05d4 cba",
		// 24
		"3210\u05d6\u05d5\u05d4 cba",
		// 25
		"104 3210\u05d6\u05d5\u05d4 cba",
		// 26
		"ihg43210\u05d6\u05d5\u05d4 cba",
		// 27
		"ihg104 3210\u05d6\u05d5\u05d4 cba",
		// 28
		"\u05d9\u05d8\u05d743210\u05d6\u05d5\u05d4 cba",
		// 29
		"\u05d9\u05d8\u05d7104 3210\u05d6\u05d5\u05d4 cba",
		// 30
		"fed cba 104 321",
		// 31
		"\u05d9\u05d8\u05d7)\u05d6\u05d5\u05d4(cba",
		// 32
		"ihg)\u05d6\u05d5\u05d4(cba",
		// 33
		"\u05d9\u05d8\u05d7)fed(cba",
		// 34
		"ihg)fed(cba",
		// 35
		"gf\u05b8ed\u05bbcba",
		// 36
		"gf\u05b8\u05d5\u05d4\u05bbcba",
		// 37
		"mlk \u05da\u05d9\u05d8	\u05d7\u05d6\u05d5\u05d4 cba",
		// 38
		"mlk jih	\u05d7\u05d6\u05d5\u05d4 cba",
		// 39
		"mlk \u05da\u05d9\u05d8	gfed cba",
		// 40
		"mlk jih	gfed cba",
		// 41
		"mlk \u05da\u05d9\u05d8  	    \u05d7\u05d6\u05d5\u05d4 cba",
		// 42
		"mlk jih  	    \u05d7\u05d6\u05d5\u05d4 cba",
		// 43
		"mlk \u05da\u05d9\u05d8  	    gfed cba",
		// 44
		"mlk jih  	    gfed cba",
		// 45
		"mlk \u05da\u05d9\u05d8\u005c=	-_. \u05d7\u05d6\u05d5\u05d4 cba",
		// 46
		"mlk jih\=	-_. \u05d7\u05d6\u05d5\u05d4 cba",
		// 47
		"mlk \u05da\u05d9\u05d8\u005c=	-_. gfed cba",
		// 48
		"mlk jih\=	-_. gfed cba",
		// 49
		"mlk \u05da\u05d9\u05d8\u005c=  	    -_. \u05d7\u05d6\u05d5\u05d4 cba",
		// 50
		"mlk jih\=  	    -_. \u05d7\u05d6\u05d5\u05d4 cba",
		// 51
		"mlk \u05da\u05d9\u05d8\u005c=  	    -_. gfed cba",
		// 52
		"mlk jih\=  	    -_. gfed cba",
		// 53
		"ihg \u05d6\u05d5\u05d4 cba   ",
		// 54
		"ihg \u05d6\u05d5\u05d4 cba -.",
		// 55
		"ihg \u05d6\u05d5\u05d4 cba 21",
		// 56
		"/* 21 = < $1043 % $210 */"
	];
	var allcases = [
	    // 0
		"*** .-=",
	    // 1
		"=-. ***",
	    // 2
		"=-. ABC \u05d0\u05d1\u05d2",
	    // 3
		"ABC DEF \u05d0\u05d1\u05d2",
	    // 4
		"ABC \u05d0\u05d1\u05d2 DEF",
	    // 5
		"\u05d0(\u05d1)\u05d2 ABC \u05d3\u05d4\u05d5",
	    // 6
		"\u05d0\u05d1\u05d2 A(B)C \u05d3\u05d4\u05d5",
	    // 7
		"\u05d0\u05d1\u05d2 ABC DEF",
	    // 8
		"\u05d0\u05d1\u05d2 ABC \u05d3\u05d4\u05d5",
	    // 9
		"\u05d1\u05d2\u05d3 #123 $234 %340 +401 -012 \u05d4\u05d5\u05d6",
	    // 10
		"\u05d0\u05d1\u05d2 ABC .-=",
	    // 11
		"\u05d0\u05d1\u05d2 ABC \u05d3(\u05d4)\u05d5",
	    // 12
		"ABC 123 \u05d0\u05d1\u05d2\u05d3",
	    // 13
		"\u05d0\u05d1\u05d2\u05d3 123 DEF"
	];
		
	var allinvrs  = [
   	    // 0
		"=-. ***",
	    // 1
		"*** .-=",
	    // 2
		"\u05d2\u05d1\u05d0 CBA .-=",
	    // 3
		"\u05d2\u05d1\u05d0 FED CBA",
	    // 4
		"FED \u05d2\u05d1\u05d0 CBA",
	    // 5
		"\u05d5\u05d4\u05d3 CBA \u05d2)\u05d1(\u05d0",
	    // 6
		"\u05d5\u05d4\u05d3 C)B(A \u05d2\u05d1\u05d0",
	    // 7
		"FED CBA \u05d2\u05d1\u05d0",
	    // 8
		"\u05d5\u05d4\u05d3 CBA \u05d2\u05d1\u05d0",
	    // 9
		"\u05d6\u05d5\u05d4 210- 104+ 043% 432$ 321# \u05d3\u05d2\u05d1",
	    // 10
		"=-. CBA \u05d2\u05d1\u05d0",
	    // 11
		"\u05d5)\u05d4(\u05d3 CBA \u05d2\u05d1\u05d0",
	    // 12
		"\u05d3\u05d2\u05d1\u05d0 321 CBA",
	    // 13
		"FED 321 \u05d3\u05d2\u05d1\u05d0"
	];	
	var il2vlmdl = [
   	    // 0
		"*** .-=",
	    // 1
		"=-. ***",
	    // 2
		"=-. ABC \u05d2\u05d1\u05d0",
	    // 3
		"ABC DEF \u05d2\u05d1\u05d0",
	    // 4
		"ABC \u05d2\u05d1\u05d0 DEF",
	    // 5
		"\u05d2(\u05d1)\u05d0 ABC \u05d5\u05d4\u05d3",
	    // 6
		"\u05d2\u05d1\u05d0 A(B)C \u05d5\u05d4\u05d3",
	    // 7
		"\u05d2\u05d1\u05d0 ABC DEF",
	    // 8
		"\u05d2\u05d1\u05d0 ABC \u05d5\u05d4\u05d3",
	    // 9
		"\u05d6\u05d5\u05d4 012- 401+ %340 $234 #123 \u05d3\u05d2\u05d1",
	    // 10
		"\u05d2\u05d1\u05d0 ABC .-=",
	    // 11
		"\u05d2\u05d1\u05d0 ABC \u05d5(\u05d4)\u05d3",
	    // 12
		"ABC 123 \u05d3\u05d2\u05d1\u05d0",
	    // 13
		"123 \u05d3\u05d2\u05d1\u05d0 DEF"
	];
	var ir2vlmdl = [
   	    // 0
		"=-. ***",
	    // 1
		"*** .-=",
	    // 2
		"\u05d2\u05d1\u05d0 ABC .-=",
	    // 3
		"\u05d2\u05d1\u05d0 ABC DEF",
	    // 4
		"DEF \u05d2\u05d1\u05d0 ABC",
	    // 5
		"\u05d5\u05d4\u05d3 ABC \u05d2(\u05d1)\u05d0",
	    // 6
		"\u05d5\u05d4\u05d3 A(B)C \u05d2\u05d1\u05d0",
	    // 7
		"ABC DEF \u05d2\u05d1\u05d0",
	    // 8
		"\u05d5\u05d4\u05d3 ABC \u05d2\u05d1\u05d0",
	    // 9
		"\u05d6\u05d5\u05d4 012- 401+ %340 $234 #123 \u05d3\u05d2\u05d1",
	    // 10
		"=-. ABC \u05d2\u05d1\u05d0",
	    // 11
		"\u05d5(\u05d4)\u05d3 ABC \u05d2\u05d1\u05d0",
	    // 12
		"\u05d3\u05d2\u05d1\u05d0 ABC 123",
	    // 13
		"DEF 123 \u05d3\u05d2\u05d1\u05d0"
	];
	var il2vrmdl = [
   	    // 0
		"=-. ***",
	    // 1
		"*** .-=",
	    // 2
		"\u05d0\u05d1\u05d2 CBA .-=",
	    // 3
		"\u05d0\u05d1\u05d2 FED CBA",
	    // 4
		"FED \u05d0\u05d1\u05d2 CBA",
	    // 5
		"\u05d3\u05d4\u05d5 CBA \u05d0)\u05d1(\u05d2",
	    // 6
		"\u05d3\u05d4\u05d5 C)B(A \u05d0\u05d1\u05d2",
	    // 7
		"FED CBA \u05d0\u05d1\u05d2",
	    // 8
		"\u05d3\u05d4\u05d5 CBA \u05d0\u05d1\u05d2",
	    // 9
		"\u05d1\u05d2\u05d3 321# 432$ 043% +104 -210 \u05d4\u05d5\u05d6",
	    // 10
		"=-. CBA \u05d0\u05d1\u05d2",
	    // 11
		"\u05d3)\u05d4(\u05d5 CBA \u05d0\u05d1\u05d2",
	    // 12
		"\u05d0\u05d1\u05d2\u05d3 321 CBA",
	    // 13
		"FED \u05d0\u05d1\u05d2\u05d3 321"
	];
	var ir2vrmdl = [
   	    // 0
		"*** .-=",
	    // 1
		"=-. ***",
	    // 2
		"=-. CBA \u05d0\u05d1\u05d2",
	    // 3
		"FED CBA \u05d0\u05d1\u05d2",
	    // 4
		"CBA \u05d0\u05d1\u05d2 FED",
	    // 5
		"\u05d0)\u05d1(\u05d2 CBA \u05d3\u05d4\u05d5",
	    // 6
		"\u05d0\u05d1\u05d2 C)B(A \u05d3\u05d4\u05d5",
	    // 7
		"\u05d0\u05d1\u05d2 FED CBA",
	    // 8
		"\u05d0\u05d1\u05d2 CBA \u05d3\u05d4\u05d5",
	    // 9
		"\u05d1\u05d2\u05d3 321# 432$ 043% +104 -210 \u05d4\u05d5\u05d6",
	    // 10
		"\u05d0\u05d1\u05d2 CBA .-=",
	    // 11
		"\u05d0\u05d1\u05d2 CBA \u05d3)\u05d4(\u05d5",
	    // 12
		"321 CBA \u05d0\u05d1\u05d2\u05d3",
	    // 13
		"\u05d0\u05d1\u05d2\u05d3 321 FED"
	];	
	var vr2ilmdl = [
   	    // 0
		"=-. ***",
	    // 1
		"*** .-=",
	    // 2
		"\u05d0\u05d1\u05d2 CBA .-=",
	    // 3
		"\u05d0\u05d1\u05d2 FED CBA",
	    // 4
		"FED \u05d0\u05d1\u05d2 CBA",
	    // 5
		"\u05d3\u05d4\u05d5 CBA \u05d0)\u05d1(\u05d2",
	    // 6
		"\u05d3\u05d4\u05d5 C)B(A \u05d0\u05d1\u05d2",
	    // 7
		"FED CBA \u05d0\u05d1\u05d2",
	    // 8
		"\u05d3\u05d4\u05d5 CBA \u05d0\u05d1\u05d2",
	    // 9
		"\u05d1\u05d2\u05d3 321# 432$ 043% +104 -210 \u05d4\u05d5\u05d6",
	    // 10
		"=-. CBA \u05d0\u05d1\u05d2",
	    // 11
		"\u05d3)\u05d4(\u05d5 CBA \u05d0\u05d1\u05d2",
	    // 12
		"321 \u05d0\u05d1\u05d2\u05d3 CBA",
	    // 13
		"FED 321 \u05d0\u05d1\u05d2\u05d3"
	];
	var vl2irmdl = [
   	    // 0
		"=-. ***",
	    // 1
		"*** .-=",
	    // 2
		"\u05d2\u05d1\u05d0 ABC .-=",
	    // 3
		"\u05d2\u05d1\u05d0 ABC DEF",
	    // 4
		"DEF \u05d2\u05d1\u05d0 ABC",
	    // 5
		"\u05d5\u05d4\u05d3 ABC \u05d2(\u05d1)\u05d0",
	    // 6
		"\u05d5\u05d4\u05d3 A(B)C \u05d2\u05d1\u05d0",
	    // 7
		"ABC DEF \u05d2\u05d1\u05d0",
	    // 8
		"\u05d5\u05d4\u05d3 ABC \u05d2\u05d1\u05d0",
	    // 9
		"\u05d6\u05d5\u05d4 012- 401+ %340 $234 #123 \u05d3\u05d2\u05d1",
	    // 10
		"=-. ABC \u05d2\u05d1\u05d0",
	    // 11
		"\u05d5(\u05d4)\u05d3 ABC \u05d2\u05d1\u05d0",
	    // 12
		"\u05d3\u05d2\u05d1\u05d0 123 ABC",
	    // 13
		"123 DEF \u05d3\u05d2\u05d1\u05d0"
	];	
	
	var bdEngine;
	doh.register('dojox.string.tests.BidiEngine.BidiEngine', [
		{	
		
			// testmati - case 37
			name:'1. typeoftext=implicit:visual, orientation=ltr, swapping=yes:no',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){	
					doh.is(uniliout[i], bdEngine.bidiTransform(el, 'ILYNN', 'VLNNN'),"bidiTransform: string num: " + i + " in: unilisrc out: uniliout");
				},this);
			}
		},
		{
			// testmati - case 38
			name:'2. typeoftext=implicit:visual, orientation=rtl:ltr, swapping=yes:no',

			runTest:function() {
				dojo.forEach(unirisrc, function(el, i){	
					doh.is(uniriout[i], bdEngine.bidiTransform(el, 'IRYNN', 'VLNNN'),"bidiTransform: string num: " + i + " in: unirisrc out: uniriout");
				},this);
			}
		},
		{
			// testmati - case 41
			name:'3. typeoftext=imsplicit:imsplicit, orientation=ltr:contextual, context=ltr, swapping=yes',

			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){	
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ILYNN', 'ILYNN'),"bidiTransform: string num: " + i + " in: unilisrc out: unilisrc");
				},this);
			}
		},
		{
			// testmati - case 42
			name:'4. typeoftext=visual:visual, orientation=ltr:ltr, swapping=no:no',

			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){	
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VLYNN', 'VLYNN'),"bidiTransform: string num: " + i + " in: unilisrc out: unilisrc");
				},this);
			}
		},
		{
			// testmati - case 43
			name:'5. typeoftext=visual:visual, orientation=ltr:rtl, swapping=no:no',

			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){	
					doh.is(unilicrs[i], bdEngine.bidiTransform(el, 'VLYNN', 'VRYNN'),"bidiTransform: string num: " + i + " in: unilisrc out: unilicrs");
				},this);
			}
		},
		{
			// testmati - case 44
			name:'6. typeoftext=visual:visual, orientation=rtl:ltr, swapping=no:no',

			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){	
					doh.is(unilicrs[i], bdEngine.bidiTransform(el, 'VRNNN', 'VLYNN'),"bidiTransform: string num: " + i + " in: unilisrc out: unilicrs");
				},this);
			}
		},
		{
			// testmati - case 1
			name:'7. typeoftext=visual:visual, orientation=ltr:ltr, swapping=no:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(allcases[i], bdEngine.bidiTransform(el, 'VLNNN', 'VLNNN'),"bidiTransform: string num: " + i + " in: allcases out: allcases");
				},this);
			}
		},
		{
			// testmati - case 2
			name:'8. typeoftext=visual:visual, orientation=rtl:ltr, swapping=no:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(allinvrs[i], bdEngine.bidiTransform(el, 'VRNNN', 'VLNNN'),"bidiTransform: string num: " + i + " in: allcases out: allinvrs");
				},this);
			}
		},
		{
			// testmati - case 3
			name:'9. typeoftext=visual:visual, orientation=ltr:rtl, swapping=no:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(allinvrs[i], bdEngine.bidiTransform(el, 'VLNNN', 'VRNNN'),"bidiTransform: string num: " + i + " in: allcases out: allinvrs");
				},this);
			}
		},
		{
			// testmati - case 4
			name:'10. typeoftext=visual:visual, orientation=rtl:rtl, swapping=no:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(allcases[i], bdEngine.bidiTransform(el, 'VRNNN', 'VRNNN'), "bidiTransform: string num: " + i + " in: allcases out: allcases");
				},this);
			}
		},
		{
			// testmati - case 5
			name:'11. typeoftext=implicit:visual, orientation=ltr:ltr, swapping=yes:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(il2vlmdl[i], bdEngine.bidiTransform(el, 'ILYNN', 'VLNNN'), "bidiTransform: string num: " + i + " in: allcases out: il2vlmdl");
				},this);
			}
		},
		{
			// testmati - case 6
			name:'12. typeoftext=implicit:visual, orientation=rtl:ltr, swapping=yes:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(ir2vlmdl[i], bdEngine.bidiTransform(el, 'IRYNN', 'VLNNN'), "bidiTransform: string num: " + i + " in: allcases out: ir2vlmdl");
				},this);
			}
		},
		{
			// testmati - case 7
			name:'13. typeoftext=implicit:visual, orientation=ltr:rtl, swapping=yes:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(il2vrmdl[i], bdEngine.bidiTransform(el, 'ILYNN', 'VRNNN'), "bidiTransform: string num: " + i + " in: allcases out: il2vrmdl");
				},this);
			}
		},
		{
			// testmati - case 8
			name:'14. typeoftext=implicit:visual, orientation=rtl:rtl, swapping=yes:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(ir2vrmdl[i], bdEngine.bidiTransform(el, 'IRYNN', 'VRNNN'), "bidiTransform: string num: " + i + " in: allcases out: ir2vrmdl");
				},this);
			}
		},
		{
			// testmati - case 9
			name:'15. typeoftext=visual:implicit, orientation=ltr:ltr, swapping=no:yes',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(il2vlmdl[i], bdEngine.bidiTransform(el, 'VLNNN', 'ILYNN'), "bidiTransform: string num: " + i + " in: allcases out: il2vlmdl");
				},this);
			}
		},
		{
			// testmati - case 10
			name:'16. typeoftext=visual:implicit, orientation=rtl:ltr, swapping=no:yes',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(vr2ilmdl[i], bdEngine.bidiTransform(el, 'VRNNN', 'ILYNN'), "bidiTransform: string num: " + i + " in: allcases out: vr2ilmdl");
				},this);
			}
		},
		{
			// testmati - case 11
			name:'17. typeoftext=visual:implicit, orientation=ltr:rtl, swapping=no:yes',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(vl2irmdl[i], bdEngine.bidiTransform(el, 'VLNNN', 'IRYNN'), "bidiTransform: string num: " + i + " in: allcases out: vl2irmdl");
				},this);
			}
		},
		{
			// testmati - case 12
			name:'18. typeoftext=visual:implicit, orientation=rtl:rtl, swapping=no:yes',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(ir2vrmdl[i], bdEngine.bidiTransform(el, 'VRNNN', 'IRYNN'), "bidiTransform: string num: " + i + " in: allcases out: ir2vrmdl");
				},this);
			}
		},
		{
			// testmati - case 13
			name:'19. typeoftext=implicit:implicit, orientation=ltr:ltr, swapping=no:no',

			runTest:function() {
				dojo.forEach(allcases, function(el, i){	
					doh.is(allcases[i], bdEngine.bidiTransform(el, 'ILNNN', 'ILNNN'), "bidiTransform: string num: " + i + " in: allcases out: allcases");
				},this);
			}
		}
	]);
	

});