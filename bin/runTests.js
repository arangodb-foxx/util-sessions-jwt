/*jshint node: true */
'use strict';
var http = require('http');
var mountPath = '/temp-' + process.pid + '-' + Date.now();

function post(path, payload) {
  return new Promise(function (resolve, reject) {
    var requestBody = new Buffer(JSON.stringify(payload));
    var options = {
      host: 'localhost',
      port: 8529,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': requestBody.length
      }
    };
    var req = http.request(options, function (res) {
      var chunks = [];
      res.on('error', function (err) {reject(err);});
      res.on('data', function (chunk) {chunks.push(chunk);});
      res.on('end', function () {
        try {
          res.body = Buffer.concat(chunks).toString('utf-8');
          res.body = JSON.parse(res.body);
        } catch (e) {
          return reject(res);
        }
        if (res.statusCode >= 400) reject(res);
        else resolve(res);
      });
    });
    req.on('error', function (err) {reject(err);});
    req.write(requestBody);
    req.end();
  });
}

function write(str, indentStr) {
  if (!Array.isArray(str)) console.log((indentStr || '') + str);
  else str.forEach(function (s) {console.log((indentStr || '') + s);});
}
write.indent = function () {return write.indented('  ');};
write.indented = function (indentStr) {
  var write = function (str) {this(str, indentStr);}.bind(this);
  write.indent = function () {return this.indented(indentStr + indentStr);}.bind(this);
  return write;
};

function prettyPrintTestResults(results) {
  results.tests.forEach(function (test) {prettyPrintTest(test, write);});
  results.suites.forEach(function (suite) {prettyPrintSuite(suite, write);});
  var resultStr = '';
  if (results.stats.failures) resultStr = results.stats.failures + ' failing';
  if (results.stats.passes) {
    if (resultStr) resultStr += ', ';
    resultStr += results.stats.passes + ' passing';
  }
  resultStr += ' (' + results.stats.duration + 'ms)';
  write(['', resultStr]);
}

function prettyPrintTest(test, write) {
  var titleStr = (test.result === 'pass' ? '✓' : '×') + ' ' + test.title;
  if (test.duration > 75) titleStr += ' (' + test.duration + 'ms)';
  write(titleStr);
  if (test.err.stack) {
    write(test.err.stack.split('\n'));
  }
}

function prettyPrintSuite(suite, write) {
  write(suite.title);
  suite.tests.forEach(function (test) {prettyPrintTest(test, write.indent());});
  suite.suites.forEach(function (suite) {prettyPrintSuite(suite, write.indent());});
}

function cleanup() {
  console.log('\nCleaning up...');
  return post('/_admin/foxx/uninstall', {mount: mountPath})
  .then(
    function () {console.log('Completed cleanup.')},
    function (err) {console.warn('Cleanup failed.', err.stack);}
  );
}


console.log('Mount path:', mountPath);
console.log('Installing app...');
post('/_admin/foxx/install', {appInfo: process.cwd(), mount: mountPath})
.then(function () {
  console.log('Running tests...\n');
  return post('/_admin/foxx/tests', {mount: mountPath, options: {reporter: 'suite'}});
})
.then(function (res) {
  prettyPrintTestResults(res.body);
  if (res.body.stats.failures) return Process.reject();
})
.then(cleanup, function (err) {
  cleanup().then(function () {
    if (err) console.error(err);
    process.exit(1);
  });
});