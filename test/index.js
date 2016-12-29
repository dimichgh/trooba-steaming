'use strict';

var Assert = require('assert');
var TroobaWritableStream = require('..').TroobaWritableStream;
var TroobaReadableStream = require('..').TroobaReadableStream;
var TroobaDuplexStream = require('..').TroobaDuplexStream;

describe(__filename, function () {

    it('should do stream/response flow', function (next) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var response = [];
            pipe.on('request', (request, next) => {
                next();
            });
            pipe.on('request:data', (data, next) => {
                setImmediate(next);
                if (data) {
                    response.push(data);
                    return;
                }
                pipe.respond(response);
            });
        })
        .build();

        var stream = new TroobaWritableStream(pipe.create().streamRequest('r1'));

        stream
        .on('error', err => {
            next(err);
        })
        .on('response', response => {
            Assert.deepEqual(['foo', 'bar'], response);
            next();
        });

        stream.write('foo');
        stream.write('bar');
        stream.end();
    });

    it('should do stream/response flow with reader', function (done) {
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
            Assert.deepEqual(['foo', 'bar'], response);
            done();
        });
        stream.write('foo');
        stream.write('bar');
        stream.end();
    });

    it('should do request/stream flow, writer', function (done) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var stream;
            pipe.on('request', (request, next) => {
                stream = new TroobaWritableStream(pipe.streamResponse(request));
                stream.write('foo');
                stream.write('bar');
                stream.end();

                next();
            });
        })
        .build();

        var order = [];

        pipe.create().request('r1')
        .on('error', done)
        .on('response:data', (data, next) => {
            if (data) {
                order.push(data);
                return next();
            }
            Assert.deepEqual(['foo', 'bar'], order);
            done();
        });
    });

    it('should do request/stream flow with stream reader', function (done) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var stream;
            pipe.on('request', (request, next) => {
                stream = new TroobaWritableStream(pipe.streamResponse(request));
                stream.write('foo');
                stream.write('bar');
                stream.end();

                next();
            });
        })
        .build();

        var order = [];
        var stream = new TroobaReadableStream(pipe.create().request('r1'));

        stream.on('error', done)
        .on('data', data => {
            if (data) {
                order.push(data);
                return;
            }
        })
        .on('end', () => {
            Assert.deepEqual(['foo', 'bar'], order);
            done();
        });
    });

    it('should do stream/stream flow', function (done) {
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
            Assert.deepEqual(['foo', 'bar'], order);
            done();
        });

        stream.write('foo');
        stream.write('bar');
        stream.end();
    });

    it('should do stream/stream flow with duplex', function (done) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var stream;
            pipe.on('request', (request, next) => {
                stream = new TroobaWritableStream(pipe.streamResponse(request));
                next();
            });
            pipe.on('request:data', (data, next) => {
                stream.write(data);
                next();
            });
        })
        .build();

        var order = [];

        var stream = new TroobaDuplexStream(pipe.create().streamRequest('r1'));

        stream
        .on('error', done)
        .on('data', data => {
            if (data) {
                order.push(data);
                return;
            }
        })
        .on('end', () => {
            Assert.deepEqual(['foo', 'bar'], order);
            done();
        });

        stream.write('foo');
        stream.write('bar');
        stream.end();
    });

    it('should get error during stream/response flow', function (next) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            pipe.on('request', (request, next) => {
                pipe.throw(new Error('Test error'));
            });
        })
        .build();

        var stream = new TroobaWritableStream(pipe.create().streamRequest('r1'));

        stream
        .on('error', err => {
            Assert.equal('Test error', err.message);
            next();
        })
        .on('response', response => {
            next(new Error('Should not happen'));
        });

        stream.write('foo');
        stream.write('bar');
        stream.end();
    });

    it('should get error during stream/response flow, at chunking phase', function (next) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            pipe.on('request:data', (data, next) => {
                setImmediate(next);
                if (data) {
                    return;
                }
                pipe.throw(new Error('Test error'));
            });
        })
        .build();

        var stream = new TroobaWritableStream(pipe.create().streamRequest('r1'));

        stream
        .on('error', err => {
            Assert.equal('Test error', err.message);
            next();
        })
        .on('response', response => {
            next(new Error('Should not happen'));
        });

        stream.write('foo');
        stream.write('bar');
        stream.end();
    });

    it('should get error during request/stream flow', function (done) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var stream;
            pipe.on('request', (request, next) => {
                stream = new TroobaWritableStream(pipe.streamResponse(request));
                stream.write('foo');
                setTimeout(function () {
                    pipe.throw(new Error('Test error'));
                }, 50);
                next();
            });
        })
        .build();

        var order = [];

        pipe
        .create()
        .request('r1')
        .on('error', err => {
            Assert.equal('Test error', err.message);
            Assert.deepEqual(['foo'], order);
            done();
        })
        .on('response:data', (data, next) => {
            if (data) {
                order.push(data);
                return next();
            }
            done(new Error('Should not happen'));
        });
    });

    it('should get error from response stream', function (done) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var stream;
            pipe.on('request', (request, next) => {
                stream = new TroobaWritableStream(pipe.streamResponse(request));
                stream.write('foo');
                setTimeout(function () {
                    stream.emit('error', new Error('Test error'));
                }, 50);
                next();
            });
        })
        .build();

        var order = [];

        pipe
        .create()
        .request('r1')
        .on('error', err => {
            Assert.equal('Test error', err.message);
            Assert.deepEqual(['foo'], order);
            done();
        })
        .on('response:data', (data, next) => {
            if (data) {
                order.push(data);
                return next();
            }
            done(new Error('Should not happen'));
        });
    });

    it('should get error during stream/stream flow', function (done) {
        var Trooba = require('trooba');
        var count = 0;

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var stream;
            pipe.on('request', (request, next) => {
                stream = new TroobaWritableStream(pipe.streamResponse(request));
                next();
            });
            pipe.on('request:data', (data, next) => {
                if (count++ > 0) {
                    if (count > 2) {
                        return;
                    }
                    return setTimeout(function () {
                        pipe.throw(new Error('Test error'));
                    }, 40);
                }
                stream.write(data);
                next();
            });
        })
        .build();

        var order = [];

        var stream = new TroobaDuplexStream(pipe.create().streamRequest('r1'));

        stream
        .on('error', err => {
            Assert.equal('Test error', err.message);
            Assert.deepEqual(['foo'], order);
            done();
        })
        .on('data', data => {
            if (data) {
                order.push(data);
                return;
            }
        });

        stream.write('foo');
        stream.write('bar');
        stream.end();
    });

    it('should handle paused stream', function (done) {
        var Trooba = require('trooba');

        var pipe = new Trooba()
        .use(function echo(pipe) {
            var stream;
            pipe.on('request', (request, next) => {
                stream = new TroobaWritableStream(pipe.streamResponse(request));
                next();
            });
            pipe.on('request:data', (data, next) => {
                stream.write(data);
                next();
            });
        })
        .build();

        var order = [];

        var stream = new TroobaDuplexStream(pipe.create().streamRequest('r1'));

        stream
        .on('error', done);
        stream.pause();

        var MAX = 20;

        setTimeout(function delay() {
            stream
            .on('data', data => {
                order.push(data);
            })
            .on('end', () => {
                Assert.equal(MAX, order.length);
                done();
            });
            stream.resume();
        }, 50);

        for (var i = 0; i < MAX; i++) {
            stream.write('foo' + i);
        }
        stream.end();
    });

});
