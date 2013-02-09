dojo.provide("dijit.tests._BidiSupport.BidiSupportModule.BidiSupportTest");

//Import in the code being tested.
dojo.require("dijit._BidiSupport");
dojo.require("dijit._Widget");

dojo.ready(function(){

	doh.register("dijit.tests._BidiSupport.BidiSupportModule.BidiSupportTest", [
		{
			name:"1. checkContextual(), dir = LTR",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"ltr", dir:"ltr"});
				
				doh.is("ltr", bidi._checkContextual("Hello"),"Hello");
				doh.is("rtl", bidi._checkContextual("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("123 Hello"),"123 Hello");
				doh.is("rtl", bidi._checkContextual("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("_Hello"),"_Hello");
				doh.is("rtl", bidi._checkContextual("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("rtl", bidi._checkContextual("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi._checkContextual("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("ltr", bidi._checkContextual(""),"");
				doh.is("ltr", bidi._checkContextual("123 > 456"),"123 > 456");
				doh.is("ltr", bidi._checkContextual("%^$^&)( )_($!"),"%^$^&)( )_($!");	
			}
		},
		{
			name:"2. checkContextual(), dir = RTL",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"ltr",dir:"rtl"});

				doh.is("ltr", bidi._checkContextual("Hello"),"Hello");
				doh.is("rtl", bidi._checkContextual("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("123 Hello"),"123 Hello");
				doh.is("rtl", bidi._checkContextual("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("_Hello"),"_Hello");
				doh.is("rtl", bidi._checkContextual("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("rtl", bidi._checkContextual("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi._checkContextual("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi._checkContextual("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("rtl", bidi._checkContextual(""),"");
				doh.is("rtl", bidi._checkContextual("123 > 456"),"123 > 456");			
				doh.is("rtl", bidi._checkContextual("%^$^&)( )_($!"),"%^$^&)( )_($!");
			}
		},
		{
			name:"3. getTextDir(), textDir = LTR, dir = LTR",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"ltr",dir:"ltr"});

				doh.is("ltr", bidi.getTextDir("Hello"),"Hello");
				doh.is("ltr", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("123 Hello"),"123 Hello");
				doh.is("ltr", bidi.getTextDir("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("_Hello"),"_Hello");
				doh.is("ltr", bidi.getTextDir("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("ltr", bidi.getTextDir("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("ltr", bidi.getTextDir(""),"");
				doh.is("ltr", bidi.getTextDir("123 > 456"),"123 > 456");
				doh.is("ltr", bidi.getTextDir("%^$^&)( )_($!"),"%^$^&)( )_($!");
			}
		},
		{
			name:"4. getTextDir(), textDir = LTR, dir = RTL",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"ltr",dir:"rtl"}); 
			
				doh.is("ltr", bidi.getTextDir("Hello"),"Hello");
				doh.is("ltr", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("123 Hello"),"123 Hello");
				doh.is("ltr", bidi.getTextDir("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("_Hello"),"_Hello");
				doh.is("ltr", bidi.getTextDir("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("ltr", bidi.getTextDir("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("ltr", bidi.getTextDir(""),"");
				doh.is("ltr", bidi.getTextDir("123 > 456"),"123 > 456");
				doh.is("ltr", bidi.getTextDir("%^$^&)( )_($!"),"%^$^&)( )_($!");
			}
		},
		{
			name:"5. getTextDir(), textDir = RTL, dir = LTR",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"rtl",dir:"ltr"});
			
				doh.is("rtl", bidi.getTextDir("Hello"),"Hello");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("123 Hello"),"123 Hello");
				doh.is("rtl", bidi.getTextDir("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("_Hello"),"_Hello");
				doh.is("rtl", bidi.getTextDir("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("rtl", bidi.getTextDir("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("rtl", bidi.getTextDir(""),"");
				doh.is("rtl", bidi.getTextDir("123 > 456"),"123 > 456");
				doh.is("rtl", bidi.getTextDir("%^$^&)( )_($!"),"%^$^&)( )_($!");
			}
		},
		{
			name:"6. getTextDir(), textDir = RTL, dir = RTL",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"rtl",dir:"rtl"});			
			
				doh.is("rtl", bidi.getTextDir("Hello"),"Hello");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("123 Hello"),"123 Hello");
				doh.is("rtl", bidi.getTextDir("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("_Hello"),"_Hello");
				doh.is("rtl", bidi.getTextDir("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("rtl", bidi.getTextDir("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("rtl", bidi.getTextDir(""),"");
				doh.is("rtl", bidi.getTextDir("123 > 456"),"123 > 456");
				doh.is("rtl", bidi.getTextDir("%^$^&)( )_($!"),"%^$^&)( )_($!");	
			}
		},
		{
			name:"7. getTextDir(), textDir = AUTO, dir = LTR",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"auto",dir:"ltr"});
				
				doh.is("ltr", bidi.getTextDir("Hello"),"Hello");
				doh.is("ltr", bidi.getTextDir("123 Hello"),"123 Hello");
				doh.is("rtl", bidi.getTextDir("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("_Hello"),"_Hello");
				doh.is("rtl", bidi.getTextDir("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("rtl", bidi.getTextDir("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir(""),"");
				doh.is("ltr", bidi.getTextDir("123 > 456"),"123 > 456");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("ltr", bidi.getTextDir("%^$^&)( )_($!"),"%^$^&)( )_($!");
			}
		},
		{
			name:"8. getTextDir(), textDir = AUTO, dir = RTL",

			runTest:function(){
				var bidi = new dijit._Widget({textDir:"auto",dir:"rtl"});
				
				doh.is("ltr", bidi.getTextDir("Hello"),"Hello");
				doh.is("ltr", bidi.getTextDir("123 Hello"),"123 Hello");
				doh.is("rtl", bidi.getTextDir("123 \u05e9\u05dc\u05d5\u05dd"),"123 \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("_Hello"),"_Hello");
				doh.is("rtl", bidi.getTextDir("_\u05e9\u05dc\u05d5\u05dd"),"_\u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("!!$%@ \u05e9\u05dc\u05d5\u05dd"), "!!$%@ \u05e9\u05dc\u05d5\u05dd");
				doh.is("ltr", bidi.getTextDir("!!$%@ Hello"), "!!$%@ Hello");
				doh.is("ltr", bidi.getTextDir("Hello \u05e9\u05dc\u05d5\u05dd"), "Hello \u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir(""),"");
				doh.is("rtl", bidi.getTextDir("123 > 456"),"123 > 456");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd"),"\u05e9\u05dc\u05d5\u05dd");
				doh.is("rtl", bidi.getTextDir("\u05e9\u05dc\u05d5\u05dd Hello"),"\u05e9\u05dc\u05d5\u05dd Hello");
				doh.is("rtl", bidi.getTextDir("%^$^&)( )_($!"),"%^$^&)( )_($!");
				
			}
		}
	]);
	
});
