// const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');

const loadModel = async (modelPath) => {
  // const handler = tfnode.io.fileSystem(`./${modelPath}`);
  // const model = await tfnode.loadLayersModel(handler);
  // const model = await tfnode.loadLayersModel(modelPath);
  const model = await tfnode.node.loadSavedModel(modelPath, ['serve'], 'serving_default');
  // const model = await tfnode.loadGraphModel(modelPath);
  return model;
}

const classify = async (imagePath, modelPath) => {
  const image = fs.readFileSync(imagePath);
  const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);

  let model;
  let predictions;
  if(modelPath) {
    // const modelInfo = await tfnode.node.getMetaGraphsFromSavedModel(modelPath);
    // console.dir(modelInfo);
    // console.dir(modelInfo[0].signatureDefs.serving_default.outputs, { depth: null, maxArrayLength: null });
    model = await loadModel(modelPath);
    predictions = model.predict(decodedImage);
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