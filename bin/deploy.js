#! /usr/bin/env node
const path = require('path');
const cp = require('child_process'),
  exec = cp.exec;
const fs = require('fs');
const jsonfile = require('jsonfile')
const dotenv = require('dotenv');

if(fs.existsSync('.env-local')) {
  const localEnv = dotenv.parse(fs.readFileSync('.env-local'));
  for(var i in localEnv) {
    process.env[i] = localEnv[i];
  }
}

const task = process.env.npm_config_task || 'deploy';
const package = process.env.npm_config_package || 'ieam-dev';
const env = process.env.npm_config_env || 'dev';
const region = process.env.npm_config_region || 'us-south';
const account = process.env.npm_config_account;


let build = {
  deploy: () => {
    let arg = `ibmcloud fn action update ${package}/img-recog-action --docker playbox21/action-nodejs-v12:tfjs index.js`;
    arg += ` --param bucket ${process.env.BUCKET} --param accessKeyId ${process.env.ACCESSKEYID}`;
    arg += ` --param secretAccesKey ${process.env.SECRETACCESSKEY} --param endpoint ${process.env.COS_ENDPOINT}`;
    arg += ` --param ibmAuthEndpoint ${process.env.COS_IBMAUTHENDPOINT} --param region ${process.env.REGION}`;
    arg += ` --param serviceInstanceId ${process.env.SERVICEINSTANCEID}`;
    console.log('deploying...')
    exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
      if(!err) {
        console.log(stdout)
        console.log(`done add/update ${package}/img-recog-action `);
      } else {
        console.log('failed to add/update img-recog-action ', err);
      }
    });
  },
  getEnvVar: () => {
    const cosAccess = JSON.parse(process.env.COS_ACCESS);
    let pEnv = process.env;
    pEnv.PACKAGE = package;
    pEnv.ACCESSKEYID = cosAccess[env]['access_key_id'];
    pEnv.SECRETACCESSKEY = cosAccess[env]['secret_access_key'];
    pEnv.APIKEYID = cosAccess[env]['apikey'];
    pEnv.SERVICEINSTANCEID = cosAccess[env]['resource_instance_id'];
    pEnv.BUCKET = cosAccess[env]['bucket'];
  },
  switchTarget: (cb) => {
    if(account) {
      console.log(process.env.HOME, process.env.USERPROFILE);
      jsonfile.readFile(`${process.env.HOME}/apikeys/${account}.json`, function (err, obj) {
        if (!err) {
          const arg = `ibmcloud login --apikey ${obj.apiKey} -r ${region} -o ${obj.org} -s ${obj.space} && ibmcloud fn api list`;
          console.log(`switch to ${arg}`);
          exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
            if(!err) {
              console.log(stdout)
              console.log(`switch account successfully`);
              cb();
            } else {
              console.log('failed to switch account', err);
            }
          });
        } else {
          console.error(err)
        }
      })
    } else {
      cb();
    }
  },
  test: () => {
    build.getEnvVar();
    build.switchTarget(() => {
      let pEnv = process.env;
      console.log(pEnv.SECRETACCESSKEY, env)
      console.log(pEnv)
    })
  }
}

build[task]();
