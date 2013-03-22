require([
	'require',
	'doh/main',
	'dojo/request',
	'dojo/node!http',
	'dojo/Deferred'
], function(require, doh, request, http, Deferred){
	var server = http.createServer(function(request, response){
		var body = '{ "foo": "bar" }';
		response.writeHead(200, {
			'Content-Length': body.length,
			'Content-Type': 'application/json'
		});
		response.write(body);
		response.end();
	});

	server.on('listening', function(){
		doh.register("tests.request.node", [
			{
				name: "test",
				runTest: function(t){
					var d = new doh.Deferred();

					request.get('http://localhost:8124', {
						handleAs: 'json'
					}).then(d.getTestCallback(function(data){
						t.is({ foo: 'bar' }, data);
					}), function(err){
						d.errback(err);
					});

					return d;
				},
				tearDown: function(){
					server.close();
				}
			}
		]);

		doh.run();
	});

	server.listen(8124);
});
