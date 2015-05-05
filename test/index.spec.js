'use strict';

var mongoose = require('mongoose');
var recent = require('../index');
var chai = require('chai');
chai.should();

describe('mongoose-recent', function() {
  var Schema;

  beforeEach(function() {
    Schema = new mongoose.Schema({}, { strict: false });
  });

  it('should use default options', function() {
    Schema.plugin(recent);
    var Test = mongoose.model('Test', Schema);
    Test.should.eql(Test);
  });
});