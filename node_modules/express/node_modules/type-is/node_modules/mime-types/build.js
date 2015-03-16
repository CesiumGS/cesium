
/**
 * http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types
 * https://github.com/broofa/node-mime/blob/master/types/node.types
 *
 * Convert these text files to JSON for browser usage.
 */

var co = require('co')
var fs = require('fs')
var path = require('path')
var cogent = require('cogent')

function* get(url) {
  var res = yield* cogent(url, {
    string: true
  })

  if (res.statusCode !== 200)
    throw new Error('got status code ' + res.statusCode + ' from ' + url)

  var text = res.text
  var json = {}
  // http://en.wikipedia.org/wiki/Internet_media_type#Naming
  /**
   * Mime types and associated extensions are stored in the form:
   *
   *   <type> <ext> <ext> <ext>
   *
   * And some are commented out with a leading `#` because they have no associated extensions.
   * This regexp checks whether a single line matches this format, ignoring lines that are just comments.
   * We could also just remove all lines that start with `#` if we want to make the JSON files smaller
   * and ignore all mime types without associated extensions.
   */
  var re = /^(?:# )?([\w-]+\/[\w\+\.-]+)(?:\s+\w+)*$/
  text = text.split('\n')
  .filter(Boolean)
  .forEach(function (line) {
    line = line.trim()
    if (!line) return
    var match = re.exec(line)
    if (!match) return
    // remove the leading # and <type> and return all the <ext>s
    json[match[1]] = line.replace(/^(?:# )?([\w-]+\/[\w\+\.-]+)/, '')
      .split(/\s+/)
      .filter(Boolean)
  })
  fs.writeFileSync('lib/' + path.basename(url).split('.')[0] + '.json',
    JSON.stringify(json, null, 2) + '\n')
}

co(function* () {
  yield [
    get('http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types'),
    get('https://raw.githubusercontent.com/broofa/node-mime/master/types/node.types')
  ]
})()
