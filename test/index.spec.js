'use strict';

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
var Promise = require('bluebird');
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
      me.recentViews[0].view.toObject().should.eql({foo: 'ha', bar: 'whee'});
    });
  });

  it('should use the passed compare function', function() {
    var compareFunc = function(o1, o2) {
      return o1.foo === o2.foo;
    };

    Schema.plugin(recent, { schemaType: { foo: String }, compareFunc: compareFunc } );
    var Test = mongoose.model('TestCompare', Schema);
    var testDoc = new Test();

    return testDoc.addRecentView({foo: 'ha'}).then(function() {
      return testDoc.addRecentView({foo: 'ya'});
    }).delay(10).then(function() {
      return testDoc.addRecentView({foo: 'ha'});
    }).spread(function(me) {
      me.recentViews.should.have.length(2);
      me.recentViews[0].view.toObject().should.eql({foo: 'ha'});
    });
  });

  it('should allow using a callback', function(done) {
    Schema.plugin(recent);
    var Test = mongoose.model('TestCallback', Schema);
    var testDoc = new Test();

    testDoc.addRecentView(mongoose.Types.ObjectId(), function(err, me) {
      expect(err).to.not.exist;
      expect(me.recentViews).to.exist;
      done();
    });
  });

  it('should use the passed number of records to keep', function() {
    Schema.plugin(recent, { numToKeep: 3 });
    var Test = mongoose.model('TestNumToKeep', Schema);
    var testDoc = new Test();

    var views = [];
    for (var i = 0; i < 4; i++) {
      views.push(testDoc.addRecentView(mongoose.Types.ObjectId()));
    }

    Promise.all(views).then(function() {
      testDoc.recentViews.should.have.length(3);
    });
  });

  it('should allow using a static function', function() {
    Schema.plugin(recent);
    var Test = mongoose.model('TestStatic', Schema);
    var testDoc = new Test();

    return testDoc.saveAsync().spread(function(me) {
      return Test.addRecentView({_id: me._id}, mongoose.Types.ObjectId());
    }).spread(function(me) {
      me._id.should.eql(testDoc._id);
      me.recentViews.should.have.length(1);
    });
  });

  it('should allow using a static function with a callback', function(done) {
    Schema.plugin(recent);
    var Test = mongoose.model('TestStaticCallback', Schema);
    var testDoc = new Test();

    testDoc.saveAsync().spread(function(me) {
      Test.addRecentView({_id: me._id}, mongoose.Types.ObjectId(), function(err, me) {
        expect(err).to.not.exist;
        
        me._id.should.eql(testDoc._id);
        me.recentViews.should.have.length(1);
        done();
      });
    });
  });
});
