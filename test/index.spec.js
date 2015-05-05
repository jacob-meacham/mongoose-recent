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

  it('should allow duplicates if specified', function() {
    Schema.plugin(recent, { allowDuplicates: true });
    var Test = mongoose.model('TestDupes', Schema);
    var testDoc = new Test();

    var id1 = mongoose.Types.ObjectId();
    return testDoc.addRecentView(id1).then(function() {
      return testDoc.addRecentView(mongoose.Types.ObjectId());
    }).delay(10).then(function() {
      return testDoc.addRecentView(id1);
    }).spread(function(me) {
      me.recentViews.should.have.length(3);
      me.recentViews[0].view.should.eql(id1);
      me.recentViews[2].view.should.eql(id1);
    });
  });

  it('should allow a different type of id', function() {
    Schema.plugin(recent, { schemaType: String });
    var Test = mongoose.model('TestDifferentIds', Schema);
    var testDoc = new Test();

    return testDoc.addRecentView('id1').then(function() {
      return testDoc.addRecentView('id2');
    }).delay(10).then(function() {
      return testDoc.addRecentView('id1');
    }).spread(function(me) {
      me.recentViews.should.have.length(2);
      me.recentViews[0].view.should.eql('id1');
      me.recentViews[1].view.should.eql('id2');
    });
  });

  it('should allow an object instead of an id', function() {
    Schema.plugin(recent, { schemaType: { foo: String, bar: {type: String, 'default': 'whee'} } });
    var Test = mongoose.model('TestObjects', Schema);
    var testDoc = new Test();

    return testDoc.addRecentView({foo: 'ha'}).spread(function(me) {
      me.recentViews.should.have.length(1);
      me.recentViews[0].view.foo.should.eql('ha');
      me.recentViews[0].view.bar.should.eql('whee');
    });
  });

  it('should use a proper compare function with an object using the default name', function() {

  });

  it('should use the passed compare function', function() {

  });

  it('should use the passed number of records to keep', function() {

  });
});
