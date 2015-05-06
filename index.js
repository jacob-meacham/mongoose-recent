'use strict';

var mongoose = require('mongoose');
var Promise = require('bluebird');
var _ = require('lodash');

Promise.promisifyAll(mongoose);
var DefaultObjectId = mongoose.Schema.Types.ObjectId;

var setupOptions = function(options) {
  options = options || {};

  var defaults = {
    name: 'view',
    numToKeep: 10,
    schemaType: DefaultObjectId,
    dateFieldName: 'date',
    allowDuplicates: false
  };

  options = _.defaults(options, defaults);

  if (!options.compareFunc) {
    options.compareFunc = function(o1, o2) {
      return o1 === o2;
    };
  }

  return options;
};

var generateStaticAddFunction = function(collectionPath, options) {
  return function(id, objectOrId, cb) {
    return this.findOne(id).exec().then(function(self) {
      var addFunction = generateAddFunction(collectionPath, options);
      return addFunction.call(self, objectOrId, cb);
    }).then(null, cb);
  };
};

var generateAddFunction = function(collectionPath, options) {
  return function(objectOrId, cb) {
    var collection = this[collectionPath];

    var foundIdx = _.findIndex(collection, function(entry) {
      return options.compareFunc(objectOrId, entry[options.name]);
    });

    if (options.allowDuplicates || foundIdx === -1) {
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
  docSchema[options.dateFieldName] = { type: Date, 'default': Date.now };
  docSchema[options.name] = options.schemaType;

  fields[collectionPath] = [docSchema];

  if (!schema.paths[collectionPath]) {
    schema.add(fields);
  }

  schema.statics[addFuncName] = generateStaticAddFunction(collectionPath, options);
  schema.methods[addFuncName] = generateAddFunction(collectionPath, options);
};

module.exports = exports = plugin;
