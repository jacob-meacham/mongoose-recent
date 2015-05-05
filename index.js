'use strict';

var _ = require('lodash');
var DefaultObjectId = require('mongoose').Schema.Types.ObjectId;

// TODO: Promise or callback
var setupOptions = function(options) {
  options = options || {};

  var defaults = {
    name: 'view',
    numToKeep: 10,
    idType: DefaultObjectId,
    dateName: 'date',
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

var generateAddFunction = function(collectionName, options) {
  return function(objectOrId, cb) {
    // TODO: Doesn't work in static case - need to do a find and update instead.
    var collection = this[collectionName];
    
    var foundIdx = _.findIndex(collection, options.compareFunc);
    if (options.duplicatesAllowed || foundIdx === -1) {
      var newObject = {};
      newObject[options.name] = objectOrId;
      collection.push(newObject);
    } else {
      var entry = collection[foundIdx];
      entry[options.dateName] = Date.now();
    }

    this[collectionName] = _(collection).sortBy('date').reverse().slice(0, options.numToKeep).value();
    this.save(cb);
  };
};

var plugin = function(schema, options) {
  options = setupOptions(options);
  
  var upperCasedName = options.name.charAt(0).toUpperCase() + options.name.slice(1);
  var collectionName = options.collectionName || 'recent' + upperCasedName + 's';
  var addFuncName = options.addFunctionName || 'addRecent' + upperCasedName;

  var schemaAdditions = {};
  var docSchema = {};
  docSchema[options.dateName] = { type: Date, 'default': Date.now };

  if (options.object) {
    docSchema[options.name] = options.object;
  } else {
    docSchema[options.name] = options.idType;
  }

  schemaAdditions[collectionName] = docSchema;
  schema.add(schemaAdditions);

  schema.statics[addFuncName] = generateAddFunction(collectionName, options);
  schema.methods[addFuncName] = function(objectOrId, cb) {
    this.constructor[addFuncName].call(this.constructor, this._id, objectOrId, cb);
  };
};


module.exports = exports = plugin;