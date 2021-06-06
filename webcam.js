// const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
const labels = require('./inference_graph/saved_model/assets/labels.json');
// const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const NodeWebcam = require('node-webcam');
const Jimp = require('Jimp');

const loadModel = async (modelPath) => {
  // const handler = tfnode.io.fileSystem(`./${modelPath}`);
  // const model = await tfnode.loadLayersModel(handler);
  // const model = await tfnode.loadLayersModel(modelPath);
  const model = await tfnode.node.loadSavedModel(modelPath, ['serve'], 'serving_default');
  // const model = await tfnode.loadGraphModel(modelPath);
  return model;
}

const loadImage = async (buffer) => {
  let img_tensor;
  new Jimp({ data: buffer, width: 1280, height: 768 }, (err, image) => {
    // this image is 1280 x 768, pixels are loaded from the given buffer.
    // const image = await Jimp.read(buffer);
    image.cover(224, 224, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
  
    const NUM_OF_CHANNELS = 3;
    let values = new Float32Array(224 * 224 * NUM_OF_CHANNELS);
  
    let i = 0;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
      pixel.r = pixel.r / 127.0 - 1;
      pixel.g = pixel.g / 127.0 - 1;
      pixel.b = pixel.b / 127.0 - 1;
      pixel.a = pixel.a / 127.0 - 1;
      values[i * NUM_OF_CHANNELS + 0] = pixel.r;
      values[i * NUM_OF_CHANNELS + 1] = pixel.g;
      values[i * NUM_OF_CHANNELS + 2] = pixel.b;
      i++;
    });
  
    const outShape = [224, 224, NUM_OF_CHANNELS];
    img_tensor = tf.tensor3d(values, outShape, 'float32');
    img_tensor = img_tensor.expandDims(0);
    return img_tensor;  
  });
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
  const modelInfo = await tfnode.node.getMetaGraphsFromSavedModel(modelPath);
  console.dir(modelInfo);
  console.dir(modelInfo[0].signatureDefs.serving_default);
const model = await loadModel(modelPath);
  const webcam = NodeWebcam.create( opts );
  
  // webcam.getLastShot( function(err, shot) {
  //   webcam.getBase64(shot, function(err, decodedImage) {
  //     const predictions = model.predict(decodedImage);
  //     console.log('predictions:', predictions);
  //   });
  // });

  webcam.capture( 'my_picture', async ( err, data ) => {
    if(!err) {
      // const image = fs.readFileSync('my_picture.jpg');
      // const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
      const decodedImage = tfnode.node.decodeImage(new Uint8Array(data), 3);
      const input = decodedImage.expandDims(0);
      // let input = tfnode.zeros([1, 224, 224, 3]);
      // input[0] = decodedImage;
      let outputTensor = await model.predict({input_tensor: input});
      const scores = await outputTensor['detection_scores'].arraySync();
      const boxes = await outputTensor['detection_boxes'].arraySync();
      const classes = await outputTensor['detection_classes'].arraySync();
      const num = await outputTensor['num_detections'].arraySync();
      outputTensor['detection_scores'].dispose();
      outputTensor['detection_boxes'].dispose();
      outputTensor['detection_classes'].dispose();
      outputTensor['num_detections'].dispose();
      const detectedBoxes = [];
      const detectedNames = [];
      const detectedScores = [];
      for (let i = 0; i < scores[0].length; i++) {
        if (scores[0][i] > 0.3) {
          detectedBoxes.push(boxes[0][i]);
          detectedNames.push(labels[classes[0][i]]);
          detectedScores.push(scores[0][i]);
        }
      }
      console.log('predictions:', detectedBoxes, detectedNames, detectedScores);
        // webcam.getBase64(0, (err, data) => {
      //   const predictions = model.predict(data);
      //   console.log('predictions:', predictions);  
      // })
    }  
  });
  
}

console.log(process.argv[2])    
classify(process.argv[2])
