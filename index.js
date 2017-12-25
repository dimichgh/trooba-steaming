'use strict';

const Assert = require('assert');
const NodeUtils = require('util');
const stream = require('stream');
const plugin = require('trooba-plugin');
const request = require('trooba-request-response');

const Readable = stream.Readable;
const Writable = stream.Writable;
const Duplex = stream.Duplex;

module.exports = plugin(request, {
    troobaVersion: '^3'
});
/**
 * A stream that the client can write to. It will buffer data till it is ready
 */
function TroobaWritableStream(pipeStream) {
    Writable.call(this, {objectMode: true});
    this._init(pipeStream);
    hookPipeEventsToStream(pipeStream, this);
}

module.exports.TroobaWritableStream = TroobaWritableStream;

NodeUtils.inherits(TroobaWritableStream, Writable);

function _initWrite(pipeStream) {
    /*jshint validthis:true */
    this._stream = pipeStream;
    this.once('finish', () => {
        this._stream.end();
    });

    if (pipeStream.direction === 2) { // RESPONSE flow
        this.on('error', err => {
            pipeStream.point.throw(err);
        });
    }
}

function _write(message, encoding, callback) {
    /*jshint validthis:true */
    this._stream.write(message);
    callback();
}

TroobaWritableStream.prototype._write = _write;
TroobaWritableStream.prototype._init = _initWrite;

/**
 * A stream that the client can read from.
 */
function TroobaReadableStream(pipeStream) {
    Readable.call(this, {objectMode: true});

    this._init(pipeStream);
    hookPipeEventsToStream(pipeStream, this);
}

module.exports.TroobaReadableStream = TroobaReadableStream;

NodeUtils.inherits(TroobaReadableStream, Readable);

function hookPipeEventsToStream(pipeStream, stream) {
    pipeStream.on('*', function (message) {
        stream.emit(message.type, message.data);
        message.next();
    });
}

function _initRead(pipeStream) {
    var onData = (data, next) => {
        if (this._paused) {
            Assert.ok(!this._pausedData, 'Atempt to use buffer that has already been taken. Make sure there are no multiple calls that do resume in the pipe');
            debug('# delay response data', data);
            this._pausedData = {
                data: data,
                done: next
            };
            return;
        }

        debug('# reading response data', data);
        this._paused = !this.push(data || null);

        next();
    };

    /*jshint validthis:true */
    pipeStream.on('response:data', onData);
    pipeStream.on('request:data', onData);

    pipeStream.on('error', err => {
        debug('# reading response error', err);
        this.emit('error', err);
    });
}

function _read() {
    /*jshint validthis:true */
    this._paused = false;
    if (this._pausedData) {
        const data = this._pausedData.data;
        const next = this._pausedData.done;
        this._pausedData = undefined;
        this._paused = !this.push(data);
        // resume pipe point
        setImmediate(next);
    }
}

TroobaReadableStream.prototype._read = _read;
TroobaReadableStream.prototype._init = _initRead;

function TroobaDuplexStream(pipe) {
    Duplex.call(this, {objectMode: true});
    this._initWrite(pipe);
    this._initRead(pipe);
    this.$pipe = pipe;
    hookPipeEventsToStream(pipe, this);
}

module.exports.TroobaDuplexStream = TroobaDuplexStream;

NodeUtils.inherits(TroobaDuplexStream, Duplex);

TroobaDuplexStream.prototype._initRead = _initRead;
TroobaDuplexStream.prototype._initWrite = _initWrite;
TroobaDuplexStream.prototype._read = _read;
TroobaDuplexStream.prototype._write = _write;

function debug() {
    module.exports.debug.apply(null, arguments);
}

module.exports.debug = process &&
    process.env &&
    process.env.DEBUG &&
    process.env.DEBUG.indexOf('trooba/trooba-streaming') !== -1 ? console.log : function noop() {};
