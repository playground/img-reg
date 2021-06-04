#! /usr/bin/env node
const path = require('path');
const cp = require('child_process'),
  exec = cp.exec;
const fs = require('fs');

if(fs.existsSync('./index.js')) {
  const file = fs.readFileSync('./index.js').toString().split('\n');
  let output = [];
  let match;
  file.forEach((line, i) => {
    if(line.indexOf('require("../') > 0) {
      match = line.match(/[^\/]+$/);
      if(match) {
        output.push(line.replace(/\(.*?\)\s?/, `("./${match[0]}`));
      } else {
        output.push(line);
      }
    } else {
      output.push(line);
    }
  });
  let text = output.join('\n');
  // console.log(text);
  fs.writeFile('./index.js', text, function (err) {
    if (err) {
      console.log(err);
      process.exit(1);
    }  
    console.log('cleanse index.js');
    output = [];
    if(fs.existsSync('./mongo-db.js')) {
      const file = fs.readFileSync('./mongo-db.js').toString().split('\n');
      file.forEach((line, i) => {
        if(line.indexOf('require("../') > 0) {
          match = line.match(/[^\/]+$/);
          if(match) {
            output.push(line.replace(/\(.*?\)\s?/, `("./${match[0]}`));
          } else {
            output.push(line);
          }
        } else {
          output.push(line);
        }
      });
      let text = output.join('\n');
      fs.writeFile('./mongo-db.js', text, function (err) {
        if (err) {
          console.log(err);
          process.exit(1);
        }  
        console.log('cleanse mongo-db.js');
      });      
    }
  });
}
