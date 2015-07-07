/*global exports */
'use strict';
function SessionNotFound(sid) {
  this.message = 'Session with session id ' + sid + ' not found.';
  var err = new Error(this.message);
  err.name = this.name;
  this.stack = err.stack;
}
SessionNotFound.prototype = new Error();
SessionNotFound.prototype.constructor = SessionNotFound;
Object.defineProperty(SessionNotFound.prototype, 'name', {
  enumerable: true,
  configurable: true,
  get: function () {
    return this.constructor.name;
  }
});

function SessionExpired(sid) {
  this.message = 'Session with session id ' + sid + ' has expired.';
  var err = new Error(this.message);
  err.name = this.name;
  this.stack = err.stack;
}
SessionExpired.prototype = Object.create(SessionNotFound.prototype);
SessionExpired.prototype.constructor = SessionExpired;
Object.defineProperty(SessionExpired.prototype, 'name', {
  enumerable: true,
  configurable: true,
  get: function () {
    return this.constructor.name;
  }
});

exports.SessionNotFound = SessionNotFound;
exports.SessionExpired = SessionExpired;