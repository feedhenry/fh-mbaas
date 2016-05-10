var fhConfig = require('fh-config');

fhConfig.setRawConfig({
  agenda:{
    notification_interval: 1
  }
});

var assert = require('assert');
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;

var ProgressPersistor = require('lib/jobs/progressPersistor').ProgressPersistor;
const STATUS_EVENT = require('lib/jobs/progressPublisher').STATUS_EVENT;
const PROGRESS_EVENT = require('lib/jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;


module.exports.test_persisting = function(done) {
  var emitter = new EventEmitter();

  var mockTask = {
    set: sinon.stub(),
    save: function(cb) {
      cb();
    },
    toJSON: function () {
      return {
        status: status
      }
    },
    reset: function() {
      this.set.reset();
      this.save.reset();
    }
  };

  sinon.stub(mockTask, 'save', mockTask.save);

  var progressPersistor = new ProgressPersistor().listen(emitter, mockTask, function(err) {
    assert.ok(false, 'An error has occurred: ' + err);
  });

  emitter.emit(STATUS_EVENT, 'started');
  assert.ok(mockTask.set.called, 'Set method not called');

  var args = mockTask.set.args[0];
  assert.equal(args[0], STATUS_EVENT, 'Bad event persisted');
  assert.equal(args[1], 'started', 'Bad event message persisted');
  assert.ok(mockTask.save.called, 'Save method not called');

  emitter.emit(FINISH_EVENT, 'finished');
  assert.ok(mockTask.set.called, 'Set method not called');

  mockTask.reset();

  emitter.emit(PROGRESS_EVENT, '20%');
  assert.ok(mockTask.set.called, 'Set method not called');

  var args = mockTask.set.args[0];
  assert.equal(args[0], PROGRESS_EVENT, 'Bad event persisted');
  assert.equal(args[1], '20%', 'Bad event message persisted');
  assert.ok(mockTask.save.called, 'Save method not called');

  done();
}