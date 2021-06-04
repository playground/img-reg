"use strict";
const https = require("https");
const tfnode = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
// const { Observable } = require('rxjs');

class ResponseMessage {
    constructor(body, headers, statusCode = 200) {
        this.body = body;
        this.headers = headers;
        this.statusCode = statusCode;
    }
}

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

function main(params) {
    let result;
    return new Promise((resolve, reject) => {
        action.exec(params)
            .then((data) => {
            result = data;
            console.log('data', data);
            const response = new Messenger(params);
            resolve(response.send(result));
        });
    });
}
exports.main = main;
global.main = main; // required when using webpack
let action = {
    exec: (params) => {
        const baseUrl = 'https://service.us.apiconnect.ibmcloud.com/gws/apigateway/api/646d429a9e5f06572b1056ccc9f5ba4de6f5c30159f10fcd1f1773f58d35579b/vap/';
        const match = params['__ow_headers'] ? params['__ow_headers']['x-forwarded-url'].match(/(^.*)?\?/) : null;
        let path = '';
        if (match) {
            path = match[1].replace(baseUrl, '').replace(/\//g, '_');
        }
        else {
            path = params['__ow_headers']['x-forwarded-url'].replace(baseUrl, '').replace(/\//g, '_');
        }
        return (action[path] || action[params.method] || action.default)(params);
    },
    inference: (params) => {
        return new Promise((resolve, reject) => {
            action.getImage(params.imageUrl)
            .then(async (image) => {
                const decodedImage = tfnode.node.decodeImage(image, 3);
                // const model = await mobilenet.load();
                const model = await tf.loadLayersModel(‘web_model/model.json’);
                const predictions = await model.classify(decodedImage);
                console.log('predictions:', predictions);
              
                resolve(predictions);
            }, (err) => {
                resolve(err);
            }).catch((e) => {
                resolve(`something went wrong... ${e}`)
            })
        });

    },
    getImage: (url) => {
        return new Promise((resolve, reject) => {
            let chunks = [];
            https.get(url, (resp) => {
                resp.setEncoding('binary');
                resp.on('data', (chunk) => {
                    chunks.push(Buffer.from(chunk, 'binary'));
                });
                resp.on('error', (err) => {
                    resolve(`${url} download failed...`);
                });
                resp.on('end', () => {
                    let binary = Buffer.concat(chunks);
                    resolve(binary);
                });
            });
        });
    },
    error: (msg) => {
        // return new Observable((observer) => {
        //     observer.next(msg);
        //     observer.complete();
        // });
    }
};
