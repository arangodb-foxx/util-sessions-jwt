/*global require, exports, applicationContext */
'use strict';

const _ = require('underscore');
const joi = require('joi');
const crypto = require('org/arangodb/crypto');
const Foxx = require('org/arangodb/foxx');
const errors = require('./errors');
const cfg = applicationContext.configuration;

const Session = Foxx.Model.extend({
  schema: {
    uid: joi.string().allow(null).required().default(null),
    sessionData: joi.object().required().default('Empty object', Object),
    userData: joi.object().required().default('Empty object', Object),
    created: joi.number().integer().required().default('Current date', Date.now),
    lastAccess: joi.number().integer().required('Current date', Date.now),
    lastUpdate: joi.number().integer().required('Current date', Date.now)
  }
});

function createSession(sessionData, userData) {
  let session = new Session({
    uid: (userData && userData._id) || null,
    sessionData: sessionData || {},
    userData: userData || {}
  });
  return session;
}

Session.fromClient = function (sid) {
  const now = Date.now();
  let session = new Session();

  try {
    const data = crypto.jwtDecode(cfg.jwtAlgorithm === 'none' ? null : cfg.jwtSecret, sid);
    session.set({
      uid: data.uid,
      sessionData: data.sessionData,
      userData: data.userData,
      lastAccess: data.luat,
      lastUpdate: data.lmat,
      created: data.iat
    });
  } catch (e) {
    throw new errors.SessionNotFound();
  }

  session.set('lastAccess', now);
  session.enforceTimeout();

  return session;
};

_.extend(Session.prototype, {
  forClient: function () {
    const data = {
      uid: this.get('uid'),
      sessionData: this.get('sessionData'),
      userData: this.get('userData'),
      luat: this.get('lastAccess'),
      lmat: this.get('lastUpdate'),
      iat: this.get('created')
    };
    const sid = crypto.jwtEncode(cfg.jwtAlgorithm === 'none' ? null : cfg.jwtSecret, data, cfg.jwtAlgorithm);
    return sid;
  },
  enforceTimeout: function () {
    if (this.hasExpired()) {
      throw new errors.SessionExpired();
    }
  },
  hasExpired: function () {
    return this.getTTL() === 0;
  },
  getTTL: function () {
    if (!cfg.timeToLive) {
      return Infinity;
    }
    return Math.max(0, this.getExpiry() - Date.now());
  },
  getExpiry: function () {
    if (!cfg.timeToLive) {
      return Infinity;
    }
    let prop = cfg.ttlType;
    if (!prop || !this.get(prop)) {
      prop = 'created';
    }
    return this.get(prop) + cfg.timeToLive;
  },
  setUser: function (user) {
    if (user) {
      this.set('uid', user.get('_id'));
      this.set('userData', user.get('userData'));
    } else {
      delete this.attributes.uid;
      this.set('userData', {});
    }
    return this;
  },
  save: function () {
    const now = Date.now();
    this.set('lastAccess', now);
    this.set('lastUpdate', now);
    return this;
  }
});

exports.create = createSession;
exports.get = Session.fromClient;
exports.errors = errors;
