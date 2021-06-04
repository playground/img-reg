"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ResponseMessage {
    constructor(body, headers, statusCode = 200) {
        this.body = body;
        this.headers = headers;
        this.statusCode = statusCode;
    }
}
exports.ResponseMessage = ResponseMessage;
class Messenger {
    constructor(params) {
        this.params = params;
    }
    send(body, headers = { 'Content-Type': 'application/json' }) {
        return new ResponseMessage(body, headers);
    }
    error(msg, status) {
        return new ResponseMessage(msg, { 'Content-Type': 'application/json' }, status);
    }
    send2(body, statusCode = 200, contentType = 'application/json; charset=utf-8') {
        const headers = {
            'Content-Type': contentType
        };
        return new ResponseMessage(body, headers, statusCode);
    }
}
exports.Messenger = Messenger;
