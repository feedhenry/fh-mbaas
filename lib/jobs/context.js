const PROGRESS_EVENT = require('../jobs/progressPublisher').PROGRESS_EVENT;
var log = require('../util/logger');

const STATUSES = require('../models/BaseImportExportJobSchema').statuses;

/**
 * Builder to be used to create context objects by using fluent api.
 * @constructor
 */
function Builder() {
  var self = this;
  self.context = {
    logger: log.getLogger(),
    emitter: undefined,
    progress: {
      /**
       * Wraps a callback so that a progress is automatically sent when the callback is invoked
       * @param cb the callback to be wrapped
       * @param customMessage an optional custom message to pass to the progress.
       * @param ignoreError defines if the progress must be sent even in case of errors (default to false)
       * @returns {Function}
       */
      wrappCallback: function(cb, customMessage, ignoreError) {
        var progress = self.context.progress;
        var message = customMessage || STATUSES.INPROGRESS;
        if (ignoreError) {
          return function() {
            progress.next(message);
            cb.apply(self.context.progress, arguments);
          };
        } else {
          return function() {
            if (!arguments[0]) {
              progress.next(message);
            }
            cb.apply(self.context.progress, arguments);
          };
        }
      },
      /**
       * Increments the progress and send a progress event (if total and emitter are both defined)
       * @param message a custom message to pass to the progress. If not specified, it will assume the following values:
       *  * STATUSES.INPROGRESS if current !=== total
       *  * STATUSES.COMPLETE if current === total
       * @param steps how many steps to increment (defaults to 1)
       */
      next: function(message, steps) {
        var progress = this;
        var emitter = self.context.emitter;

        if (progress.total) {
          progress.current += steps || 1;

          if (progress.current > progress.total) {
            self.context.logger.warn('Number of progress steps (%s) is greater than the configured total (%s)', progress.current, progress.total);
          }

          if (emitter) {
            var progressMessage = message || (progress.current === progress.total ? STATUSES.FINISHED : STATUSES.INPROGRESS);
            emitter.emit(PROGRESS_EVENT, progressMessage, progress.current, progress.total);
          }
        }
      },
      current: 0
    }
  };

  // Fluent api

  /**
   * Defines a custom attribute inside the context object
   * @param attributeName
   * @param value
   * @returns {Builder}
   */
  this.withCustomAtt = function(attributeName, value) {
    self.context[attributeName] = value;
    return self;
  };

  /**
   * Defines the logger
   * @param logger
   * @returns {Builder}
   */
  this.withLogger = function(logger) {
    self.context.logger = logger;
    return self;
  };

  /**
   * Attaches a job model to the context
   * @param jobModel
   * @returns {Builder}
   */
  this.withJobModel = function(jobModel) {
    self.context.jobID = jobModel._id.toString();
    self.context.jobModel = jobModel;
    return self;
  };

  /**
   * Attaches an application info object to the model
   * @param appInfo
   * @returns {Builder}
   */
  this.withApplicationInfo = function(appInfo) {
    self.context.appInfo = appInfo;
    return self;
  };

  /**
   * Attaches an event emitter to the model. Used for progress events.
   * @param emitter
   * @returns {Builder}
   */
  this.withEventEmitter = function(emitter) {
    self.context.emitter = emitter;
    return self;
  };

  /**
   * Validates received parameters and builds the context object
   * @returns {{logger: *, emitter: undefined, progress: {wrappCallback: Builder.context.progress.wrappCallback, next: Builder.context.progress.next, current: number}}|*}
   */
  this.build = function() {
    if (!self.context.appInfo) {
      throw new Error('appInfo field is mandatory');
    }
    if (!self.context.jobModel) {
      throw new Error('jobModel field is mandatory');
    }
    return self.context;
  };
}

/**
 * Returns a context builder instance
 * @returns {Builder}
 */
function contextBuilder() {
  return new Builder();
}

module.exports.contextBuilder = contextBuilder;