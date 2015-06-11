PubsubJS
===

[![build status](https://secure.travis-ci.org/nazomikan/PubsubJS.png)](http://travis-ci.org/nazomikan/PubsubJS)

## Description

pubsubjs is Micro pubsub library which provides the observer pattern to JavaScript.

It works in the browser and server (Node).


## Usage

In browser DownLoad pubsub.js,
or install via bower

```sh
$ bower install pubsubjs
```

and then include single JavaScript file:

```html
<script type="text/javascript" src="pubsub.js"></script>
<script type="text/javascript">
    var pubsub = Pubsub.create();
    ...
</script>
```

On server install PubsubJS via npm first:

```sh
npm install pubsubjs
```

and then include it in your project with:

```javascript
var pubsub = require('pubsubjs').create();
```

##What is Pubsub

>Publish–subscribe is a messaging pattern where senders of messages, called publishers, do not program the messages to be sent directly to specific receivers, called subscribers. Published messages are characterized into classes, without knowledge of what, if any, subscribers there may be. Subscribers express interest in one or more classes, and only receives messages that are of interest, without knowledge of what, if any, publishers there are.

>http://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern



##Example Usage

### pubsub#publish / pubsub#subscribe

For example, "The display of notifications and mail to desktop when mail arrives" can be written using PubsubJS as follows.

```javascript
// Define the global subscriber use of pubsubjs
pubsub.subscribe('mail.arrived', function (context, mailId) {
    mailer.display(mailId);
});

pubsub.subscribe('mail.arrived', function (context, mailId) {
    desktop.notice('a mail has arrived');
});

mailer.polling({
    onArrived: function (mailId) {
        pubsub.publish('mail.arrived', null, mailId);
    },
    …
});
```

Also, you may want to think subscriber publish as below.

```javascript
pubsub.subscribe('mail.arrived', function (context, mailId) {
    mailer.display(mailId);
    pubsub.publish('mail.displayed'); // call 'mail.displayed' subscribers
});

pubsub.subscribe('mail.arrived', function (context, mailId) {
    desktop.notice('a mail has arrived');
    pubsub.publish('descktop.noticed'); // call 'desktop.noticed' subscribers
});

mailer.polling({
    onArrived: function (mailId) {
        pubsub.publish('mail.arrived', null, mailId);
    },
    …
});
```

### pubsub#subscribeOnce

When are notified first and a subscriber is performed.

It is realizable by using `subscribeOnce`.

```javascript
var pubsub = PubSub.create()
  , actual = {a: 0}
  ;

pubsub.subscribeOnce('once', function () {
  actual.a += 1;
});
pubsub.publish('once');
pubsub.publish('once');
assert.strictEqual(1, actual.a); // pass
```

### pubsub#unsubscribe

You may think that you would like to remove subscriber at the time of some conditions. 
It is realizable by using `unsubscribe`.

```javascript
var pubsub = PubSub.create()
  , actual = {a: 0}
  ;

var fn = function () {
  actual.a += 1;
  if (actual.a > 1) {
    pubsub.unsubscribe('once', fn);
  }
};

pubsub.subscribe('event', fn);
pubsub.publish('event');
pubsub.publish('event');
pubsub.publish('event');
assert.strictEqual(2, actual.a); // pass
```

### pubsub#Context

pubsub#Context is the most useful API in this library.
It is a bit more complex cases, there will often suffer from following situation.

```javascript
// in jQuery
pubsub.subscribe('favorite.add', function (context, id) {
    $.ajax({
        url: xxx,
        data: {id: id}
    }).done(function () {
        // Can not access the $(evt.currentTarget) here.
    });
});

$(favoriteIcon).bind('click', function (evt) {
    var id = $(evt.currentTarget).data('id');
    pubsub.publish('favorite.add', null, id);
    // want to change the class when "favorite.add" is completed.
    // ex. $(evt.currentTarget).addClass('is-added');
    // However, since the processing of "favorite.add" is async,
    // I can not write it here.
});
```

This can be solved by using the pubsub#Context.

```javascript
// in jQuery
pubsub.subscribe('favorite.add', function (context, id) {
    $.ajax({
        url: xxx,
        data: {id: id}
    }).done(function () {
        context.publish('favorite.added');
    });
});

$(favoriteIcon).bind('click', function (evt) {
    var target = $(evt.currentTarget),
        id = target.data('id'),
        localContext = pubsub.Context.create();

    localContext.subscribe('favorite.added', function (context) {
        target.addClass('is-added');
    });

    pubsub.publish('favorite.add', localContext, id);
});
```

### pubsub#dump

You would think when you are developing, you want to know what kind of handler has been registered to any event.

It is a good idea to use the pubsub#dump of the API for debugging such a case.

```javascript
var pubsub = PubSub.create()
  , actual
  ;

function a() {}
function b() {}
function c() {}

pubsub.subscribe('event1', a);
pubsub.subscribe('event1', b);
pubsub.subscribe('event2', c);

actual = pubsub.dump();
assert.deepEqual(actual, {event1: [a, b], event2: [c]});
```

If you want to check handlers that are registered to a particular event, it is preferable to provide an event name as an argument.

```javascript
var pubsub = PubSub.create()
  , actual
  ;

function a() {}
function b() {}
function c() {}

pubsub.subscribe('event1', a);
pubsub.subscribe('event1', b);
pubsub.subscribe('event2', c);

actual = pubsub.dump('event1');
assert.deepEqual(actual, [a, b]);
```

Notice: This API is for debugging purposes only.  Please do not use in production code.


##All API

 * Pubsub#create()
 * pubsub#publish(eventName, context/null, arg1, arg2...)
 * pubsub#subscribe(eventName, handler)
 * pubsub#subscribeOnce(eventName, handler)
 * pubsub#unsubscribe(eventName, [handler])
 * pubsub#dump([eventName])
 * pubsub#globalContext
 * pubsub#Context
 * Context#create()
 * context#publish(eventName, context/null, arg1, arg2...)
 * context#subscribe(eventName, handler)
 * context#subscribeOnce(eventName, handler)
 * context#unsubscribe(eventName, [handler])
 * context#dump([eventName])


##Contributors

* [@nazomikan](http://github.com/nazomikan)

##License:
<pre>
(The MIT License)

Copyright (c) 2013 nazomikan
https://github.com/nazomikan/PubsubJS

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
</pre>

