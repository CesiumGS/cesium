define(["../_base/lang", "../i18n"], function(lang, i18n){

// module:
//		dojo/cldr/supplemental


var supplemental = {
	// summary:
	//		TODOC
};
lang.setObject("dojo.cldr.supplemental", supplemental);

supplemental.getFirstDayOfWeek = function(/*String?*/locale){
	// summary:
	//		Returns a zero-based index for first day of the week
	// description:
	//		Returns a zero-based index for first day of the week, as used by the local (Gregorian) calendar.
	//		e.g. Sunday (returns 0), or Monday (returns 1)

	// from http://www.unicode.org/cldr/data/common/supplemental/supplementalData.xml:supplementalData/weekData/firstDay
	var firstDay = {/*default is 1=Monday*/
		bd:5,mv:5,
		ae:6,af:6,bh:6,dj:6,dz:6,eg:6,iq:6,ir:6,jo:6,kw:6,
		ly:6,ma:6,om:6,qa:6,sa:6,sd:6,sy:6,ye:6,
		ag:0,ar:0,as:0,au:0,br:0,bs:0,bt:0,bw:0,by:0,bz:0,ca:0,cn:0,
		co:0,dm:0,'do':0,et:0,gt:0,gu:0,hk:0,hn:0,id:0,ie:0,il:0,'in':0,
		jm:0,jp:0,ke:0,kh:0,kr:0,la:0,mh:0,mm:0,mo:0,mt:0,mx:0,mz:0,
		ni:0,np:0,nz:0,pa:0,pe:0,ph:0,pk:0,pr:0,py:0,sg:0,sv:0,th:0,
		tn:0,tt:0,tw:0,um:0,us:0,ve:0,vi:0,ws:0,za:0,zw:0
	};

	var country = supplemental._region(locale);
	var dow = firstDay[country];
	return (dow === undefined) ? 1 : dow; /*Number*/
};

supplemental._region = function(/*String?*/locale){
	locale = i18n.normalizeLocale(locale);
	var tags = locale.split('-');
	var region = tags[1];
	if(!region){
		// IE often gives language only (#2269)
		// Arbitrary mappings of language-only locales to a country:
		region = {de:"de", en:"us", es:"es", fi:"fi", fr:"fr", he:"il", hu:"hu", it:"it",
			ja:"jp", ko:"kr", nl:"nl", pt:"br", sv:"se", zh:"cn"}[tags[0]];
	}else if(region.length == 4){
		// The ISO 3166 country code is usually in the second position, unless a
		// 4-letter script is given. See http://www.ietf.org/rfc/rfc4646.txt
		region = tags[2];
	}
	return region;
};

supplemental.getWeekend = function(/*String?*/locale){
	// summary:
	//		Returns a hash containing the start and end days of the weekend
	// description:
	//		Returns a hash containing the start and end days of the weekend according to local custom using locale,
	//		or by default in the user's locale.
	//		e.g. {start:6, end:0}

	// from http://www.unicode.org/cldr/data/common/supplemental/supplementalData.xml:supplementalData/weekData/weekend{Start,End}
	var weekendStart = {/*default is 6=Saturday*/
			'in':0,
			af:4,dz:4,ir:4,om:4,sa:4,ye:4,
			ae:5,bh:5,eg:5,il:5,iq:5,jo:5,kw:5,ly:5,ma:5,qa:5,sd:5,sy:5,tn:5
		},

		weekendEnd = {/*default is 0=Sunday*/
			af:5,dz:5,ir:5,om:5,sa:5,ye:5,
			ae:6,bh:5,eg:6,il:6,iq:6,jo:6,kw:6,ly:6,ma:6,qa:6,sd:6,sy:6,tn:6
		},

		country = supplemental._region(locale),
		start = weekendStart[country],
		end = weekendEnd[country];

	if(start === undefined){start=6;}
	if(end === undefined){end=0;}
	return {start:start, end:end}; /*Object {start,end}*/
};

return supplemental;
});
