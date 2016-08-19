'use strict';

var fs     = require('fs');
var path   = require('path');

var _      = require('lodash');
var when   = require('when');
var stumpy = require('stumpy');

var singleton = null;

module.exports = ConfigManager;

function ConfigManager(opts){
    if(!(this instanceof ConfigManager)) {
        if(!singleton) {
            singleton = new ConfigManager(opts);
        }

        return singleton;
    }

    this._options = _.merge({
        basePath: process.cwd()
    }, opts);

    // if missing sep at end, then add it
    if(this._options.basePath.slice(-1) != path.sep) {
        this._options.basePath += path.sep;
    }

    this._config = {};
    this._L      = null;

    var loggerConfig = {};
    if(this._options.silent) {
        loggerConfig.display = false;
    }

    if(_.isObject(this._options.logger)){
        this._L = this._options.logger;
    } else {
        this._L = stumpy("Transfuser", loggerConfig);
    }
}

ConfigManager.require = function(file, logger){
    var data = null;

    try {
        data = require(file);
    } catch(err) {
        if(logger) {
            logger.error("Error loading file \"" + file + "\" - " + JSON.stringify(err));
        }
        data = null;
    }

    return data;
};



ConfigManager.prototype.loadSync = function(files, hideInfo) {
    if(_.isString(files)) {
        files = [files];
    }

    if(!_.isArray(files)) {
        this._L.error("Files input not array or string");
        return null;
    }

    for(var i = 0; i < files.length; i++) {
        var file = this._resolvePath(files[i]);
        var fileExt = this.getFileExtension(file);
        var data = null;

        if( file && fs.existsSync(file)) {

            if(fileExt == "js") {
                data = ConfigManager.require(file, this._L);
            } else {
                data = this._fileReadSync(file);
            }

            if(data) {
                if(_.isFunction(data)) {
                    this._config = data;
                }
                else if(_.isArray(data)) {
                    this._config = data;
                }
                else if(_.isObject(data)) {
                    // merge in next
                    this._config = _.merge( this._config, data );
                    this._L.log("Loaded \"" + file + "\"");
                }
                else {
                    this._config = data;
                }
            }

        } else {
            if(!hideInfo) {
                this._L.info("Could not find file \"" + file + "\"");
            }
        }
    }

    return this._config;
};


ConfigManager.prototype.load = function(files, hideInfo) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        if(_.isString(files)) {
            files = [files];
        }

        if(!_.isArray(files)) {
            reject(new Error("Files input not array or string"));
            return;
        }

        var filePromistList = [];
        _.forEach(files, function(file) {
            var file = this._resolvePath(file);
            var fileExt = this.getFileExtension(file);

            if(!file && !hideInfo) {
                this._L.info("Invalid file type for \"" + files[i] + "\"");
                return;
            }

            var p = this._fileExists(file);

            p.then(function(exists){
                if(exists) {
                    var data = null;
                    if(fileExt == "js") {
                        data = this._fileRequire(file);
                    } else {
                        data = this._fileRead(file);
                    }

                    if(!data && _.isObject(data)) {
                        this._L.log("Loaded \"" + file + "\"");
                        return data;
                    }
                } else {
                    if(!hideInfo) {
                        this._L.info("Could not find file \"" + file + "\"");
                    }
                }
            }.bind(this))
            // catch all errors
                .then(null, function(err){
                    this._L.error("Error:", err);
                }.bind(this));

            filePromistList.push(p);
        }.bind(this));

        // enforce series and merging of configs
        when.reduce(filePromistList, function (allConfigs, config) {
            if(!config) return; // skip if not data, most likely and could not find file

            return _.merge( allConfigs, config );
        }, this._config)
        // when reduce is done
            .then(function(allConfigs){
                this._config = allConfigs;
                // all done
                resolve(this._config);
            }.bind(this));

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


ConfigManager.prototype.get = function() {
    return this._config;
};

ConfigManager.prototype.getFileExtension = function(filename) {
    return path.extname(filename).slice(1);
};

ConfigManager.prototype.getUserHomeDir = function() {
    var dir = process.env.HOME ||
        process.env.HOMEPATH ||
        process.env.USERPROFILE;

    // no dir and is not windows
    if( !dir &&
        process.platform != "win32"
    ) {
        dir = path.sep + "root";
    }

    return dir;
};



ConfigManager.prototype._resolvePath = function(file){
    var pathFile = null;

    // if file null, not a string or empty, return null
    if( !file || !_.isString(file) || file.length < 1 ) { return null; }

    // Relative to User Home Dir
    if(file.charAt(0) == "~") {
        file = file.slice(1);
        // remove leading / to make the file path consistent
        if(file.charAt(0) == "/") { file = file.slice(1); }

        pathFile = this.getUserHomeDir() + path.sep + file;
    }
    // Relative to BasePath
    else if(file.charAt(0) == "$") {
        file = file.slice(1);
        // remove leading / to make the file path consistent
        if (file.charAt(0) == "/") {
            file = file.slice(1);
        }

        pathFile = this._options.basePath + file;
    }
    // Relative to Root
    else if(file.charAt(0) == "/") {
        // root path so just use it
        pathFile = file;
    }
    // Relative to Current Dir
    else  {
        // this is so require will load from the current dir's path
        pathFile = process.cwd() + path.sep + file;
    }

    return pathFile;
};


ConfigManager.prototype._fileExists = function(file){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        fs.exists(file, function(exists) {
            resolve(exists);
        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

ConfigManager.prototype._fileRead = function(file){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        var fileExt = this.getFileExtension(file);

        fs.readFile(file, function(err, data){
            if(err) { return reject(err); }

            if(fileExt == "json") {
                try {
                    data = JSON.parse(data);
                    resolve(data);
                } catch (err) {
                    reject("parsing file \"" + file + "\" - " + JSON.stringify(err));
                }
            } else {
                reject("Invalid file type \"" + file + "\"");
            }
        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

ConfigManager.prototype._fileRequire = function(file){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        try {
            var data = require(file);
            resolve(data);
        } catch(err){
            reject("loading file \"" + file + "\" - " + JSON.stringify(err));
        }

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


ConfigManager.prototype._fileReadSync = function(file){
    var fileExt = this.getFileExtension(file);

    var data = null;
    if(fileExt == "json") {
        try {
            data = fs.readFileSync(file);
            data = JSON.parse(data);
        } catch (err) {
            this._L.error("Error parsing config file \"" + file + "\" -", err);
        }
    } else {
        this._L.error("Invalid file type \"" + file + "\"");
    }

    return data;
};
