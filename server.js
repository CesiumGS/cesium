(function() {
    'use strict';
    /*jshint node:true*/

    var express = require('express');
    var compression = require('compression');
    var url = require('url');
    var request = require('request');

    var yargs = require('yargs').options({
        'port' : {
            'default' : 8080,
            'description' : 'Port to listen on. HTTP server can be disabled with value 0.'
        },
        'public' : {
            'type' : 'boolean',
            'description' : 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy' : {
            'description' : 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".'
        },
        'bypass-upstream-proxy-hosts' : {
            'description' : 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'disableHTTP2' : {
            'type' : 'boolean',
            'description' : 'Disable HTTP/2. HTTP/2 will be only used on HTTPS, in case the client supports it, in case this option is not present.'
        },
        'sslPort' : {
            'default' : 443,
            'description' : 'Port to listen on HTTPS traffic. HTTPS will be only started if sslPrivKey and sslChain are provided.'
        },
        'sslRederict' : {
            'type' : 'boolean',
            'description' : 'Rederict HTTP requests to HTTPS.'
        },
        'sslRederictPort' : {
            'default' : 0,
            'description' : 'Rederict HTTP requests to this port. In case this value is 0 sslPort will be used.'
        },
        'sslPrivKey' : {
            'type' : 'string',
            'description' : 'Path to a file containing the private key of your SSL certificate.'
        },
        'sslChain' : {
            'type' : 'string',
            'description' : 'Path to a file containing the public chain of your SSL certificate.'
        },
        'help' : {
            'alias' : 'h',
            'type' : 'boolean',
            'description' : 'Show this help.'
        }
    });
    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    // eventually this mime type configuration will need to change
    // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
    // *NOTE* Any changes you make here must be mirrored in web.config.
    var mime = express.static.mime;
    mime.define({
        'application/json' : ['czml', 'json', 'geojson', 'topojson'],
        'image/crn' : ['crn'],
        'image/ktx' : ['ktx'],
        'model/gltf+json' : ['gltf'],
        'model/gltf.binary' : ['bgltf', 'glb'],
        'text/plain' : ['glsl']
    });

    var app = express();
    app.use(compression());
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    app.use(express.static(__dirname));

    function getRemoteUrlFromParam(req) {
        var remoteUrl = req.params[0];
        if (remoteUrl) {
            // add http:// to the URL if no protocol is present
            if (!/^https?:\/\//.test(remoteUrl)) {
                remoteUrl = 'http://' + remoteUrl;
            }
            remoteUrl = url.parse(remoteUrl);
            // copy query string
            remoteUrl.search = url.parse(req.url).search;
        }
        return remoteUrl;
    }

    var dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

    function filterHeaders(req, headers) {
        var result = {};
        // filter out headers that are listed in the regex above
        Object.keys(headers).forEach(function(name) {
            if (!dontProxyHeaderRegex.test(name)) {
                result[name] = headers[name];
            }
        });
        return result;
    }

    var upstreamProxy = argv['upstream-proxy'];
    var bypassUpstreamProxyHosts = {};
    if (argv['bypass-upstream-proxy-hosts']) {
        argv['bypass-upstream-proxy-hosts'].split(',').forEach(function(host) {
            bypassUpstreamProxyHosts[host.toLowerCase()] = true;
        });
    }

    app.get('/proxy/*', function(req, res, next) {
        // look for request like http://localhost:8080/proxy/http://example.com/file?query=1
        var remoteUrl = getRemoteUrlFromParam(req);
        if (!remoteUrl) {
            // look for request like http://localhost:8080/proxy/?http%3A%2F%2Fexample.com%2Ffile%3Fquery%3D1
            remoteUrl = Object.keys(req.query)[0];
            if (remoteUrl) {
                remoteUrl = url.parse(remoteUrl);
            }
        }

        if (!remoteUrl) {
            return res.status(400).send('No url specified.');
        }

        if (!remoteUrl.protocol) {
            remoteUrl.protocol = 'http:';
        }

        var proxy;
        if (upstreamProxy && !(remoteUrl.host in bypassUpstreamProxyHosts)) {
            proxy = upstreamProxy;
        }

        // encoding : null means "body" passed to the callback will be raw bytes

        request.get({
            url : url.format(remoteUrl),
            headers : filterHeaders(req, req.headers),
            encoding : null,
            proxy : proxy
        }, function(error, response, body) {
            var code = 500;

            if (response) {
                code = response.statusCode;
                res.header(filterHeaders(req, response.headers));
            }

            res.status(code).send(body);
        });
    });

    var httpServer;
    if (argv.port > 0) {
        if (argv.sslRederict) {
            var redirectApp = express();
            httpServer = require('http').createServer(redirectApp);
            redirectApp.use(function requireHTTPS(req, res, next) {
                var hostname = req.headers.host.match(/:/g) ? req.headers.host.slice(0, req.headers.host.indexOf(':')) : req.headers.host;
                var portString = '';
                var sslRederictPort = (argv.sslRederictPort > 0) ? argv.sslRederictPort : argv.sslPort;
                if (sslRederictPort != 443) {
                    portString = ':' + sslRederictPort;
                }
                return res.redirect(301, 'https://' + hostname + portString + req.url);
                next();
            });
            httpServer.listen(argv.port, argv.public ? undefined : 'localhost', function() {
                console.log('Established rederict from HTTP (port %d) to HTTPS (port %d).', httpServer.address().port, argv.sslPort);
            });
        } else {
            httpServer = require('http').createServer(app);
            httpServer.listen(argv.port, argv.public ? undefined : 'localhost', function() {
                if (argv.public) {
                    console.log('Cesium development HTTP server running publicly.  Connect to http://localhost:%d/', httpServer.address().port);
                } else {
                    console.log('Cesium development HTTP server running locally.  Connect to http://localhost:%d/', httpServer.address().port);
                }
            });
        }

        httpServer.on('error', function (e) {
            if (e.code === 'EADDRINUSE') {
                console.log('Error: Port %d is already in use, select a different port.', argv.port);
                console.log('Example: node server.js --port %d', argv.port + 1);
            } else if (e.code === 'EACCES') {
                console.log('Error: This process does not have permission to listen on port %d.', argv.port);
                if (argv.port < 1024) {
                    console.log('Try a port number higher than 1024.');
                }
            }
            console.log(e);
            process.exit(1);
        });

        httpServer.on('close', function() {
            console.log('Cesium development HTTP server stopped.');
        });
    }

    var httpsServer;
    if (argv.sslPrivKey && argv.sslChain) {
        var fs = require('fs');
        var options;
        try {
            options = {
                key: fs.readFileSync(argv.sslPrivKey),
                cert: fs.readFileSync(argv.sslChain)
            };
        } catch (e) {
            console.log('Error:', e);
            process.exit(1);
        }

        if (argv.disableHTTP2) {
            httpsServer = require('https').createServer(options, app);
        } else {
            httpsServer = require('spdy').createServer(options, app);
        }
        httpsServer.listen(argv.sslPort, argv.public ? undefined : 'localhost', function() {
            if (argv.public) {
                console.log('Cesium development HTTPS server running publicly.  Connect to https://localhost:%d/', httpsServer.address().port);
            } else {
                console.log('Cesium development HTTPS server running locally.  Connect to https://localhost:%d/', httpsServer.address().port);
            }
        });

        httpsServer.on('error', function (e) {
            if (e.code === 'EADDRINUSE') {
                console.log('Error: Port %d is already in use, select a different port.', argv.sslPort);
                console.log('Example: node server.js --sslPort %d', argv.sslPort + 1);
            } else if (e.code === 'EACCES') {
                console.log('Error: This process does not have permission to listen on port %d.', argv.sslPort);
                if (argv.sslPort < 1024) {
                    console.log('Try a port number higher than 1024.');
                }
            }
            console.log(e);
            process.exit(1);
        });

        httpsServer.on('close', function() {
            console.log('Cesium development HTTPS server stopped.');
        });
    }

    var isFirstSig = true;
    process.on('SIGINT', function() {
        if (isFirstSig) {
            var remainingServer = 2;
            if (httpServer) {
                console.log('Cesium development HTTP server shutting down.');
                httpServer.close(function() {
                    remainingServer--;
                    if (remainingServer == 0) {
                        process.exit(0);
                    }
                });
            } else {
                remainingServer--;
            }
            if (httpsServer) {
                console.log('Cesium development HTTPS server shutting down.');
                httpsServer.close(function() {
                    remainingServer--;
                    if (remainingServer == 0) {
                        process.exit(0);
                    }
                });
            } else {
                remainingServer--;
            }
            isFirstSig = false;
        } else {
            console.log('Cesium development server force kill.');
            process.exit(1);
        }
    });

})();
