# How to use the Markdown plugin

For most users, all you need to do is add the plugin to your JSDoc configuration (`conf.json`) as you would any other:

    {
        "plugins": [ "plugins/markdown" ]
    }

This will cause Markdown in `@description` tags (including implicit descriptions without tags), `@classdesc` tags, `@param` tags, `@property` tags, and `@returns` tags to be parsed.

# Configuring the Markdown plugin

The plugin also offers several configuration options for advanced users who want GitHub integration, extended tag support, etc.  All configuration for the Markdown plugin should be added to a `"markdown"` property in your JSDoc configuration:

    {
        "plugins": [ "plugins/markdown" ],

        "markdown": {
            "opt1": "value",
            "opt2": [ "foo", "bar", "baz" ]
        }
    }

## Choosing a parser

The plugin currently supports two Markdown parsers.  You can select which parser to use by adding a `"parser"` property to your Markdown configuration:

    {
        "plugins": [ "plugins/markdown" ],

        "markdown": {
            "parser": "gfm"
        }
    }

### Dominic "evilstreak" Baggott's markdown-js

The default parser is Dominic Baggott's excellent [markdown-js](https://github.com/evilstreak/markdown-js).  It can be explicitly selected by setting the `parser` to `evilstreak` and has one additional (and optional) configuration option, `dialect`, which can be used to select which of markdown-js' built-in dialects to use.  If omitted, markdown-js' default dialect will be used.

    {
        "plugins": [ "plugins/markdown" ],

        "markdown": {
            "parser": "evilstreak",
            "dialect": "Maruku"
        }
    }

### GitHib Flavored Markdown

The alternative parser is the modified Showdown parser supplied by GitHub for their [GitHub Flavored Markdown](http://github.github.com/github-flavored-markdown/).  GFM several enhancements to standard Markdown syntax (see its documentation) intended to be useful to developers.  It *also* has the ability to quickly link to GitHub repositories, files, and issues.  It can be selected by setting the `parser` to `gfm` and supports three additional (and optional) configuration options.

The `hardwrap` option controls the hard wrapping of line ends.  Unlike standard Markdown, GFM considers a single newline to indicate a "hard break" in the paragraph, but this doesn't work well with the line length limitations commonly used with comment documentation, so is disabled by default.  If you want to turn hard wrapping back on, set `hardwrap` to `true` (or any non-falsy value).

The `githubRepoName` and `githubRepoOwner` indicate which GitHub repo should be used for GitHub links which do not fully specify a repo.  These options have no effect unless used together and if they are omitted, several of GFM's default link types will be unavailable.  Conversely, if you supply both `github*` options but do not explicitly select `gfm` as your parser, it will be automatically selected for you.

    {
        "plugins": [ "plugins/markdown" ],

        "markdown": {
            "parser": "gfm",
            "hardwrap": true
        }
    }

### Why two parsers?

The "evilstreak" parser is flexible, extensible, currently-maintained, and was the only parser available in earlier versions of the Markdown plugin, but doesn't support the useful GFM extensions.  The "gfm" parser is based on the no-longer-maintained Showdown parser, but is the actual library used for GitHub's [client-side previews](http://github.github.com/github-flavored-markdown/preview.html).

In the future, if GFM support is made available for the "evilstreak" parser, this plugin will drop the "gfm" parser in favor of that support.

## Extended tag support

While the Markdown plugin already supports JSDoc's default tags, if you're using other plugins, you may well have extra tags available.  You can tell the Markdown plugin to handle those extra tags as well using the `tags` property, which is an array of the tags* it should check in addition to the default set.

    {
        "plugins": [ "plugins/markdown" ],

        "markdown": {
            "tags": [ "foo", "bars", "bazzes" ]
        }
    }

\* Because the Markdown plugin works with JSDoc's internal representation rather than with the source comments, the names you need to enter in the `tags` property aren't necessarily the same as the actual tag names.  For example, in the default set of tags, `@param` is stored under `params`.  If you are having trouble getting the Markdown plugin to work with your extra tags, either take a peek at the output of JSDoc's `--explain` command-line parameter (which displays the internal state which plugins work with) or ask the plugin author which "doclet properties" their plugin uses.  The Markdown plugin supports strings, arrays, and objects/subdoclets.
