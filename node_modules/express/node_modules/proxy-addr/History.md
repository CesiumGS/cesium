1.0.1 / 2014-06-03
==================

  * Fix links in npm package

1.0.0 / 2014-05-08
==================

  * Add `trust` argument to determine proxy trust on
    * Accepts custom function
    * Accepts IPv4/IPv6 address(es)
    * Accepts subnets
    * Accepts pre-defined names
  * Add optional `trust` argument to `proxyaddr.all` to
    stop at first untrusted
  * Add `proxyaddr.compile` to pre-compile `trust` function
    to make subsequent calls faster

0.0.1 / 2014-05-04
==================

  * Fix bad npm publish

0.0.0 / 2014-05-04
==================

  * Initial release
