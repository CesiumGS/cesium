define(["dojo/_base/lang", "dojo/regexp", "dojox/main"], 
  function(lang, regexp, dojox){

var dxregexp = lang.getObject("validate.regexp", true, dojox);
dxregexp = dojox.validate.regexp = {
	
	ipAddress: function(flags){
		// summary:
		//		Builds a RE that matches an IP Address
		// description:
		//		Supports 5 formats for IPv4: dotted decimal, dotted hex, dotted octal, decimal and hexadecimal.
		//		Supports 2 formats for Ipv6.
		// flags: Object?
		//		All flags are boolean with default = true.
		//
		//		- flags.allowDottedDecimal  Example, 207.142.131.235.  No zero padding.
		//		- flags.allowDottedHex  Example, 0x18.0x11.0x9b.0x28.  Case insensitive.  Zero padding allowed.
		//		- flags.allowDottedOctal  Example, 0030.0021.0233.0050.  Zero padding allowed.
		//		- flags.allowDecimal  Example, 3482223595.  A decimal number between 0-4294967295.
		//		- flags.allowHex  Example, 0xCF8E83EB.  Hexadecimal number between 0x0-0xFFFFFFFF.
		//		  Case insensitive.  Zero padding allowed.
		//		- flags.allowIPv6   IPv6 address written as eight groups of four hexadecimal digits.
		
		//	FIXME: ipv6 can be written multiple ways IIRC
		//		- flags.allowHybrid   IPv6 address written as six groups of four hexadecimal digits
		//		-   followed by the usual 4 dotted decimal digit notation of IPv4. x:x:x:x:x:x:d.d.d.d

		// assign default values to missing paramters
		flags = (typeof flags == "object") ? flags : {};
		if(typeof flags.allowDottedDecimal != "boolean"){ flags.allowDottedDecimal = true; }
		if(typeof flags.allowDottedHex != "boolean"){ flags.allowDottedHex = true; }
		if(typeof flags.allowDottedOctal != "boolean"){ flags.allowDottedOctal = true; }
		if(typeof flags.allowDecimal != "boolean"){ flags.allowDecimal = true; }
		if(typeof flags.allowHex != "boolean"){ flags.allowHex = true; }
		if(typeof flags.allowIPv6 != "boolean"){ flags.allowIPv6 = true; }
		if(typeof flags.allowHybrid != "boolean"){ flags.allowHybrid = true; }

		// decimal-dotted IP address RE.
		var dottedDecimalRE =
			// Each number is between 0-255.  Zero padding is not allowed.
			"((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])";

		// dotted hex IP address RE.  Each number is between 0x0-0xff.  Zero padding is allowed, e.g. 0x00.
		var dottedHexRE = "(0[xX]0*[\\da-fA-F]?[\\da-fA-F]\\.){3}0[xX]0*[\\da-fA-F]?[\\da-fA-F]";

		// dotted octal IP address RE.  Each number is between 0000-0377.
		// Zero padding is allowed, but each number must have at least 4 characters.
		var dottedOctalRE = "(0+[0-3][0-7][0-7]\\.){3}0+[0-3][0-7][0-7]";

		// decimal IP address RE.  A decimal number between 0-4294967295.
		var decimalRE =  "(0|[1-9]\\d{0,8}|[1-3]\\d{9}|4[01]\\d{8}|42[0-8]\\d{7}|429[0-3]\\d{6}|" +
			"4294[0-8]\\d{5}|42949[0-5]\\d{4}|429496[0-6]\\d{3}|4294967[01]\\d{2}|42949672[0-8]\\d|429496729[0-5])";

		// hexadecimal IP address RE.
		// A hexadecimal number between 0x0-0xFFFFFFFF. Case insensitive.  Zero padding is allowed.
		var hexRE = "0[xX]0*[\\da-fA-F]{1,8}";

		// IPv6 address RE.
		// The format is written as eight groups of four hexadecimal digits, x:x:x:x:x:x:x:x,
		// where x is between 0000-ffff. Zero padding is optional. Case insensitive.
		var ipv6RE = "([\\da-fA-F]{1,4}\\:){7}[\\da-fA-F]{1,4}";

		// IPv6/IPv4 Hybrid address RE.
		// The format is written as six groups of four hexadecimal digits,
		// followed by the 4 dotted decimal IPv4 format. x:x:x:x:x:x:d.d.d.d
		var hybridRE = "([\\da-fA-F]{1,4}\\:){6}" +
			"((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])";

		// Build IP Address RE
		var a = [];
		if(flags.allowDottedDecimal){ a.push(dottedDecimalRE); }
		if(flags.allowDottedHex){ a.push(dottedHexRE); }
		if(flags.allowDottedOctal){ a.push(dottedOctalRE); }
		if(flags.allowDecimal){ a.push(decimalRE); }
		if(flags.allowHex){ a.push(hexRE); }
		if(flags.allowIPv6){ a.push(ipv6RE); }
		if(flags.allowHybrid){ a.push(hybridRE); }

		var ipAddressRE = "";
		if(a.length > 0){
			ipAddressRE = "(" + a.join("|") + ")";
		}
		return ipAddressRE; // String
	},

	host: function(flags){
		// summary:
		//		Builds a RE that matches a host
		// description:
		//		A host is a named host (A-z0-9_- but not starting with -), a domain name or an IP address, possibly followed by a port number.
		// flags: Object?
		//		- flags.allowNamed Allow a named host for local networks. Default is false.
		//		- flags.allowIP  Allow an IP address for hostname.  Default is true.
		//		- flags.allowLocal  Allow the host to be "localhost".  Default is false.
		//		- flags.allowPort  Allow a port number to be present.  Default is true.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing paramters
		flags = (typeof flags == "object") ? flags : {};

		if(typeof flags.allowIP != "boolean"){ flags.allowIP = true; }
		if(typeof flags.allowLocal != "boolean"){ flags.allowLocal = false; }
		if(typeof flags.allowPort != "boolean"){ flags.allowPort = true; }
		if(typeof flags.allowNamed != "boolean"){ flags.allowNamed = false; }

		//TODO: support unicode hostnames?
		// Domain name labels can not end with a dash.
		var domainLabelRE = "(?:[\\da-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)";
		var domainNameRE = "(?:[a-zA-Z](?:[-\\da-zA-Z]{0,6}[\\da-zA-Z])?)"; // restricted version to allow backwards compatibility with allowLocal, allowIP

		// port number RE
		var portRE = flags.allowPort ? "(\\:\\d+)?" : "";

		// build host RE
		var hostNameRE = "((?:" + domainLabelRE + "\\.)+" + domainNameRE + "\\.?)";
		if(flags.allowIP){ hostNameRE += "|" +  dxregexp.ipAddress(flags); }
		if(flags.allowLocal){ hostNameRE += "|localhost"; }
		if(flags.allowNamed){ hostNameRE += "|^[^-][a-zA-Z0-9_-]*"; }
		return "(" + hostNameRE + ")" + portRE; // String

	},

	url: function(flags){
		// summary:
		//		Builds a regular expression that matches a URL
		// flags: Object?
		//		- flags.scheme  Can be true, false, or [true, false].
		//		-   This means: required, not allowed, or match either one.
		//		- flags in regexp.host can be applied.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing paramters
		flags = (typeof flags == "object") ? flags : {};
		if(!("scheme" in flags)){ flags.scheme = [true, false]; }

		// Scheme RE
		var protocolRE = regexp.buildGroupRE(flags.scheme,
			function(q){ if(q){ return "(https?|ftps?)\\://"; } return ""; }
		);

		// Path and query and anchor RE
		var pathRE = "(/(?:[^?#\\s/]+/)*(?:[^?#\\s/]+(?:\\?[^?#\\s/]*)?(?:#[A-Za-z][\\w.:-]*)?)?)?";

		return protocolRE + dxregexp.host(flags) + pathRE;
	},

	emailAddress: function(flags){
		// summary:
		//		Builds a regular expression that matches an email address
		// flags: Object?
		//		- flags.allowCruft  Allow address like `<mailto:foo@yahoo.com>`.  Default is false.
		//		- flags in regexp.host can be applied.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing paramters
		flags = (typeof flags == "object") ? flags : {};
		if (typeof flags.allowCruft != "boolean") { flags.allowCruft = false; }
		flags.allowPort = false; // invalid in email addresses

		// user name RE per rfc5322
		var usernameRE = "([!#-'*+\\-\\/-9=?A-Z^-~]+[.])*[!#-'*+\\-\\/-9=?A-Z^-~]+";

		// build emailAddress RE
		var emailAddressRE = usernameRE + "@" + dxregexp.host(flags);

		// Allow email addresses with cruft
		if ( flags.allowCruft ) {
			emailAddressRE = "<?(mailto\\:)?" + emailAddressRE + ">?";
		}

		return emailAddressRE; // String
	},

	emailAddressList: function(flags){
		// summary:
		//		Builds a regular expression that matches a list of email addresses.
		// flags: Object?
		//		- flags.listSeparator  The character used to separate email addresses.  Default is ";", ",", "\n" or " ".
		//		- flags in regexp.emailAddress can be applied.
		//		- flags in regexp.host can be applied.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing paramters
		flags = (typeof flags == "object") ? flags : {};
		if(typeof flags.listSeparator != "string"){ flags.listSeparator = "\\s;,"; }

		// build a RE for an Email Address List
		var emailAddressRE = dxregexp.emailAddress(flags);
		var emailAddressListRE = "(" + emailAddressRE + "\\s*[" + flags.listSeparator + "]\\s*)*" +
			emailAddressRE + "\\s*[" + flags.listSeparator + "]?\\s*";

		return emailAddressListRE; // String
	},
	
	numberFormat: function(flags){
		// summary:
		//		Builds a regular expression to match any sort of number based format
		// description:
		//		Use this method for phone numbers, social security numbers, zip-codes, etc.
		//		The RE can match one format or one of multiple formats.
		//
		//		Format:
		//
		//		- #        Stands for a digit, 0-9.
		//		- ?        Stands for an optional digit, 0-9 or nothing.
		//		- All other characters must appear literally in the expression.
		//
		// example:
		//		- "(###) ###-####"		-    ->   (510) 542-9742
		//		- "(###) ###-#### x#???" ->   (510) 542-9742 x153
		//		- "###-##-####"		- 		-   ->   506-82-1089		-    i.e. social security number
		//		- "#####-####"		- 		-    ->   98225-1649		- 		- i.e. zip code
		//
		// flags:  Object?
		//		- flags.format  A string or an Array of strings for multiple formats.

		// assign default values to missing paramters
		flags = (typeof flags == "object") ? flags : {};
		if(typeof flags.format == "undefined"){ flags.format = "###-###-####"; }

		// Converts a number format to RE.
		var digitRE = function(format){
			// escape all special characters, except '?'
			return regexp.escapeString(format, "?")
				// Now replace '?' with Regular Expression
				.replace(/\?/g, "\\d?")
				// replace # with Regular Expression
				.replace(/#/g, "\\d")
			;
		};

		// build RE for multiple number formats
		return regexp.buildGroupRE(flags.format, digitRE); //String
	},
	
	ca: {

		postalCode: function(){
			// summary:
			//		String regular Express to match Canadain Postal Codes
			return "([A-Z][0-9][A-Z] [0-9][A-Z][0-9])";
		},

		province: function(){
			// summary:
			//		a regular expression to match Canadian Province Abbreviations
			return "(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)";
		}

	},
	
	us:{
		state: function(flags){
			// summary:
			//		A regular expression to match US state and territory abbreviations
			// flags: Object?
			//		- flags.allowTerritories  Allow Guam, Puerto Rico, etc.  Default is true.
			//		- flags.allowMilitary  Allow military 'states', e.g. Armed Forces Europe (AE).  Default is true.

			// assign default values to missing parameters
			flags = (typeof flags == "object") ? flags : {};
			if(typeof flags.allowTerritories != "boolean"){ flags.allowTerritories = true; }
			if(typeof flags.allowMilitary != "boolean"){ flags.allowMilitary = true; }

			// state RE
			var statesRE =
				"AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|" +
				"NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY";

			// territories RE
			var territoriesRE = "AS|FM|GU|MH|MP|PW|PR|VI";

			// military states RE
			var militaryRE = "AA|AE|AP";

			// Build states and territories RE
			if(flags.allowTerritories){ statesRE += "|" + territoriesRE; }
			if(flags.allowMilitary){ statesRE += "|" + militaryRE; }

			return "(" + statesRE + ")"; // String
		}

	}
	
};

return dxregexp;

});
