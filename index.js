'use strict';

var _ = require('lodash');
var DefaultObjectId = require('mongoose').Schema.Types.ObjectId;

// Mongoose recently-viewed plugin
//     - number of recently-viewed to keep
//     - are duplicates allowed
//     - set the name of the key that has recently viewed
//     - set the id type or object in the thing
//         - if possible, have a options.idType = whatever, but also a options.subdocument that lets you explicitly set a subdocument
//     - addRecent* where * is set based on the name of the key (or set explicitly)
//         - eg options.name = 'flows' then we would recentFlows as the key, and the function addRecentFlow. If you want to have more control, use options.collectionName='recentlyViewedFlows' and options.functionName='addANewRecentFlow'
//         addRecentFlow(documentOrId);

// TODO: Promise or callback
var setupOptions = function(options) {
  options = options || {};

  var defaults = {
    idType: DefaultObjectId,
    numToKeep: 10,
    name: 'views',
    dateName: 'date'
  };

  // TODO: Merge via lodash
  options.idType = options.idType || defaults.idType;
  options.numToKeep = options.numToKeep || defaults.numToKeep;
  options.name = options.name || defaults.name;
  options.dateName = options.dateName || defaults.dateName;

  if (!options.compareFunc) {
    options.compareFunc = function(o1, o2) {
      return o1[options.name] === o2[options.name];
    };
  }

  return options;
};

var generateAddFunction = function(collectionName, options) {
  return function(objectOrId, cb) {
    // TODO: This won't work for a static.
    var foundIdx = _.findIndex(this[collectionName], options.compareFunc);
    if (foundIdx !== -1) {
      var entry = this[collectionName][foundIdx];
      entry[options.dateName] = Date.now();
    } else {
      // TODO: Not atomic, not sure if $addToSet is atomic either
      var newObject = {};
      newObject[options.name] = objectOrId;
      this[collectionName].push(newObject);
    }

    this[collectionName] = _(this[collectionName]).sortBy('date').reverse().slice(0, options.numToKeep).value();
    this.save(cb);
  };
};

var plugin = function(schema, options) {
  options = setupOptions(options);
  
  // TODO: Uppercase name
  var collectionName = options.collectionName || 'recent' + options.name;
  var addFuncName = options.addFunctionName || 'addRecent' + options.name.slice(0, -1);

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