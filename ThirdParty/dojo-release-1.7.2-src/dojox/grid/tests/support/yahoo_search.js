// model that works with Yahoo Search API
(function(){
var nop = function(){};
dojo.declare("dojox.grid._data.yahooSearch", null,
	function(inFields, inData) {
		this.rowsPerPage = 20;
		this.fieldNames = [];
		for (var i=0, f; (f=inFields[i]); i++)
			this.fieldNames.push(f.name);
	}, {
	clearData: function() {
		turbo.widgets.TurboGrid.data.dynamic.prototype.clearData.apply(this, arguments);
	},
	// server send / receive
	encodeParam: function(inName, inValue) {
		return turbo.printf('&%s=%s', inName, inValue);
	},
	getParams: function(inParams) {
		var url = this.url;
		url += '?appid=turboajax';
		inParams = inParams || {};
		inParams.output = 'json';
		inParams.results = this.rowsPerPage;
		inParams.query = turbo.$('searchInput').value.replace(/ /g, '+');
		for (var i in inParams)
			if (inParams[i] != undefined)
				url += this.encodeParam(i, inParams[i]);
		return url;
	},
	send: function(inAsync, inParams, inOnReceive, inOnError) {
		var p = this.getParams(inParams);
		dojo.io.bind({
			url: "support/proxy.php",
			method: "post",
			content: {url: p },
			contentType: "application/x-www-form-urlencoded; charset=utf-8",
			mimetype: 'text/json',
			sync: !inAsync,
			load: turbo.bindArgs(this, "receive", inOnReceive, inOnError),
			error: turbo.bindArgs(this, "error", inOnError)
		});
		this.onSend(inParams);
	},
	receive: function(inOnReceive, inOnError, inEvt, inData) {
		try {
			inData = inData.ResultSet;
			inOnReceive(inData);
			this.onReceive(inData);
		} catch(e) {
			if (inOnError)
				inOnError(inData);
		}
	},
	error: function(inOnError, inTyp, inErr) {
		var m = 'io error: ' + inErr.message;
		alert(m);
		if (inOnError)
			inOnError(m);
	},
	fetchRowCount: function(inCallback) {
		this.send(true, inCallback );
	},
	// request data
	requestRows: function(inRowIndex, inCount)	{
		inRowIndex = (inRowIndex == undefined ? 0 : inRowIndex);
		var params = {
			start: inRowIndex + 1
		}
		this.send(true, params, turbo.bindArgs(this, this.processRows));
	},
	// server callbacks
	processRows: function(inData) {
		for (var i=0, l=inData.totalResultsReturned, s=inData.firstResultPosition; i<l; i++) {
			this.setRow(inData.Result[i], s - 1 + i);
		}
		// yahoo says 1000 is max results to return
		var c = Math.min(1000, inData.totalResultsAvailable);
		if (this.count != c) {
			this.setRowCount(c);
			this.allChange();
			this.onInitializeData(inData);
		}
	},
	getDatum: function(inRowIndex, inColIndex) {
		var row = this.getRow(inRowIndex);
		var field = this.fields.get(inColIndex);
		return (inColIndex == undefined ? row : (row ? row[field.name] : field.na));
	},
	// events
	onInitializeData: nop,
	onSend: nop,
	onReceive: nop
});

// report
modelChange = function() {
	var n = turbo.$('rowCount');
	if (n)
		n.innerHTML = turbo.printf('about %s row(s)', model.count);
}


// some data formatters
formatLink = function(inData, inRowIndex) {
	if (!inData[0] || !inData[1])
		return '&nbsp;';
	return turbo.supplant('<a target="_blank" href="{href}">{text}</a>', {href: inData[0], text: inData[1] });
};

formatImage = function(inData, inRowIndex) {
	if (!inData[0] || !inData[1])
		return '&nbsp;';
	var o = {
		href: inData[0],
		src: inData[1].Url,
		width: inData[1].Width,
		height: inData[1].Height
	}
	return turbo.supplant('<a href="{href}" target="_blank"><img border=0 src="{src}" width="{width}" height="{height}"></a>', o);
};

formatDate = function(inDatum, inRowIndex) {
	if (inDatum == '')
		return '&nbsp;';
	var d = new Date(inDatum * 1000);
	return turbo.printf('%s/%s/%s', d.getMonth(), d.getDate(), d.getFullYear());
};

formatDimensions = function(inData, inRowIndex) {
	if (!inData[0] || !inData[1])
		return '&nbsp;';
	return inData[0] + ' x ' + inData[1];
}
})();
