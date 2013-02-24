dojo.provide("dojox.atom.tests.io.module");
dojo.require("dojox.atom.io.model");
dojo.require("dojox.atom.io.Connection");
dojo.require("dojox.data.dom");
dojo.require("dojo.date.stamp");
dojo.require("dojo.date");

doh.register("dojox.atom.tests.io.module", [
	// Public utility functions
	// dojox.atom.io.model.util.createDate
	function checkCreateDate(t){
		var node = document.createElement("div");
		var knownDate = "2007-08-06T20:00:00-04:00";
		var date = dojo.date.stamp.fromISOString(knownDate);

		//Make sure this function handles creating dates right with spaces and such in the text.
		node.innerHTML = "  " + knownDate + "  ";
		var dateWithSpaces = dojox.atom.io.model.util.createDate(node);

		var res = dojo.date.compare(dateWithSpaces, date);
		t.t(res === 0);
	},

	// dojox.atom.io.model.util.escapeHtml
	function checkEscapeHTML(t){
		var original = "<html><head><title>This is a \"Test Title\"</title></head><body class=\"tundra\">Woo hoo, this is an awesome & exciting test case!</body></html>";
		var escaped = dojox.atom.io.model.util.escapeHtml(original);
		var expected = "&lt;html&gt;&lt;head&gt;&lt;title&gt;This is a &quot;Test Title&quot;&lt;/title&gt;&lt;/head&gt;&lt;body class=&quot;tundra&quot;&gt;Woo hoo, this is an awesome &amp; exciting test case!&lt;/body&gt;&lt;/html&gt;";
		t.is(expected, escaped);
	},
	
	// dojox.atom.io.model.util.unEscapeHtml
	function checkUnEscapeHtml(t){
		var original = "&lt;html&gt;&lt;head&gt;&lt;title&gt;This is a &quot;Test Title&quot;&lt;/title&gt;&lt;/head&gt;&lt;body class=&quot;tundra&quot;&gt;Woo hoo, this is an awesome &amp; exciting test case!&lt;/body&gt;&lt;/html&gt;";
		var unescaped = dojox.atom.io.model.util.unEscapeHtml(original);
		var expected = "<html><head><title>This is a \"Test Title\"</title></head><body class=\"tundra\">Woo hoo, this is an awesome & exciting test case!</body></html>";
		t.is(expected, unescaped);
		t.is("&lt;", dojox.atom.io.model.util.unEscapeHtml("&amp;lt;"));
	},

	// dojox.atom.io.model.util.getNodename
	function checkGetNodename(t){
		var node = document.createElement("div");
		t.is("div", dojox.atom.io.model.util.getNodename(node).toLowerCase());
		
		node = dojox.data.dom.createDocument("<root><first/><second/><third/></root>").firstChild;
		t.is("root", dojox.atom.io.model.util.getNodename(node));
		var n = node.firstChild;
		dojo.forEach(["first", "second", "third"], function(name){
			t.is(name, dojox.atom.io.model.util.getNodename(n));
			node.removeChild(n);
			n = node.firstChild;
		});
	},

	// Feed parsing, feed attributes (title, id, etc.) and functions, including all generic AtomItem methods
	// Incidently, also tests AtomIO.getFeed success, as well as all members of the Category, Content, Link,
	// and Person classes.
	{
		name: "checkFeed",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getFeed(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeed.xml').toString(), function(feed){
				var i;
				// regular callback
				// Feed variables
				t.is('Example.com', feed.title.value);
				feed.setTitle('Example.com Atom Feed', 'text');
				t.is('Example.com Atom Feed', feed.title.value);
				t.is('Example.com\'s Sample Feed', feed.subtitle.value);
				t.is('Copyright Example.com', feed.rights);
				t.is('http://example.com/samplefeed.xml', feed.id);
				t.is(dojo.date.stamp.fromISOString('2007-08-07T20:00:00-05:00'), feed.updated);

				// AtomItem methods
				feed.addNamespace('http://www.test.com');
				t.is({}, feed.name_spaces);
				feed.addNamespace('', 'test');
				t.is({}, feed.name_spaces);
				feed.addNamespace('http://www.test.com', 'test');
				t.is({'test': 'http://www.test.com'}, feed.name_spaces);

				t.is(null, feed.authors);
				feed.addAuthor('John');
				feed.addAuthor('Matt', 'matt@example.com');
				feed.addAuthor('Joe', 'joe@example.com', 'http://joe.example.com');
				t.t(dojo.isArray(feed.authors));
				t.t(feed.authors.length === 3);

				t.is(null, feed.contributors);
				feed.addContributor('Sam');
				feed.addContributor('Dave', 'Dave@example.com');
				feed.addContributor('Harry', 'harry@example.com', 'http://harry.example.com');
				t.t(dojo.isArray(feed.contributors));
				t.t(feed.contributors.length === 3);

				t.t(dojo.isArray(feed.links));
				t.t(feed.links.length === 2);
				feed.removeLink('http://example.com/', 'alternate');
				t.t(feed.links.length === 1);
				feed.addLink('http://www.example.com/', 'alternate', 'en', 'Example.com', 'text/html');
				t.t(feed.links.length === 2);
				feed.addLink('http://test.example.com/', '', 'en', 'Example.com', 'text/html');
				t.t(feed.links.length === 3);
				feed.removeBasicLinks();
				t.t(feed.links.length === 2);

				t.is(null, feed.categories);
				feed.addCategory("scheme", "term", "label");
				feed.addCategory("scheme", "term2", "label2");
				feed.addCategory("scheme2", "term", "label");
				t.t(dojo.isArray(feed.categories));
				t.t(feed.categories.length === 3);
				var c = feed.getCategories("scheme");
				t.t(c.length === 2);
				c = feed.getCategories("scheme2");
				t.t(c.length === 1);
				feed.removeCategories("scheme", "term2");
				t.t(feed.categories.length === 2);
				feed.removeCategories("scheme", "term");
				t.t(feed.categories.length === 1);
				feed.removeCategories("scheme2", "term");
				t.t(feed.categories.length === 0);

				t.is(null, feed.extensions);
				t.is([], feed.getExtensions());
				feed.addExtension('nameSpace', 'element', [], 'A Test Element', 'sns');
				feed.addExtension('nameSpace', 'element2', [], 'Another Test Element', 'sns');
				feed.addExtension('anotherNameSpace', 'element', [], 'A Test Element', 'asns');
				t.t(feed.extensions.length === 3);
				t.t(feed.getExtensions('nameSpace').length === 2);
				t.t(feed.getExtensions('nameSpace', 'element').length === 1);
				t.t(feed.getExtensions('anotherNameSpace', 'element').length === 1);
				t.t(feed.getExtensions('sns').length === 2);
				feed.removeExtensions('anotherNameSpace', 'element');
				feed.removeExtensions('sns', 'element2');
				t.t(feed.getExtensions('anotherNameSpace').length === 0);
				t.t(feed.getExtensions('sns').length === 1);

				// Feed methods
				t.t(feed.accept('title'));
				t.t(feed.accept('entry'));
				t.f(feed.accept('workspace'));

				var e = feed.getFirstEntry();
				t.f(e === null);
				t.t(e.id === 'http://example.com/samplefeed.xml/entry/1');
				t.t(feed.entries.length === 6);
				feed.removeEntry(e);
				t.t(feed.entries.length === 5);
				t.t(feed.getEntry('http://example.com/samplefeed.xml/entry/1') === null);
				e = feed.getFirstEntry();
				t.t(e.id === 'http://example.com/samplefeed.xml/entry/2');
				e = feed.getEntry('http://example.com/samplefeed.xml/entry/4');
				t.f(e === null);
				t.t(e.title.value === 'Test Entry #4');
				e = new dojox.atom.io.model.Entry();
				t.e(Error, feed, 'addEntry', [e]);
				t.t(feed.entries.length === 5);
				e.id = 'http://example.com/samplefeed.xml/newentry/1';
				feed.addEntry(e);
				t.t(feed.entries.length === 6);
				var entries = [];
				for(i=2; i<5; i++){
					e = new dojox.atom.io.model.Entry();
					e.id = 'http://example.com/samplefeed.xml/newentry/'+i;
					entries.push(e);
				}
				feed.setEntries(entries);
				t.t(feed.entries.length === 9);
				
				e = feed.getSelfHref();
				t.t(e === 'http://www.example.com/samplefeed.xml');
				e = feed.createEntry();
				t.t(e.feedUrl === 'http://www.example.com/samplefeed.xml');
				

				for(i=2; i<7; i++){
					e = feed.getEntry('http://example.com/samplefeed.xml/entry/'+i);
					feed.removeEntry(e);
				}
				t.t(feed.entries.length === 4);

				//Make this test work in different timezones.
				var isoString = dojo.date.stamp.toISOString(dojo.date.stamp.fromISOString('2007-08-07T20:00:00-05:00'));
				var str = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns=\"http://www.w3.org/2005/Atom\" xmlns:test=\"http://www.test.com\">\n<id>http://example.com/samplefeed.xml</id>\n<title  type=\"text\" >Example.com Atom Feed</title>\n<rights>Copyright Example.com</rights>\n"
				str +="<updated>" + isoString + "</updated>\n<subtitle  type=\"text\" >Example.com's Sample Feed</subtitle>\n<author>\n\t<name>John</name>\n</author>\n<author>\n\t<name>Matt</name>\n\t<email>matt@example.com</email>\n</author>\n<author>\n\t<name>Joe</name>\n\t<email>joe@example.com</email>\n\t<uri>http://joe.example.com</uri>\n</author>\n<contributor>\n\t<name>Sam</name>\n</contributor>\n<contributor>\n\t<name>Dave</name>\n\t<email>Dave@example.com</email>\n</contributor>\n<contributor>\n\t<name>Harry</name>\n\t<email>harry@example.com</email>\n\t<uri>http://harry.example.com</uri>\n</contributor>\n<sns:element xmlns='nameSpace'>A Test Element</sns:element>\n<entry>\n<id>http://example.com/samplefeed.xml/newentry/1</id>\n</entry>\n<entry>\n<id>http://example.com/samplefeed.xml/newentry/2</id>\n</entry>\n<entry>\n<id>http://example.com/samplefeed.xml/newentry/3</id>\n</entry>\n<entry>\n<id>http://example.com/samplefeed.xml/newentry/4</id>\n</entry>\n</feed>";
				t.t(feed.toString() == str);

				d.callback(true);
			}, function(e){
				// error callback
				console.debug(e);
				d.errback("Feed fetching failed");
			});
			return d;
		}
	},

	// Entry parsing, entry functions that are unique (not AtomItem)
	// Incidently, also tests success of AtomIO.getEntry
	{
		name: "checkEntry",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getFeed(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeedEdit.xml').toString(), function(feed){
				t.is('Example.com', feed.title.value);
				var e = feed.createEntry();
				var str = e.getEditHref();
				t.t(str === null);

				e = feed.getFirstEntry();
				str = e.getEditHref();
				t.t(str === null);

				e = feed.getEntry('http://example.com/samplefeedEdit.xml/entry/10');
				str = e.getEditHref();
				t.t(str === 'http://example.com/samplefeedEdit.xml/entry/edit/10');

				d.callback(true);
			}, function(){
				// error callback
				d.errback("Feed fetching failed");
			});
			return d;
		}
	},

	// Entry parsing, entry functions that are unique (not AtomItem)
	// Incidently, also tests success of AtomIO.getEntry
	{
		name: "checkXmlEntry",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getFeed(dojo.moduleUrl('dojox.atom.tests.io', 'sampleFeedXMLContent.xml'), function(feed){
				try{
					t.is('Example.com', feed.title.value);
					var e = feed.getFirstEntry();
					t.t(e.title.value == "Test Entry #1");
					var c = e.content.value;
					c = dojo.trim(c);
					t.t(c.indexOf("<rootNode ") === 0);
					d.callback(true);
				}catch(err){
					d.errback(err);
				}
			}, function(){
				// error callback
				d.errback("Feed fetching failed");
			});
			return d;
		}
	},

	{
		name: "checkEntry_preventCache",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection(false, true);
			atomio.getFeed(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeedEdit.xml').toString(), function(feed){
				t.is('Example.com', feed.title.value);
				var e = feed.createEntry();
				var str = e.getEditHref();
				t.t(str === null);

				e = feed.getFirstEntry();
				str = e.getEditHref();
				t.t(str === null);

				e = feed.getEntry('http://example.com/samplefeedEdit.xml/entry/10');
				str = e.getEditHref();
				t.t(str === 'http://example.com/samplefeedEdit.xml/entry/edit/10');

				d.callback(true);
			}, function(){
                                // error callback
			d.errback("Feed fetching failed");
			});
			return d;
		}
	},

	// AtomIO tests
	{
		name: "checkAtomIOGetFeedFail",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getFeed(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefee.xml').toString(), function(feed){
				d.errback("Feed fetching succeeded when it should've failed");
			}, function(error, args){
				// error callback
				t.t(error.name === 'Error');
				t.t(error.status === 404);
				d.callback(true);
			});
			return d;
		}
	},{
		name: "checkAtomIOGetFeedSuccess",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getFeed(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeed.xml').toString(), function(feed){
				// Feed Fetching succeeded
				t.t(feed.title.value === 'Example.com');
				d.callback(true);
			}, function(error, args){
				// error callback
				d.errback("Feed fetching failed");
			});
			return d;
		}
	},{
		name: "checkAtomIOGetEntryFail",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getEntry(dojo.moduleUrl('dojox.atom.tests.io', 'sampleEntr.xml').toString(), function(entry){
				d.errback("Feed fetching succeeded when it should've failed");
			}, function(error, args){
				// error callback
				t.t(error.name === 'Error');
				t.t(error.status === 404);
				d.callback(true);
			});
			return d;
		}
	},{
		name: "checkAtomIOGetEntrySuccess",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getEntry(dojo.moduleUrl('dojox.atom.tests.io', 'sampleEntry.xml').toString(), function(entry){
				t.t(entry.title.value === 'Test Entry #1');
				t.t(entry.id === 'http://example.com/sampleEntry.xml/entry/1');
				d.callback(true);
			}, function(error, args){
				// error callback
				d.errback("Feed fetching failed");
			});
			return d;
		}
	},{
		name: "checkAtomIOGetEntryFeedSuccess",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getEntry(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeed.xml').toString(), function(entry){
				// Using getEntry on a Feed URL yields the first Entry in the Feed.
				t.t(entry.title.value === 'Test Entry #1');
				t.t(entry.id === 'http://example.com/samplefeed.xml/entry/1');
				d.callback(true);
			}, function(error, args){
				// error callback
				d.errback("Feed fetching failed");
			});
			return d;
		}
	},{
		name: "checkGetService",
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getService(dojo.moduleUrl('dojox.atom.tests.io', 'service.xml').toString(), function(service, domNode){
				var collection = service.getCollection("http://example.com/feed");
				t.t(collection[0].href === 'http://example.com/feed');
				t.t(collection[0].title === 'Test Collection');
				d.callback(true);
			}, function(error, args){
				// error callback
				d.errback("Service fetching failed");
			});
			return d;
		}
	},{
		name: "checkAtomIOUpdateEntrySuccess",
		timeout: 5000,
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getEntry(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeed.xml').toString(), function(entry){
				// Using getEntry on a Feed URL yields the first Entry in the Feed.
				t.t(entry.title.value === 'Test Entry #1');
				t.t(entry.id === 'http://example.com/samplefeed.xml/entry/1');
				entry.setEditHref(dojo.moduleUrl('dojox.atom.tests.io', 'app.php'));
				entry.setTitle('<h1>New Editable Title!</h1>', 'xhtml');
				atomio.updateEntry(entry, function(e, dom, args){
					t.t(e.title.value === '<h1>New Editable Title!</h1>');
					t.t(e.id === 'http://example.com/samplefeed.xml/entry/1');
					d.callback(true);
				}, function(error, args){
					d.errback("Updating entry failed");
				});
			}, function(error, args){
				// error callback
				d.errback("Feed fetching failed");
			});
			return d;
		}
	},{
		name: "checkAtomIOUpdateEntryFail",
		timeout: 5000,
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getEntry(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeed.xml').toString(), function(entry){
				// Using getEntry on a Feed URL yields the first Entry in the Feed.
				t.t(entry.title.value === 'Test Entry #1');
				t.t(entry.id === 'http://example.com/samplefeed.xml/entry/1');
				entry.setEditHref(dojo.moduleUrl('dojox.atom.tests.io', 'appFail.php'));
				entry.setTitle('<h1>New Editable Title!</h1>', 'xhtml');
				atomio.updateEntry(entry, function(e, dom, args){
					d.errback("Updating entry succeeded");
				}, function(error, args){
					d.callback(true);
				});
			}, function(error, args){
				// error callback
				d.errback("Updating entry failed.");
			});
			return d;
		}
	},{
		name: "checkAtomIOAddEntrySuccess",
		timeout: 5000,
		runTest: function(t){
			var d = new doh.Deferred();
			var entry = new dojox.atom.io.model.Entry();
			entry.setTitle('Test Editable Entry #1', 'text');
			entry.addAuthor('Test Person', 'test@example.com');
			entry.content = new dojox.atom.io.model.Content('content', 'This is the content of my test new entry!', null, 'text');
			var atomio = new dojox.atom.io.Connection();
			atomio.addEntry(entry, dojo.moduleUrl('dojox.atom.tests.io', 'app.php').toString(), function(entry, url){
				t.t(entry.title.value === 'Test Editable Entry #1');
				t.t(url === 'http://example.com/samplefeed.xml/entry/10');
				d.callback(true);
			}, function(error, args){
				// error callback
				d.errback("Adding entry failed.");
			});
			return d;
		}
	},{
		name: "checkAtomIOAddEntryFail",
		timeout: 5000,
		runTest: function(t){
			var d = new doh.Deferred();
			var entry = new dojox.atom.io.model.Entry();
			// Missing title, author
			entry.content = new dojox.atom.io.model.Content('content', 'This is the content of my test new entry!', null, 'text');
			var atomio = new dojox.atom.io.Connection();
			atomio.addEntry(entry, dojo.moduleUrl('dojox.atom.tests.io', 'appFail.php').toString(), function(entry, url){
				// error callback
				d.errback("Adding entry succeeded when it shouldn't!");
			}, function(error, args){
				d.callback(true);
			});
			return d;
		}
	},{
		name: "checkAtomIODeleteEntrySuccess",
		timeout: 5000,
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getEntry(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeed.xml').toString(), function(entry){
				// Using getEntry on a Feed URL yields the first Entry in the Feed.
				t.t(entry.title.value === 'Test Entry #1');
				t.t(entry.id === 'http://example.com/samplefeed.xml/entry/1');
				entry.setEditHref(dojo.moduleUrl('dojox.atom.tests.io', 'app.php'));
				atomio.deleteEntry(entry, function(result){
					if (result) {
						d.callback(true);
					}else{
						d.errback("Deleting entry failed");
					}
				}, function(error, args){
					d.errback("Deleting entry failed");
				});
			}, function(error, args){
				// error callback
				d.errback("Retreiving the entry failed.");
			});
			return d;
		}
	},{
		name: "checkAtomIODeleteEntryFail",
		timeout: 5000,
		runTest: function(t){
			var d = new doh.Deferred();
			var atomio = new dojox.atom.io.Connection();
			atomio.getEntry(dojo.moduleUrl('dojox.atom.tests.widget', 'samplefeed.xml').toString(), function(entry){
				// Using getEntry on a Feed URL yields the first Entry in the Feed.
				t.t(entry.title.value === 'Test Entry #1');
				t.t(entry.id === 'http://example.com/samplefeed.xml/entry/1');
				entry.setEditHref(dojo.moduleUrl('dojox.atom.tests.io', 'appFail.php'));
				atomio.deleteEntry(entry, function(result){
					if (result) {
						d.errback("Deleting entry succeeded but it shouldn't have");
					}else{
						d.errback("The callback was called but it shouldn't have");
					}
				}, function(error, args){
						d.callback(true);
				});
			}, function(error, args){
				// error callback
				d.errback("Retreiving the entry failed.");
			});
			return d;
		}
	}
]);
