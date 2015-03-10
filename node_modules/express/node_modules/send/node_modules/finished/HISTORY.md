1.2.2 / 2014-06-10
==========

  * reduce listeners added to emitters
    - avoids "event emitter leak" warnings when used multiple times on same request

1.2.1 / 2014-06-08
==================

  * fix returned value when already finished

1.2.0 / 2014-06-05
==================

  * call callback when called on already-finished socket

1.1.4 / 2014-05-27
==================

  * support node.js 0.8

1.1.3 / 2014-04-30
==================

  * make sure errors passed as instanceof `Error`

1.1.2 / 2014-04-18
==================

  * default the `socket` to passed-in object

1.1.1 / 2014-01-16
==================

  * rename module to `finished`

1.1.0 / 2013-12-25
==================

  * call callback when called on already-errored socket

1.0.1 / 2013-12-20
==================

  * actually pass the error to the callback

1.0.0 / 2013-12-20
==================

  * Initial release
