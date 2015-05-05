'use strict';

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
var recentPlugin = require('../index');
mockgoose(mongoose);

var CatSchema = new mongoose.Schema({ name: String }).plugin(recentPlugin, {name: 'hairball', schemaType: String});
var Cat = mongoose.model('Cat', CatSchema);

var kitty = new Cat({ name: 'Fang' });

// You can use either promises or callbacks
kitty.addRecentHairball('eveningHairball').spread(function(cat) {
  console.log(cat.recentHairballs[0]); // { hairball: 'eveningHairball', date: somedate }
  kitty.addRecentHairball('morningHairball', function(err, cat) {
    if (err) {
      process.exit(1);
    }
    console.log(cat.recentHairballs[0].hairball); // morningHairball
    process.exit(0);
  });
});