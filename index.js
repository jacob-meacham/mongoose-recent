'use strict';

var mongoose = require('mongoose');
var Promise = require('bluebird');
var _ = require('lodash');

Promise.promisifyAll(mongoose);
var DefaultObjectId = mongoose.Schema.Types.ObjectId;

// TODO: Promise or callback
var setupOptions = function(options) {
  options = options || {};

  var defaults = {
    name: 'view',
    numToKeep: 10,
    idType: DefaultObjectId,
    dateFieldName: 'date',
    duplicatesAllowed: false
  };

  _.extend(options, defaults);

  if (!options.compareFunc) {
    options.compareFunc = function(o1, o2) {
      return o1[options.name] === o2[options.name];
    };
  }

  return options;
};

var generateAddFunction = function(collectionPath, options) {
  return function(objectOrId, cb) {
    // TODO: Doesn't work in static case - need to do a find and update instead.
    var collection = this[collectionPath];
    
    var foundIdx = _.findIndex(collection, options.compareFunc);
    if (options.duplicatesAllowed || foundIdx === -1) {
      var newObject = {};
      newObject[options.name] = objectOrId;
      collection.push(newObject);
    } else {
      var entry = collection[foundIdx];
      entry[options.dateFieldName] = Date.now();
    }

    this[collectionPath] = _(collection).sortBy('date').reverse().slice(0, options.numToKeep).value();

    if (cb) {
      this.save(cb);
    } else {
      return this.saveAsync();
    }
  };
};

var plugin = function(schema, options) {
  options = setupOptions(options);
  
  var upperCasedName = options.name.charAt(0).toUpperCase() + options.name.slice(1);
  var collectionPath = options.collectionPath || 'recent' + upperCasedName + 's';
  var addFuncName = options.addFunctionName || 'addRecent' + upperCasedName;

  var fields = {};
  var docSchema = {};
  docSchema[options.dateName] = { type: Date, 'default': Date.now };

  if (options.object) {
    docSchema[options.name] = options.object;
  } else {
    docSchema[options.name] = options.idType;
  }

  fields[collectionPath] = [docSchema];

  if (!schema.paths[collectionPath]) {
    schema.add(fields);
  }

  schema.statics[addFuncName] = generateAddFunction(collectionPath, options);
  schema.methods[addFuncName] = function(objectOrId, cb) {
    return this.constructor[addFuncName].call(this.constructor, this._id, objectOrId, cb);
  };
};

module.exports = exports = plugin;
