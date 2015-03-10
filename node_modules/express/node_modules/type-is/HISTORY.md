
1.2.1 / 2014-06-03
==================

* Switch dependency from `mime` to `mime-types@1.0.0`

1.2.0 / 2014-05-11
==================

 * support suffix matching:

   - `+json` matches `application/vnd+json`
   - `*/vnd+json` matches `application/vnd+json`
   - `application/*+json` matches `application/vnd+json`

1.1.0 / 2014-04-12
==================

 * add non-array values support
 * expose internal utilities:

   - `.is()`
   - `.hasBody()`
   - `.normalize()`
   - `.match()`

1.0.1 / 2014-03-30
==================

 * add `multipart` as a shorthand
