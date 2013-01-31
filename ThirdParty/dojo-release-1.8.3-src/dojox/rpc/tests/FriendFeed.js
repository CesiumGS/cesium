dojo.provide('dojox.rpc.tests.FriendFeed');

dojo.require('dojo.io.script');
dojo.require('dojox.rpc.Service');

(function() {

// simple class to help write tests...
dojo.declare("dojox.rpc.tests.FFTest",null, {
    name: "",
    timeout: 8000,

    constructor: function(name, method, parameters, fn) {
        var props = { name: name,
                      _method: method,
                      _parameters: parameters,
                      _test: fn
        };
        dojo.mixin( this, props );
        return this;
    },
    setUp: function() {
        this.service = new dojox.rpc.Service(
                     dojo.moduleUrl("dojox.rpc.SMDLibrary", "friendfeed.smd"));
    },
    runTest: function( t ) {
        var d = new doh.Deferred();
        var ff = this.service[ this._method ]( this._parameters );
        ff.addCallback( this, function( results ) {
            if ( results.errorCode ) {
                d.errback( new Error("Test failed", results ) );
            } else {
                if ( this._test( results ) )  {
                    d.callback( true );
                } else {
                    d.errback( new Error("Test failed ", results ) );
                }
            }
            return d;
        });
    },
    tearDown: function() {
        this.service = undefined;
    }
});

// test the methods and parameters of the SMD file
doh.register('dojox.rpc.tests.friendfeed',
    [
    new dojox.rpc.tests.FFTest("#1 Users",
        "users",
        { nickname: "paul" },
        function( results ) {
            return results.entries;
        }
    ),
    new dojox.rpc.tests.FFTest("#2 Search",
        "search",
        { q: "dojo" },
        function ( results ) {
            return results.entries;
        }
    ),
    new dojox.rpc.tests.FFTest("#3 Domain",
        "entry",
        { entry_id: "245da66c-d6dd-8a4b-1719-b5bfb1f9d5eb" },
        function ( results ) {
          return results.entries && results.entries.length == 1;
          // ???: check user info too?
        }
    ),
    new dojox.rpc.tests.FFTest("#4 URL",
        "url",
        { url: "http://blog.medryx.org/tag/doh/"  },
        function( results ) {
            return results.entries && results.entries.length >= 1;
        }
    ),
    new dojox.rpc.tests.FFTest("#5 Domain",
        "domain",
        { domain: "dojotoolkit.org" },
        function ( results ) {
            return results.entries && results.entries.length >=1;
        }
    ),
    new dojox.rpc.tests.FFTest("#6 Parameter - service",
        "users",
        { nickname: "paul", service: "twitter" },
        function ( results ) {
            var ent  = dojo.filter( results.entries, function( entry ) {
                return entry.service.id != 'twitter';
            });
            return ent.length == 0;
        }
    ),
    new dojox.rpc.tests.FFTest("#7 Parameter - num",
        "users",
        { nickname: "paul", num: 42 },
        function ( results ) {
            return results.length == 42;
        }
    )
]);
 })();
