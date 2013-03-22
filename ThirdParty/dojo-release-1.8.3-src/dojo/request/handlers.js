define([
	'../json',
	'../_base/kernel',
	'../_base/array',
	'../has'
], function(JSON, kernel, array, has){
	has.add('activex', typeof ActiveXObject !== 'undefined');

	var handleXML;
	if(has('activex')){
		// GUIDs obtained from http://msdn.microsoft.com/en-us/library/ms757837(VS.85).aspx
		var dp = [
			'Msxml2.DOMDocument.6.0',
			'Msxml2.DOMDocument.4.0',
			'MSXML2.DOMDocument.3.0',
			'MSXML.DOMDocument' // 2.0
		];

		handleXML = function(response){
			var result = response.data;

			if(!result || !result.documentElement){
				var text = response.text;
				array.some(dp, function(p){
					try{
						var dom = new ActiveXObject(p);
						dom.async = false;
						dom.loadXML(text);
						result = dom;
					}catch(e){ return false; }
					return true;
				});
			}

			return result;
		};
	}

	var handlers = {
		'javascript': function(response){
			return kernel.eval(response.text || '');
		},
		'json': function(response){
			return JSON.parse(response.text || null);
		},
		'xml': handleXML
	};

	function handle(response){
		var handler = handlers[response.options.handleAs];

		response.data = handler ? handler(response) : (response.data || response.text);

		return response;
	}

	handle.register = function(name, handler){
		handlers[name] = handler;
	};

	return handle;
});
