var fhConfig = require('fh-config');

fhConfig.setRawConfig({
  agenda:{
    notification_interval: 1
  }
});

var assert = require('assert');
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var ProgressPublisher = require('lib/jobs/progressPublisher').ProgressPublisher;
var _ = require('underscore');

const STATUS_EVENT = require('lib/jobs/progressPublisher').STATUS_EVENT;
const PROGRESS_EVENT = require('lib/jobs/progressPublisher').PROGRESS_EVENT;
const FINISH_EVENT = require('lib/jobs/progressPublisher').FINISH_EVENT;
const FAIL_EVENT = require('lib/jobs/progressPublisher').FAIL_EVENT;

module.exports.test_publishing_batching = function(done) {

  var publishSpy = sinon.spy();
  var emitter = new EventEmitter();

  // Lets create a publisher with a batch size of '3'
  var progressPublisher = new ProgressPublisher(3, publishSpy);
  progressPublisher.listen(emitter);

  emitter.emit(STATUS_EVENT, 'started');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step1');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step2');
  assert.ok(publishSpy.called, 'Publisher not called');
  publishSpy.reset();

  // Now the message basket is empty again. Lets fill it again
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step3');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step4');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step5');
  assert.ok(publishSpy.called, 'Publisher not called');
  publishSpy.reset();

  done();
}

module.exports.test_publishing = function(done) {

  var publishSpy = sinon.spy();
  var emitter = new EventEmitter();
  var ProgressPublisher = require('lib/jobs/progressPublisher').ProgressPublisher;

  // Lets create a publisher with a batch size of '3'
  var progressPublisher = new ProgressPublisher(3, publishSpy);
  progressPublisher.listen(emitter);

  emitter.emit(STATUS_EVENT, 'started');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step1');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step2');
  assert.ok(publishSpy.called, 'Publisher not called');

  var args = publishSpy.args[0][0];

  assert.ok(args, 'Publisher called with empty args');
  assert.ok(_.isArray(args), 'Publisher called with bad arguments : ' + JSON.stringify(args));
  assert.ok(args.length === 3, 'Bad number of parameters' + JSON.stringify(args));

  assert.equal(args[0].type,STATUS_EVENT, 'Bad event found');
  assert.equal(args[0].data,'started', 'Bad event message found');
  assert.equal(args[1].type,PROGRESS_EVENT, 'Bad event found');
  assert.equal(args[1].data,'step1', 'Bad event message found');
  assert.equal(args[2].type,PROGRESS_EVENT, 'Bad event found');
  assert.equal(args[2].data,'step2', 'Bad event message found');

  publishSpy.reset();

  done();
}

module.exports.test_publishing_fail = function(done) {
  var publishSpy = sinon.spy();
  var emitter = new EventEmitter();

  // Lets create a publisher with a batch size of '10'
  var progressPublisher = new ProgressPublisher(10, publishSpy);
  progressPublisher.listen(emitter);

  emitter.emit(STATUS_EVENT, 'started');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step1');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step2');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(FAIL_EVENT, 'Failure message');
  assert.ok(publishSpy.called, 'Publisher called even if fail message has been sent');

  var args = publishSpy.args[0][0];

  assert.ok(args, 'Publisher called with empty args');
  assert.ok(_.isArray(args), 'Publisher called with bad arguments : ' + JSON.stringify(args));
  assert.ok(args.length === 4, 'Bad number of parameters' + JSON.stringify(args));

  assert.equal(args[3].type, FAIL_EVENT, 'Bad event found');
  assert.equal(args[3].data,'Failure message', 'Bad event message found');

  done();
}

module.exports.test_publishing_finish = function(done) {
  var publishSpy = sinon.spy();
  var emitter = new EventEmitter();

  // Lets create a publisher with a batch size of '10'
  var progressPublisher = new ProgressPublisher(10, publishSpy);
  progressPublisher.listen(emitter);

  emitter.emit(STATUS_EVENT, 'started');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step1');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(PROGRESS_EVENT, 'step2');
  assert.ok(!publishSpy.called, 'Publisher called with non full basket');
  emitter.emit(FINISH_EVENT, 'Job ended');
  assert.ok(publishSpy.called, 'Publisher called even if finish message has been sent');

  var args = publishSpy.args[0][0];

  assert.ok(args, 'Publisher called with empty args');
  assert.ok(_.isArray(args), 'Publisher called with bad arguments : ' + JSON.stringify(args));
  assert.ok(args.length === 4, 'Bad number of parameters' + JSON.stringify(args));

  assert.equal(args[3].type, FINISH_EVENT, 'Bad event found: ' + args[3].type);
  assert.equal(args[3].data,'Job ended', 'Bad event message found: ' + args[3].data);

  done();
}