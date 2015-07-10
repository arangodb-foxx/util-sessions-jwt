# The JWT Sessions Storage

The sessions app provides a JWT-based session storage JavaScript API that can be used in other Foxx apps.

[![Build status](https://img.shields.io/travis/arangodb/foxx-sessions-jwt.svg)](https://travis-ci.org/arangodb/foxx-sessions-jwt)

Throughout this document the term "session ID" refers to the JWT representation of a session.

## Configuration

This app has the following configuration options:

* *timeToLive* (optional): number of milliseconds until the session expires or `0` to disable session expiry. Default: `604800000` (one week).
* *ttlType* (optional): attribute against which the *timeToLive* is enforced. Valid options: `"lastAccess"`,  `"lastUpdate"`, `"created"`. Default: `"lastAccess"`.
* *jwtSecret* (required unless *algorithm* is `'none'`): JWT secret to use to sign the JWT payload.
* *jwtAlgorithm* (optional): JWT signing algorithm to use, e.g. HS512, HS384, HS256 or 'none'. Default: `"HS512"`.

## JavaScript API: sessionStorage

This app exposes a session storage via a JavaScript API named *sessionStorage*.

**Examples**

First add this app to your dependencies:

```js
{
  ...
  "dependencies": {
    "sessions": "sessions-jwt:^1.0.0"
  }
  ...
}
```

Once you've configured both apps correctly, you can use it like this:

```js
var Foxx = require('org/arangodb/foxx');
var controller = new Foxx.Controller(applicationContext);
var sessionStorage = applicationContext.dependencies.sessions.sessionStorage;

controller.activateSessions({
  sessionStorage: sessionStorage,
  cookie: true,
  header: true
});
```

The api requires one or both cookie and header to be set to work.

### Exceptions

#### Session Not Found

Indicates a session could not be derived from the given token.

`new sessionStorage.errors.SessionNotFound(sessionId)`

Thrown by the session storage's *get* method if passed a session ID that is not a valid token.

**Examples**

```js
try {
    sessionStorage.get(invalidSessionId);
} catch(err) {
    assertTrue(err instanceof sessionStorage.errors.SessionNotFound);
}
```

#### Session Expired

Indicates the session has expired.

`new sessionStorage.errors.SessionExpired(sessionId)`

Thrown by the session storage's *get* method if passed a session ID for a session that has expired. See also this app's configuration options.

**Examples**

```js
try {
    sessionStorage.get(expiredSessionId);
} catch(err) {
    assertTrue(err instanceof sessionStorage.errors.SessionExpired);
    assertTrue(err instanceof sessionStorage.errors.SessionNotFound);
}
```

### The session object

Session objects are instances of a Foxx model with the following attributes:

* *sessionData*: volatile session data. This can be an arbitrary object that will be stored with the session in the token. If you want to store session-specific (rather than user-specific) data, this is the right place for that
* *uid*: the sessions active users *_id* or `undefined` (no active user)
* *userData*: the session's active users *userData* attribute or an empty object
* *created*: timestamp the session was created at
* *lastAccess*: timestamp of the last time the session token was handled
* *lastUpdate*: timestamp of the last time the session data was modified

### Create a session

Creates and saves a new instance of the session model.

`sessionStorage.create(sessionData)`

**Parameter**

* *sessionData* (optional): an arbitrary object that will be stored as the sessions *sessionData* attribute in the token

**Examples**

```js
var session = sessionStorage.create(sessionData);
var session = sessionStorage.create(sessionData);
```

### Fetch an existing session

Parse a session from a given token.

`sessionStorage.get(sessionId)`

Attempts to parse the session from the given token. If the session is invalid, a *SessionNotFound* exception will be thrown. If the session is valid, but has already expired, a *SessionExpired* exception will be thrown instead.

**Parameter**

* *sessionId*: a session ID.

**Examples**

```js
var session = sessionStorage.get(sessionId);
```

### Delete a session

JWT-based sessions can not be deleted. If you want to invalidate tokens you need to implement an invalidation scheme on top of the session storage.

### Save a session

Update the session's *lastUpdate* timestamp.

`session.save()`

If you have made any changes to the session, you should invoke this method before passing on the session token.

**Examples**

```js
session.setUser(user);
session.save();
```

### Set a session's active user

Set the active user of a session.

`session.setUser(user)`

Expects a Foxx model with a *userData* attribute and sets the sessions *uid* attribute to the models *_id* and the sessions *userData* attribute to the models *userData* attribute.

**Parameter**

* *user*: instance of a Foxx model with a *userData* attribute

**Examples**

```js
session.setUser(user);
assertEqual(session.get('uid'), user.get('_id'));
assertEqual(session.get('userData'), user.get('userData'));
```

### Determine whether a session has expired

Get a session's expiry state.

`session.hasExpired()`

Returns `true` if the sessions expiry time lies in the past, `false` otherwise.

### Determine when a session will expire

Get a session's expiry time.

`session.getExpiry()`

Returns an integer representing the UTC timestamp in milliseconds at which the session will expire, or `Infinity` (indicating the session will never expire) if session expiry is disabled.

### Determine the TTL of a session

Get a session's time to live.

`session.getTTL()`

Returns an integer representing number of milliseconds until the session will expire, or `Infinity` (indicating the session will never expire) if session expiry is disabled.

### Convert a session instance to a token

Get the JWT representation of a session.

`session.forClient()`

Returns a (signed or unsigned) JWT representation of the session that is accepted by `session.get`.

## License

This code is distributed under the [Apache License](http://www.apache.org/licenses/LICENSE-2.0) by ArangoDB GmbH.
