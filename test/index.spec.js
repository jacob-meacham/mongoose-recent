'use strict';

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
var recent = require('../index');
var chai = require('chai');
chai.should();
var expect = chai.expect;

mockgoose(mongoose);

describe('mongoose-recent', function() {
  var Schema;

  beforeEach(function() {
    Schema = new mongoose.Schema({}, { strict: false });
  });

  it('should use default options', function() {
    Schema.plugin(recent);
    var Test = mongoose.model('TestSmoke', Schema);

    var testDoc = new Test();
    expect(testDoc.recentViews).to.exist;
    expect(testDoc.addRecentView).to.exist;
    return testDoc.addRecentView(mongoose.Types.ObjectId()).spread(function(me) {
      expect(me.recentViews[0].view).to.exist;
      expect(me.recentViews[0].date).to.exist;
    });
  });

  it('should allow changing the name and date field name', function() {
    Schema.plugin(recent, {name: 'play', dateFieldName: 'time'});
    var Test = mongoose.model('TestChanging', Schema);

    var testDoc = new Test();
    expect(testDoc.recentPlays).to.exist;
    expect(testDoc.addRecentPlay).to.exist;
    return testDoc.addRecentPlay(mongoose.Types.ObjectId()).spread(function(me) {
      console.log(me);
      expect(me.recentPlays[0].play).to.exist;
      expect(me.recentPlays[0].time).to.exist;
    });
  });

  it('should allow fully specifying the schema names', function() {
    Schema.plugin(recent, {name: 'foo', collectionPath: 'myAwesomeCollection', addFunctionName: 'soYouWantToAdd'});
    var Test = mongoose.model('TestFullSpec', Schema);

    var testDoc = new Test();
    expect(testDoc.myAwesomeCollection).to.exist;
    expect(testDoc.soYouWantToAdd).to.exist;
    return testDoc.soYouWantToAdd(mongoose.Types.ObjectId()).spread(function(me) {
      expect(me.myAwesomeCollection[0].foo).to.exist;
    });
  });

  it('should not overwrite a field that already exists', function() {
    var OverwriteSchema = new mongoose.Schema({
      recentViews: String
    }, { strict: false });
    
    OverwriteSchema.plugin(recent);
    expect(OverwriteSchema.paths.recentViews.instance).to.eql('String');
  });

  it('should not allow duplicates by default', function() {
    Schema.plugin(recent);
    var Test = mongoose.model('TestNoDupe', Schema);

    var testDoc = new Test();
    var id1 = mongoose.Types.ObjectId();
    return testDoc.addRecentView(id1).then(function() {
      return testDoc.addRecentView(mongoose.Types.ObjectId());
    }).then(function() {
      return testDoc.addRecentView(id1);
    }).spread(function(me) {
      me.recentViews.should.have.length(2);
      me.recentViews[0].view.should.eql(id1);
    });
  });
});