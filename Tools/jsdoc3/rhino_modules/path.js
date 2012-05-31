
var isWindows = java.lang.System.getProperty("os.name").toLowerCase().contains("windows");
var fileSeparator = java.lang.System.getProperty("file.separator");

/**
 * Returns everything on a path except for the last item
 * e.g. if the path was 'path/to/something', the return value would be 'path/to'
 */
exports.basename = function(path) {
    var parts = path.split(fileSeparator);
    parts.pop();
    path = parts.join(fileSeparator);
    return path;
};

/**
 *  Returns the last item on a path
 */
exports.filename = function(path) {
    var parts = path.split(fileSeparator);
    if (parts.length > 0) {
        return parts.pop();
    }
    return null;
};

exports.existsSync = function(path) {
    var file = new java.io.File(path);

    if (file.isFile()) {
       return true;
    }

    return false;
};

//Code below taken from node

//resolves . and .. elements in a path array with directory names there
//must be no slashes, empty elements, or device names (c:\) in the array
//(so also no leading and trailing slashes - it does not distinguish
//relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for ( var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last == '.') {
            parts.splice(i, 1);
        } else if (last === '..') {
            parts.splice(i, 1);
            up++;
        } else if (up) {
            parts.splice(i, 1);
            up--;
        }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
        for (; up--; up) {
            parts.unshift('..');
        }
    }

    return parts;
}

if (isWindows) {
    // Regex to split a windows path into three parts: [*, device, slash,
    // tail] windows-only
    var splitDeviceRe =
        /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?([\\\/])?([\s\S]*?)$/;

    // windows version
    exports.normalize = function(path) {
      var result = splitDeviceRe.exec(path),
          device = result[1] || '',
          isUnc = device && device.charAt(1) !== ':',
          isAbsolute = !!result[2] || isUnc, // UNC paths are always absolute
          tail = result[3],
          trailingSlash = /[\\\/]$/.test(tail);

      // Normalize the tail path
      tail = normalizeArray(tail.split(/[\\\/]+/).filter(function(p) {
        return !!p;
      }), !isAbsolute).join('\\');

      if (!tail && !isAbsolute) {
        tail = '.';
      }
      if (tail && trailingSlash) {
        tail += '\\';
      }

      return device + (isAbsolute ? '\\' : '') + tail;
    };

    //windows version
    exports.join = function() {
      function f(p) {
        return p && typeof p === 'string';
      }

      var paths = Array.prototype.slice.call(arguments, 0).filter(f);
      var joined = paths.join('\\');

      // Make sure that the joined path doesn't start with two slashes
      // - it will be mistaken for an unc path by normalize() -
      // unless the paths[0] also starts with two slashes
      if (/^[\\\/]{2}/.test(joined) && !/^[\\\/]{2}/.test(paths[0])) {
        joined = joined.slice(1);
      }

      return exports.normalize(joined);
    };
} else {
    // path.normalize(path)
    // posix version
    exports.normalize = function(path) {
      var isAbsolute = path.charAt(0) === '/',
          trailingSlash = path.slice(-1) === '/';

      // Normalize the path
      path = normalizeArray(path.split('/').filter(function(p) {
        return !!p;
      }), !isAbsolute).join('/');

      if (!path && !isAbsolute) {
        path = '.';
      }
      if (path && trailingSlash) {
        path += '/';
      }

      return (isAbsolute ? '/' : '') + path;
    };

    // posix version
    exports.join = function() {
      var paths = Array.prototype.slice.call(arguments, 0);
      return exports.normalize(paths.filter(function(p, index) {
        return p && typeof p === 'string';
      }).join('/'));
    };
}