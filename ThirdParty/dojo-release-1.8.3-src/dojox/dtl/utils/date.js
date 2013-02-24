define([
	"dojo/_base/lang",
	"dojox/date/php",
	"../_base"
], function(lang,ddp,dd){
	lang.getObject("dojox.dtl.utils.date", true);

	dd.utils.date.DateFormat = ddp.DateFormat;
	lang.extend(dd.utils.date.DateFormat, ddp.DateFormat.prototype, {
		f: function(){
			// summary:
			//		Time, in 12-hour hours and minutes, with minutes left off if they're zero.
			// description:
			//		Examples: '1', '1:30', '2:05', '2'
			//		Proprietary extension.
			return (!this.date.getMinutes()) ? this.g() : this.g() + ":" + this.i();
		},
		N: function(){
			// summary:
			//		Month abbreviation in Associated Press style. Proprietary extension.
			return dojox.dtl.utils.date._months_ap[this.date.getMonth()];
		},
		P: function(){
			// summary:
			//		Time, in 12-hour hours, minutes and 'a.m.'/'p.m.', with minutes left off
			//		if they're zero and the strings 'midnight' and 'noon' if appropriate.
			// description:
			//		Examples: '1 a.m.', '1:30 p.m.', 'midnight', 'noon', '12:30 p.m.'
			//		Proprietary extension.
			if(!this.date.getMinutes() && !this.date.getHours()){
				return 'midnight';
			}
			if(!this.date.getMinutes() && this.date.getHours() == 12){
				return 'noon';
			}
			return this.f() + " " + this.a();
		}
	});

	lang.mixin(dojox.dtl.utils.date, {
		format: function(/*Date*/ date, /*String*/ format){
			var df = new dojox.dtl.utils.date.DateFormat(format);
			return df.format(date);
		},
		timesince: function(d, now){
			// summary:
			//		Takes two datetime objects and returns the time between then and now
			//		as a nicely formatted string, e.g "10 minutes"
			// description:
			//		Adapted from http://blog.natbat.co.uk/archive/2003/Jun/14/time_since
			if(!(d instanceof Date)){
				d = new Date(d.year, d.month, d.day);
			}
			if(!now){
				now = new Date();
			}

			var delta = Math.abs(now.getTime() - d.getTime());
			for(var i = 0, chunk; chunk = dojox.dtl.utils.date._chunks[i]; i++){
				var count = Math.floor(delta / chunk[0]);
				if(count) break;
			}
			return count + " " + chunk[1](count);
		},
		_chunks: [
			[60 * 60 * 24 * 365 * 1000, function(n){ return (n == 1) ? 'year' : 'years'; }],
			[60 * 60 * 24 * 30 * 1000, function(n){ return (n == 1) ? 'month' : 'months'; }],
			[60 * 60 * 24 * 7 * 1000, function(n){ return (n == 1) ? 'week' : 'weeks'; }],
			[60 * 60 * 24 * 1000, function(n){ return (n == 1) ? 'day' : 'days'; }],
			[60 * 60 * 1000, function(n){ return (n == 1) ? 'hour' : 'hours'; }],
			[60 * 1000, function(n){ return (n == 1) ? 'minute' : 'minutes'; }]
		],
		_months_ap: ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]
	});
	return dojox.dtl.utils.date;
});
