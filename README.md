# Transfuser - Will save your life!

## Features
* Highly Configurable
* Sync and Async loading
* Supports JSON and JS file types

## Features on the horizon
* Fetch configs from http/https
* More file types (INI, XML...)
* Auto Load Service Configs
    * AWS BeanStalk configs
    * Heroku
    * ...
* Add Examples
* Add Tests
* Add TravisCI


## Transfuser(options)

The first argument is an Object. The all options have defaults.

* `basePath` - A String used to when getting current path `$`. Default: `process.cwd()`.


## Transfuser.load(files)

The first argument is a string or array of file(s) to load. If the file starts with a special character it will replace that character with the corresponding value below

* `~` - Current user home directory.
* `$` - Current basePath (Default: `process.cwd()`) directory.


## Examples

* [Basic example](https://github.com/jstty/transfuser/blob/master/examples/basic.js)


## License

MIT: [Full license &raquo;](LICENSE)
