# trooba-streaming

[![codecov](https://codecov.io/gh/trooba/trooba-streaming/branch/master/graph/badge.svg)](https://codecov.io/gh/trooba/trooba-streaming)
[![Build Status](https://travis-ci.org/trooba/trooba-streaming.svg?branch=master)](https://travis-ci.org/trooba/trooba-streaming) [![NPM](https://img.shields.io/npm/v/trooba-streaming.svg)](https://www.npmjs.com/package/trooba-streaming)
[![Downloads](https://img.shields.io/npm/dm/trooba-streaming.svg)](http://npm-stat.com/charts.html?package=trooba-streaming)
[![Known Vulnerabilities](https://snyk.io/test/github/trooba/trooba-streaming/badge.svg)](https://snyk.io/test/github/trooba/trooba-streaming)

[Trooba](https://github.com/trooba/trooba) framework being isomorphic does not use nodejs native streaming.

This module provides nodejs streaming API for trooba pipeline.

## Get Involved

- **Contributing**: Pull requests are welcome!
    - Read [`CONTRIBUTING.md`](.github/CONTRIBUTING.md) and check out our [bite-sized](https://github.com/trooba/trooba-streaming/issues?q=is%3Aissue+is%3Aopen+label%3Adifficulty%3Abite-sized) and [help-wanted](https://github.com/trooba/trooba-streaming/issues?q=is%3Aissue+is%3Aopen+label%3Astatus%3Ahelp-wanted) issues
    - Submit github issues for any feature enhancements, bugs or documentation problems
- **Support**: Join our [gitter chat](https://gitter.im/trooba) to ask questions to get support from the maintainers and other Trooba developers
    - Questions/comments can also be posted as [github issues](https://github.com/trooba/trooba-streaming/issues)

## Install

```bash
npm install trooba-streaming --save
```

## Usage

### request/stream use-case
```js
var Trooba = require('trooba');

var pipe = new Trooba();
pipe.use(function echo(pipe) {
    var _request;
    var streamResponse;
    pipe.on('request', request => {
        _request = request;
        streamResponse = new TroobaWritableStream(pipe.streamResponse({
            statusCode: 200
        }));
    });
    pipe.on('request:data', data => {
        _request.forEach(data => {
            streamResponse.write(data);
        });
        streamResponse.end();
    });
})
.build();

var stream = new TroobaReadableStream(pipe.create().request(['foo', 'bar']));

stream
.on('response', response => {
    console.log('Response metadata:', response);
})
.on('error', err => {
    console.log('Error:', err);
})
.on('data', data => {
    console.log('Data:', data);
})
.on('end', () => {
    console.log('end of stream');
});
```

### stream/response use-case
```js
var Trooba = require('trooba');

var pipe = new Trooba()
.use(function echo(pipe) {
    pipe.on('request', (request, next) => {
        var response = [];

        new TroobaReadableStream(pipe)
        .on('data', data => {
            response.push(data);
        })
        .on('end', () => {
            pipe.respond(response);
        });

        next();
    });
})
.build();

var request = pipe.create().streamRequest('r1');
var stream = new TroobaWritableStream(request);

stream.on('response', response => {
    console.log('Response:', response);
    done();
});
stream.write('foo');
stream.write('bar');
stream.end();
```

### stream/stream use-case
```js
var Trooba = require('trooba');

var pipe = new Trooba()
.use(function echo(pipe) {
    pipe.on('request', (request, next) => {
        var stream = new TroobaDuplexStream(pipe.streamResponse(request))
        .on('data', data => {
            stream.write(data);
        })
        .on('end', () => {
            stream.end();
        });

        next();
    });
})
.build();

var order = [];

var stream = new TroobaWritableStream(pipe.create().streamRequest('r1'));

stream
.on('error', done)
.on('response:data', data => {
    if (data) {
        order.push(data);
        return;
    }
    console.log('Data received:', order);
    done();
});

stream.write('foo');
stream.write('bar');
stream.end();
```
