/**
 * This controller provides methods to get download, upload URL for a challenge file or submission file
 *
 * @version 1.0
 * @author spanhawk
 */
'use strict';

var async = require('async');
var errors = require('common-errors');
var datasource = require('./../../datasource').getDataSource();
var Challenge = datasource.Challenge;
var File = datasource.File;
var config = require('config');
var storageLib = require('lc-storage')(config);
var tcAuth = require('tc-auth');
var safeList = tcAuth.safeList(config);


/**
 * Helper method to find an entity by entity id property
 * @param  {Model}      Model       Sequelize Model
 * @param  {Object}     filters     filter criteria
 * @param  {Function}   callback    callback function
 * private
 */
function _findById(Model, filters, callback) {
  Model.find(filters).success(function (entity) {
    callback(null, entity);
  }).error(function (err) {
    callback(new errors.Error('DBReadError: '+err.message, err));
  });
}

/**
 * Helper method to get challenge file URL based on type
 * @param  {String}     method      Indicates the type of request to process
 * @param  {Model}      Model       Sequelize Model
 * @param  {Number}     id          id value
 * @param  {Function}   next        callback function
 * private
 */
var getChallengeFileURL = function(method, req, res, next) {
  // check authorization
  var challengeId = req.swagger.params.challengeId.value,
    fileId = req.swagger.params.fileId.value,
    user = tcAuth.getSigninUser(req);

  async.waterfall([
    function (cb) {
      _findById(Challenge, {where: {id: challengeId}}, cb);
    },
    function (challenge, cb) {
      if (!challenge) {
        return cb(new errors.NotFoundError('Cannot find a challenge for challengeId ' + challengeId));
      }

      if (!safeList.currentUserIsSafe(req)) {
        challenge.getParticipants({where: {userId: user.id}}).success(function (participants) {
          cb(null, participants);
        }).error(function (err) {
          cb(new errors.Error('DBReadError: '+err.message, err));
        });
      } else {
        cb(null, null);
      }

    },
    function (participants, cb) {
      if (!safeList.currentUserIsSafe(req)) {
        // participant will be an array, should not be empty array
        if (!participants || participants.length === 0) {
          return cb(new errors.AuthenticationRequiredError('User is not authorized'));
        }
      }
      _findById(File, {where: {id:fileId, challengeId: challengeId}}, cb);
    },
    function (file, cb) {
      if (!file) {
        return cb(new errors.NotFoundError('Cannot find a file for fileId ' + fileId));
      }
      storageLib[method](file, cb);
    }
  ], function (err, result) {
    if (err) {
      return next(err);   // go to error handler
    } else {
      req.data = {
        success: true,
        status: 200,
        metadata: {
          totalCount: 1
        },
        content: {url: result}
      };
    }
    next();
  });
};

var getSubmissionFileURL = function(method, req, res, next) {
  var challengeId = req.swagger.params.challengeId.value,
    submissionId = req.swagger.params.submissionId.value,
    user = tcAuth.getSigninUser(req),
    fileId = req.swagger.params.fileId.value;

  async.waterfall([
    function (cb) {
      _findById(Challenge, {where: {id: challengeId}}, cb);
    },
    function (challenge, cb) {
      if (!challenge) {
        return cb(new errors.NotFoundError('Cannot find a challenge for challengeId ' + challengeId));
      }

      if (!safeList.currentUserIsSafe(req)) {
        challenge.getSubmissions({where: {submitterId: user.id}}).success(function (submissions) {
          cb(null, submissions);
        }).error(function (err) {
          cb(new errors.Error('DBReadError: '+err.message, err));
        });
      } else {
        cb(null, null);
      }
    },
    function (submissions, cb) {
      if (!safeList.currentUserIsSafe(req)) {
        if (!submissions || submissions.length === 0) {
          return cb(new errors.AuthenticationRequiredError('User is not authorized'));
        }
      }
      _findById(File, {where: {id:fileId, submissionId: submissionId}}, cb);
    },
    function (file, cb) {
      if (!file) {
        return cb(new errors.NotFoundError('Cannot find a file for fileId ' + fileId));
      }
      storageLib[method](file, cb);
    }
  ], function (err, result) {
    if (err) {
      return next(err);   // go to error handler
    } else {
      req.data = {
        success: true,
        status: 200,
        metadata: {
          totalCount: 1
        },
        content: {url: result}
      };
    }
    next();
  });
};

/**
 * This method return the file download URL for a challenge file.
 * It uses lib/storage to get the download URL based on the storage provider configuration
 * Only participants can download the files
 *
 * @param  {Object}     req       Express request instance
 * @param  {Object}     res       Express response instance
 * @param  {Function}   next      Next function
 */
exports.getChallengeFileDownloadURL = function(req, res, next) {
  getChallengeFileURL('getDownloadUrl', req, res, next);
};

/**
 * This method return the file upload URL for a challenge file.
 * Only the participants can upload the file
 *
 * @param  {Object}     req       Express request instance
 * @param  {Object}     res       Express response instance
 * @param  {Function}   next      Next function
 */
exports.getChallengeFileUploadURL = function(req, res, next) {
  getChallengeFileURL('getUploadUrl', req, res, next);
};

/**
 * This method return the file download URL for a submission file.
 * It uses lib/storage to get the download URL based on the storage provider configuration
 * Only the person who submitted the file can download the file
 *
 * @param  {Object}     req       Express request instance
 * @param  {Object}     res       Express response instance
 * @param  {Function}   next      Next function
 */
exports.getSubmissionFileDownloadURL = function(req, res, next) {
  getSubmissionFileURL('getDownloadUrl', req, res, next);
};

/**
 * This method return the file upload URL for a submission file.
 *
 * @param  {Object}     req       Express request instance
 * @param  {Object}     res       Express response instance
 * @param  {Function}   next      Next function
 */
exports.getSubmissionFileUploadURL = function(req, res, next) {
  getSubmissionFileURL('getUploadUrl', req, res, next);
};