// const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
// const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const NodeWebcam = require('node-webcam');
const Jimp = require('Jimp');

const labelUrl = process.argv[3] ?? './inference_graph/saved_model/assets/labels.json';
const labels = require(labelUrl);

const SLEEP = 10000;

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

let model;
let webcam;
const classify = async (modelPath) => {
  // Get MetaGrapth
  // const modelInfo = await tfnode.node.getMetaGraphsFromSavedModel(modelPath);
  // console.dir(modelInfo);
  // console.dir(modelInfo[0].signatureDefs.serving_default);
  model = await loadModel(modelPath);
  webcam = NodeWebcam.create( opts );
  
  // webcam.getLastShot( function(err, shot) {
  //   webcam.getBase64(shot, function(err, decodedImage) {
  //     const predictions = model.predict(decodedImage);
  //     console.log('predictions:', predictions);
  //   });
  // });

  capture();
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let previousImage = null;
const capture = () => {
  webcam.capture( 'my_picture', async ( err, data ) => {
    if(!err) {
      if(previousImage == data) {
        console.log('do nothing');
        await sleep(SLEEP);
        capture();
        return;
      }
      previousImage = data;
      // const image = fs.readFileSync('my_picture.jpg');
      // const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
      const decodedImage = tfnode.node.decodeImage(new Uint8Array(data), 3);
      const input = decodedImage.expandDims(0);

      const startTime = tfnode.util.now();
      let outputTensor = await model.predict({input_tensor: input});
      const scores = await outputTensor['detection_scores'].arraySync();
      const boxes = await outputTensor['detection_boxes'].arraySync();
      const classes = await outputTensor['detection_classes'].arraySync();
      const num = await outputTensor['num_detections'].arraySync();
      const endTime = tfnode.util.now();
      outputTensor['detection_scores'].dispose();
      outputTensor['detection_boxes'].dispose();
      outputTensor['detection_classes'].dispose();
      outputTensor['num_detections'].dispose();
      
      let predictions = [];
      const elapsedTime = endTime - startTime;
      for (let i = 0; i < scores[0].length; i++) {
        if (scores[0][i] > 0.5) {
          predictions.push({
            detectedBox: boxes[0][i],
            detectedClass: labels[classes[0][i]],
            detectedScore: scores[0][i]
          });
        }
      }
      console.log('predictions:', predictions.length, predictions[0]);
      console.log('time took: ', elapsedTime);
      console.log('build html...');
      await buildHtml(predictions, elapsedTime);

      if(previousImage == data) {
        await sleep(SLEEP);
        capture();
        return;
      }
    }  
  });  

};

const buildHtml = async(predictions, time) => {
  let html = `<!DOCTYPE html>
  <meta charset="utf-8">
  <title>TFJS Firebase example</title>
  <div>
    <div id="time"></div>
    <br />
    <br />
    <canvas id="canvas"></canvas>
    <br />
  </div>
  <script>
    const context = document.getElementById('canvas').getContext('2d');
    const canvas = document.getElementById('canvas');
    const timeDiv = document.getElementById('time');
    timeDiv.innerHTML = 'Inference time: ${time}';

    let img = new Image();
    img.addEventListener('load', () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      console.log('loaded', width, height)
      canvas.width = width;
      canvas.height = height;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(img, 0, 0, width, height);
    `;
    
    for(let i=0; i<predictions.length; i++) {
      const box = predictions[i].detectedBox;
      html += `
        context.fillStyle = 'rgba(255,255,255,0.2)';
        context.strokeStyle = 'yellow';
        context.fillRect(${box[1]} * width, ${box[0]} * height, width * ${parseFloat(box[3] - box[1]).toFixed(3)},
        height * ${parseFloat(box[2] - box[0]).toFixed(3)});
        context.font = '15px Arial';
        context.fillStyle = 'white';
        context.fillText('${predictions[i].detectedClass}: ${parseFloat(predictions[i].detectedScore).toFixed(3)}', ${box[1]} * width, ${box[0]} * height, ${box[0]} * height);
        context.lineWidth = 2;
        context.strokeRect(${box[1]} * width, ${box[0]} * height, width * ${parseFloat(box[3] - box[1]).toFixed(3)}, height * ${parseFloat(box[2] - box[0]).toFixed(3)});      
      `;
    }
  html += `   
  });
  img.src = 'my_picture.jpg';

  setTimeout(() => {
    window.location.reload();
  }, 10000)
  </script>`;

  fs.writeFile('my_picture.html', html, (err) => {
    if(err) return console.log(err);
    console.log('my_picture.html created successfully.');
  })
}


console.log(process.argv[2])    
classify(process.argv[2])
