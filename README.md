# trooba-streaming

The module provides nodejs streaming API for trooba pipeline.

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
        streamResponse = pipe.streamResponse({
            statusCode: 200
        });
    });
    pipe.on('request:data', data => {
        _request.forEach(data => {
            streamResponse.write(data);
        });
        streamResponse.end();
    });
})
.build();

var request = pipe.create().request(['foo', 'bar']);
var call = new ClientReadableStream(request);

call.on('error', err => {
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

var pipe = new Trooba();
pipe.use(function echo(pipe) {
    pipe.on('request', request => {
        // mock connection signal
        pipe.send({
            type: 'connection',
            flow: 2
        });
    });
    var response = [];
    pipe.on('request:data', data => {
        if (data) {
            response.push(data);
            return;
        }
        pipe.respond(data);
    });
})
.build();

var request = pipe.create().request(function (err, response) {
    console.log('Response:', err || response);
});
var call = new ClientWritableStream(request);

call.write('foo');
call.write('bar');
call.end();
```

### stream/stream use-case
```js
var Trooba = require('trooba');

var pipe = new Trooba();
pipe.use(function echo(pipe) {
    var streamResponse;
    pipe.on('request', request => {
        streamResponse = pipe.streamResponse({
            statusCode: 200
        });
    });
    pipe.on('request:data', data => {
        streamResponse.write(data);
    });
})
.build();

var request = pipe.create().request();
var call = new ClientDuplexStream(request);

call.on('error', err => {
    console.log('Error:', err);
})
.on('data', data => {
    console.log('Data:', data);
})
.on('end', () => {
    console.log('end of stream');
});

call.write('foo');
call.write('bar');
call.end();
```
