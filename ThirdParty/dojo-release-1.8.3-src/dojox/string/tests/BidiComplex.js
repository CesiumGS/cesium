dojo.provide("dojox.string.tests.BidiComplex");
dojo.require("dojox.string.BidiComplex");

tests.register("dojox.string.tests.BidiComplex",
	[
		{
			name: "createDisplayString: FILE_PATH",
			runTest: function(t){
				var originalString = "c:\\قائمة\\ملف.txt";
				var fixedString="‪c:\\قائمة‎\\ملف‎.txt";
				var displayString = dojox.string.BidiComplex.createDisplayString(originalString, "FILE_PATH");
				t.is(displayString, fixedString);

//				originalString = "c:\\אבג\\דהו\\123\\אa";
//				fixedString="‪‪c:\\אבג‎\\דהו‎\\123‎\\אa";
//				var displayString = dojox.string.BidiComplex.createDisplayString(originalString, "FILE_PATH");
//				t.is(displayString, fixedString);
			}
		},
		{
			name: "stripSpecialCharacters: FILE_PATH",
			runTest: function(t){
				var originalString = "c:\\قائمة\\ملف.txt";
				var fixedString="‪c:\\قائمة‎\\ملف‎.txt";
				var stripedString = dojox.string.BidiComplex.stripSpecialCharacters(fixedString);
				t.is(stripedString, originalString);
			}
		},
		{
			name: "createDisplayString: EMAIL",
			runTest: function(t){
				var originalString = "موظف@شركة.com";
				var fixedString="‪موظف‎@شركة‎.com";
				var displayString = dojox.string.BidiComplex.createDisplayString(originalString, "EMAIL");
				t.is(displayString, fixedString);
			}
		},
		{
			name: "stripSpecialCharacters: EMAIL",
			runTest: function(t){
				var originalString = "موظف@شركة.com";
				var fixedString="‪موظف‎@شركة‎.com";
				var stripedString = dojox.string.BidiComplex.stripSpecialCharacters(fixedString);
				t.is(stripedString, originalString);
			}
		},
		{
			name: "createDisplayString: URL",
			runTest: function(t){
				var originalString ="http://قطاع.شركة.com/الموقع/صفحة?دليل=اختبار&&تعيين=نعم";
				var fixedString="‪http://قطاع‎.شركة‎.com/الموقع‎/صفحة‎?دليل‎=اختبار‎&&تعيين‎=نعم";
				var displayString = dojox.string.BidiComplex.createDisplayString(originalString, "URL");
				t.is(displayString, fixedString);
			}
		},
		{
			name: "stripSpecialCharacters: URL",
			runTest: function(t){
				var originalString ="http://قطاع.شركة.com/الموقع/صفحة?دليل=اختبار&&تعيين=نعم";
				var fixedString="‪http://قطاع‎.شركة‎.com/الموقع‎/صفحة‎?دليل‎=اختبار‎&&تعيين‎=نعم";
				var stripedString = dojox.string.BidiComplex.stripSpecialCharacters(fixedString);
				t.is(stripedString, originalString);
			}
		}
		
	]
);
