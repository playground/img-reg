// const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const NodeWebcam = require('node-webcam');

const loadModel = async (modelPath) => {
  // const handler = tfnode.io.fileSystem(`./${modelPath}`);
  // const model = await tfnode.loadLayersModel(handler);
  // const model = await tfnode.loadLayersModel(modelPath);
  const model = await tfnode.node.loadSavedModel(modelPath, ['serve'], 'serving_default');
  // const model = await tfnode.loadGraphModel(modelPath);
  return model;
}

//Default options

const opts = {

  //Picture related

  width: 1280,

  height: 720,

  quality: 100,

  // Number of frames to capture
  // More the frames, longer it takes to capture
  // Use higher framerate for quality. Ex: 60
  frames: 60,

  //Delay in seconds to take shot
  //if the platform supports miliseconds
  //use a float (0.1)
  //Currently only on windows
  delay: 0,

  //Save shots in memory
  saveShots: true,

  // [jpeg, png] support varies
  // Webcam.OutputTypes

  output: "jpeg",

  //Which camera to use
  //Use Webcam.list() for results
  //false for default device
  device: false,

  // [location, buffer, base64]
  // Webcam.CallbackReturnTypes
  callbackReturn: "buffer",

  //Logging
  verbose: false

};

const classify = async (modelPath) => {
  const model = await loadModel(modelPath);
  const webcam = NodeWebcam.create( opts );
  
  // webcam.getLastShot( function(err, shot) {
  //   webcam.getBase64(shot, function(err, decodedImage) {
  //     const predictions = model.predict(decodedImage);
  //     console.log('predictions:', predictions);
  //   });
  // });

  webcam.capture( 'my_picture', ( err, data ) => {
    if(!err) {
      // const image = fs.readFileSync('my_picture.jpg');
      // const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
      const decodedImage = tfnode.node.decodeImage(new Uint8Array(data), 3);
      const predictions = model.predict(decodedImage);
      console.log('predictions:', predictions);
      // webcam.getBase64(0, (err, data) => {
      //   const predictions = model.predict(data);
      //   console.log('predictions:', predictions);  
      // })
    }  
  });
  
}

console.log(process.argv[2])    
classify(process.argv[2])
