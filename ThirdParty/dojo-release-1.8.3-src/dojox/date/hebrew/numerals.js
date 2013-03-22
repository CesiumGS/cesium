define(["../..", "dojo/_base/lang", "dojo/_base/array"], function(dojox, lang, arr){
	var hnumerals = lang.getObject("date.hebrew.numerals", true, dojox);

	//Conversion from "Hindi" numerals to Hebrew numerals and vice versa

	var DIG="אבגדהוזחט";
	var	TEN="יכלמנסעפצ";
	var	HUN="קרשת";

	var transformChars = function(str, nogrsh){
		str = str.replace("יה", "טו").replace("יו", "טז");

		if(!nogrsh){
			var len = str.length;
			if(len > 1){
				str = str.substr(0, len - 1) + '"' + str.charAt(len - 1);
			}else{
				str += "\u05F3"; // 05F3:geresh
			}
		}
		return str; // String
	};
	 
	var parseStrToNumber = function(str){
		var num = 0;
		arr.forEach(str, function(ch){
			var i;
			if((i = DIG.indexOf(ch)) != -1){
				num += ++i;
			}else if((i = TEN.indexOf(ch)) != -1){
				num += 10 * ++i;
			}else if((i = HUN.indexOf(ch)) != -1){
				num += 100 * ++i;
			}
		});
		return num; //Number
	};
	 
	var convertNumberToStr = function(num){
		var str  = "", n = 4, j = 9;
  		while(num){
			if(num >= n*100){
				str += HUN.charAt(n-1);
				num -= n*100;
				continue;
			}else if(n > 1){
				n--;
				continue;
			}else if(num >= j*10){
				str += TEN.charAt(j-1);
				num -= j*10;
			}else if(j > 1){
				j--;
				continue;
			}else if(num > 0){
				str += DIG.charAt(num-1);
				num = 0;
			}
		}
		return str; //String
	};

	hnumerals.getYearHebrewLetters = function(/*Number */ year){
		// summary:
		//		converts the year from an integer to Hebrew numerals.
		// example:
		//	|	var date1 = new dojox.date.hebrew.Date();
		//	|	document.writeln(dojox.date.hebrew.numerals.getYearHebrewLetters(date1.getFullYear());
		
		var rem = year % 1000;
		//FIXME: tests include dates outside this range and seem to pass.
		//	    	if((year - rem) / 1000 != 5){ throw new Error("Hebrew year "+year+" is not in range 5001-5999");}
		return transformChars(convertNumberToStr(rem)); // String
	};
	
	hnumerals.parseYearHebrewLetters  = function(/*String hebrew year*/ year){
		// summary:
		//		converts the year written in Hebrew numerals to an integer
		// example:
		//	|	var date = new dojox.date.hebrew.Date();
		//	|	        	date.setFullYear(dojox.date.hebrew.numerals.parseYearHebrewLetters('\u05ea\u05e9\u05e1\u05f4\u05d7'));

		return parseStrToNumber(year) + 5000; // int
	};
	
	hnumerals.getDayHebrewLetters =  function(day, /*boolean?*/ nogrsh){
		// summary:
		//		 converts an integer to a String representing the number in Hebrew numerals.
		//		Can be formatted with or without geresh &#x05f3;
		// example:
		//	|	var date1 = new dojox.date.hebrew.Date();
		//	|	document.writeln(dojox.date.hebrew.numerals.getDayHebrewLetters(date1.getDay());

		return transformChars(convertNumberToStr(day), nogrsh); // String
	};
	
	hnumerals.parseDayHebrewLetters =  function(/*String hebrew*/ day){
		// summary:
		//		converts the string containing a Hebrew numeral to an integer
		// example:
		//	|	var date1 = new dojox.date.hebrew.Date();
		//	|	date1.setDate(dojox.date.hebrew.numerals.parseDayHebrewLetters('\u05d0')); // ALEPH
		return parseStrToNumber(day); // int
	};

	hnumerals.getMonthHebrewLetters =  function(/*int*/month){
		// summary:
		//		converts an integer representing a  month to a String written in Hebrew numerals
		// example:
		//	|	var date1 = new dojox.date.hebrew.Date();
		//	|	document.writeln(dojox.date.hebrew.numerals.getMonthHebrewLetters(date1.getMonth());

		return transformChars(convertNumberToStr(month+1)); // String
	};

	hnumerals.parseMonthHebrewLetters = function(/*String*/monthStr){
		// summary:
		//		converts a Hebrew numeral string representing
		//		a month to an integer.  The returned value
		//		is indexed in the month name array.  To use it for
		//		setMonth, do correction for leap year
		// example:
		//	|	var date = new dojox.date.hebrew.Date();
		//	|	            var number = dojox.date.hebrew.numerals.parseMonthHebrewLetters("\u05ea\u05de\u05d5\u05d6"); // Tammuz
		//	|	date.setMonth(number);
			
		//month number from 0 to 12
		var monnum = hnumerals.parseDayHebrewLetters(monthStr) - 1;

		if(monnum == -1 || monnum > 12){
			throw new Error("The month name is incorrect , month = " + monnum);
		}
		return monnum;
	};
	return hnumerals;
});
