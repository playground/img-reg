// const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
const labels = require('./inference_graph/saved_model/assets/labels.json');

const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');

const loadModel = async (modelPath) => {
  // const handler = tfnode.io.fileSystem(`./${modelPath}`);
  // const model = await tfnode.loadLayersModel(handler);
  // const model = await tfnode.loadLayersModel(modelPath);
  const model = await tfnode.node.loadSavedModel(modelPath);
  // const model = await tfnode.loadGraphModel(modelPath);
  return model;
}

const classify = async (imagePath, modelPath) => {
  const image = fs.readFileSync(imagePath);
  const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
  const input = decodedImage.expandDims(0);

  let model;
  let predictions;
  if(modelPath) {
    const modelInfo = await tfnode.node.getMetaGraphsFromSavedModel(modelPath);
    console.dir(modelInfo);
    console.dir(modelInfo[0].signatureDefs.serving_default);
    // console.dir(modelInfo[0].signatureDefs.serving_default.outputs, { depth: null, maxArrayLength: null });
    model = await loadModel(modelPath);
    let outputTensor = await model.predict({input_tensor: input});
    // console.log('output tensor', outputTensor);
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

    // predictions = model.predict(decodedImage);
  } else {
    model = await mobilenet.load();
    predictions = await model.classify(decodedImage);
  }
  // const predictions = await model.classify(decodedImage);
  console.log('predictions:', predictions);
}

if (process.argv.length < 3 || process.argv.length > 4) 
    throw new Error('Usage: node test-tf.js <image-file> <')

console.log(process.argv[2], process.argv[3])    
classify(process.argv[2], process.argv[3])