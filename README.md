## mongoose-recent

A [mongoose](http://mongoosejs.com/) plugin for handling recently accessed data to be stored on a document

```javascript
var mongoose = require('mongoose');
var recentPlugin = require('mongoose-recent');

mongoose.connect('mongodb://localhost/test');

var CatSchema = new mongoose.Schema({ name: String }).plugin(recentPlugin, {name: 'hairball', schemaType: String});
var Cat = mongoose.model('Cat', CatSchema);

var kitty = new Cat({ name: 'Fang' });

kitty.addRecentHairball('morningHairball', function(err, cat) {
   if (err) // ...
   console.log(cat.recentHairballs[0].hairball); // morningHairball 
});

// You can also add hairballs with bluebird promises
kitty.addRecentHairball('eveningHairball').spread(function(cat) {
    console.log(cat.recentHairballs[0]); // { hairball: 'eveningHairball', date: Tue May 05 2015 10:17:53 }
});
```
(see a working example of this in [examples/](../blob/master/examples/))

### Usage
mongoose-recent adds a new collection to your document, along with an instance method for adding recent items. This collection is kept in a date-sorted order (newest at the top), and by default does not allow duplicates and has a maximum size of 10 entries. If you re-add an entry that already exists in the collection, it will be bubbled back up to the top.

This plugin is intended to be used whenever you find yourself with a collection sorted by date. For example:
* Recent items that a customer has viewed
* Recent videos that a user has played
* Recently clicked buttons

To get started with a minimal plugin, which will add a recentViews collection and an addRecentView(...) function, simply add it to any Schema:

```javascript
var mongoose = require('mongoose');
var recentPlugin = require('mongoose-recent');

var UserSchema = new mongoose.Schema(...);
UserSchema.plugin(recentPlugin);
```

### Options
#### name
Type: `String`<br/>
Default: `view`

In many cases, this is the only option you'll need to set. This should usually be a singular noun and will be used to set the following three things:

1. The collection, which will be named recent{options.name}s
2. The instance method, which will be named addRecent{options.name}
3. The property in the collection, which will be named {options.name}

```javascript
Schema.plugin(recentPlugin, {name: 'item'});
Model = mongoose.model('Model', Schema);
doc = new Model();

console.log(doc.recentItems); // [], with the schema {item: ObjectId, date: Date}
console.log(doc.addRecentItem); // [Function]
```

If you'd like more control over how everything is named, see [collectionPath](#collectionpath), [addFunctionName](#addfunctionname), and [dateFieldName](#datefieldname).

#### numToKeep:
Type: `Number`<br/>
Default: `10`

This controls the number of items to keep in the collection.

#### schemaType
Type: `Object`<br/>
Default: `DefaultObjectId`

By default, this is just a mongo object Id, but can be another id type (for example, String or ShortId), or a complex object.

```javascript
Schema.plugin(recentPlugin, {schemaType: {name: String, acl: {type: String, 'default': 'user'});
Model = mongoose.model('Model', Schema);
doc = new Model();

console.log(doc.recentViews); // [], with the schema {view: {name: String, acl: {type: String, 'default': 'user'}, date: Date}
```

#### compareFunc
Type: `Function`<br/>
Default: `===`

By default, mongoose-recent uses === to compare when checking for duplicates. If you have an object as the schema type, this is usually not the desired behavior. Instead, you should define your own custome comparison function. The comparison function is passed the object being added as the first argument, and the object to compare against as the second argument.

```javascript
var compareFunc = function(o1, o2) {
  return o1.miceCaught === o2.miceCaught;
};

Schema.plugin(recent, { schemaType: { name: String, miceCaught: Number }, compareFunc: compareFunc } );
// ...
```

#### collectionPath
Type: `String`<br/>
Default: `recent{options.name}s`

You can use this for fine-grained control over how the collection is added to your schema.

```javascript
Schema.plugin(recentPlugin, {collectionPath: 'recentlyViewedItems'});
Model = mongoose.model('Model', Schema);
doc = new Model();

console.log(doc.recentViews); // undefined
console.log(doc.recentlyViewedItems); // []
console.log(doc.addRecentView); // [Function]
```

#### addFunctionName
Type: `String`<br/>
Default: `addRecent{options.name}`

You can use this for fine-grained control over how the addRecent instance method is added to your schema.

```javascript
Schema.plugin(recentPlugin, {addFunctionName: 'addToRecentlyViewed'});
Model = mongoose.model('Model', Schema);
doc = new Model();

console.log(doc.recentViews); // []
console.log(doc.addRecentView); // undefined
console.log(doc.addToRecentlyViewed); // [Function]
```

#### dateFieldName
Type: `String`<br/>
Default: `date`

You can use this for fine-grained control over how the date field is named.

```javascript
Schema.plugin(recentPlugin, {dateFieldName: 'timeOfAccess');
Model = mongoose.model('Model', Schema);
doc = new Model();

console.log(doc.recentViews); // [], with the schema {view: ObjectId, timeOfAccess: Date}
```

#### allowDuplicates
Type: `boolean`<br/>
Default: `false`

By default, duplicates are not allowed. If you re-add an item that's already in the collection, it will be given a new date and moved to the top of the collection. If you want to track all recent instances, rather than just the most recent for an item, set this to true. When true, every call to addRecent will add a new entry to the collection.

### Areas for Improvements / involvement
* Add static along with instance method
* Allow changing the Date type
