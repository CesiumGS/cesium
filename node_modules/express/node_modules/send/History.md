0.4.3 / 2014-06-11
==================

 * Do not throw un-catchable error on file open race condition
 * Use `escape-html` for HTML escaping
 * deps: debug@1.0.2
   - fix some debugging output colors on node.js 0.8
 * deps: finished@1.2.2
 * deps: fresh@0.2.2

0.4.2 / 2014-06-09
==================

 * fix "event emitter leak" warnings
 * deps: debug@1.0.1
 * deps: finished@1.2.1

0.4.1 / 2014-06-02
==================

 * Send `max-age` in `Cache-Control` in correct format

0.4.0 / 2014-05-27
==================

 * Calculate ETag with md5 for reduced collisions
 * Fix wrong behavior when index file matches directory
 * Ignore stream errors after request ends
   - Goodbye `EBADF, read`
 * Skip directories in index file search
 * deps: debug@0.8.1

0.3.0 / 2014-04-24
==================

 * Fix sending files with dots without root set
 * Coerce option types
 * Accept API options in options object
 * Set etags to "weak"
 * Include file path in etag
 * Make "Can't set headers after they are sent." catchable
 * Send full entity-body for multi range requests
 * Default directory access to 403 when index disabled
 * Support multiple index paths
 * Support "If-Range" header
 * Control whether to generate etags
 * deps: mime@1.2.11

0.2.0 / 2014-01-29
==================

 * update range-parser and fresh

0.1.4 / 2013-08-11 
==================

 * update fresh

0.1.3 / 2013-07-08 
==================

 * Revert "Fix fd leak"

0.1.2 / 2013-07-03 
==================

 * Fix fd leak

0.1.0 / 2012-08-25 
==================

  * add options parameter to send() that is passed to fs.createReadStream() [kanongil]

0.0.4 / 2012-08-16 
==================

  * allow custom "Accept-Ranges" definition

0.0.3 / 2012-07-16 
==================

  * fix normalization of the root directory. Closes #3

0.0.2 / 2012-07-09 
==================

  * add passing of req explicitly for now (YUCK)

0.0.1 / 2010-01-03
==================

  * Initial release
