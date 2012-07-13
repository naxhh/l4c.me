// Generated by CoffeeScript 1.3.3
var config, helpers, invoke, model, mongo_session, mongoose, ntwitter, photo_ids, queue, tweet_photo, underscore, _;

photo_ids = process.argv.slice(2);

_ = underscore = require("underscore");

if (!module.parent && _.isEmpty(photo_ids)) {
  throw new Error('No photo ids were passed');
  return process.exit(1);
}

_.str = underscore.str = require("underscore.string");

invoke = require("invoke");

ntwitter = require("ntwitter");

config = require("../config.json");

helpers = require("../build/lib/helpers");

mongo_session = require('connect-mongo');

mongoose = require('mongoose');

mongoose.connect(config.mongodb);

model = {
  user: require("../build/models/user"),
  photo: require("../build/models/photo")
};

module.exports.tweet_photo = tweet_photo = function(photo_id, callback) {
  var photo, twit, user;
  twit = null;
  photo = null;
  user = null;
  if (!_.isFunction(callback)) {
    callback = function() {};
  }
  return invoke(function(data, callback) {
    console.log('init find photo');
    return model.photo.findOne({
      _id: photo_id
    }, callback);
  }).then(function(data, callback) {
    console.log('then find user');
    photo = data;
    return model.user.findOne({
      _id: photo._user
    }, callback);
  }).then(function(data, callback) {
    console.log('then verify credentials');
    user = data;
    if (!user.twitter) {
      return callback(new Error('This user has no twitter account'));
    }
    twit = new ntwitter({
      consumer_key: config.twitter.consumerKey,
      consumer_secret: config.twitter.consumerSecret,
      access_token_key: user.twitter.token,
      access_token_secret: user.twitter.token_secret
    });
    return twit.verifyCredentials(callback);
  }).then(function(data, callback) {
    var hashtag, length, photo_name, photo_url, tweet, tweet_format, url_length;
    photo_url = "http://" + (_.first(_.keys(config.domains))) + "/" + user.username + "/" + photo.slug;
    hashtag = config.twitter.hashtag ? ' ' + config.twitter.hashtag : '';
    tweet_format = "" + helpers.heart + " %s [pic] %s%s";
    url_length = 20;
    length = 120 - (_.str.sprintf(tweet_format, '', '', hashtag).length + url_length);
    photo_name = _.str.truncate(photo.name, length);
    tweet = _.str.sprintf(tweet_format, photo_name, photo_url, hashtag);
    console.log('then tweet status');
    console.log(tweet);
    twit.updateStatus(tweet, callback);
    return console.log("tweet status " + photo._id + " - " + photo.slug);
  }).rescue(function(err) {
    console.error('error ----------------->');
    console.error(err);
    return callback(err);
  }).end(null, function(data) {
    console.log("tweet end " + photo._id + " - " + photo.slug);
    return callback(null, data);
  });
};

if (!module.parent) {
  queue = invoke(function(data, callback) {
    return callback();
  });
  _.each(photo_ids, function(value, key, list) {
    return queue.and(function(data, callback) {
      return tweet_photo(value, callback);
    });
  });
  queue.rescue(function(err) {
    return process.exit(1);
  });
  queue.end(null, function(data) {
    console.log("done");
    return process.exit();
  });
}
