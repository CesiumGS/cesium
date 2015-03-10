
### Sources for custom types

This is a list of sources for any custom mime types.
When adding custom mime types, please link to where you found the mime type,
even if it's from an unofficial source.

- `text/coffeescript` - http://coffeescript.org/#scripts
- `text/x-handlebars-template` - https://handlebarsjs.com/#getting-started
- `text/x-sass` & `text/x-scss` - https://github.com/janlelis/rubybuntu-mime/blob/master/sass.xml

[Sources for node.json types](https://github.com/broofa/node-mime/blob/master/types/node.types)

### Notes on weird types

- `font/opentype` - This type is technically invalid according to the spec. No valid types begin with `font/`. No-one uses the official type of `application/vnd.ms-opentype` as the community standardized `application/x-font-otf`. However, chrome logs nonsense warnings unless opentype fonts are served with `font/opentype`. [[1]](http://stackoverflow.com/questions/2871655/proper-mime-type-for-fonts)
