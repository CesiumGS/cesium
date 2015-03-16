1.0.8 / 2014-06-20
==================

  * deps: accepts@~1.0.5
    - use `mime-types`

1.0.7 / 2014-06-11
==================

 * use vary module for better `Vary` behavior
 * deps: accepts@1.0.3
 * deps: compressible@1.1.0

1.0.6 / 2014-06-03
==================

 * fix regression when negotiation fails

1.0.5 / 2014-06-03
==================

 * fix listeners for delayed stream creation
   - fixes regression for certain `stream.pipe(res)` situations

1.0.4 / 2014-06-03
==================

 * fix adding `Vary` when value stored as array
 * fix back-pressure behavior
 * fix length check for `res.end`

1.0.3 / 2014-05-29
==================

 * use `accepts` for negotiation
 * use `on-headers` to handle header checking
 * deps: bytes@1.0.0

1.0.2 / 2014-04-29
==================

 * only version compatible with node.js 0.8
 * support headers given to `res.writeHead`
 * deps: bytes@0.3.0
 * deps: negotiator@0.4.3

1.0.1 / 2014-03-08
==================

 * bump negotiator
 * use compressible
 * use .headersSent (drops 0.8 support)
 * handle identity;q=0 case
