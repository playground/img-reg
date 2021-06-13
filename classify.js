// const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
const inquirer = require('inquirer');
let labels;
let currentModelPath;
const models = [
  {value: 'Poor Model', key: '/Users/jeff/git_repo/sandbox/wu/playbox/ml/img-recog/inference_graph/saved_model'},
  {value: 'Good Model', key: '/Users/jeff/Downloads/Demo/inference_graph/saved_model'},
  {value: 'Other Model', key: ''}
]

const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (model) => {
  rl.question('Would you like to do another inference? (y/n) ', (answer) => {
    if(/^(?:y(?:es)?|1)$/i.test(answer)) {
      // enterName(model, 'Enter image file name: ');
      enterModelPath(model, 'Provide a model to use:')
    } else {
      rl.close();
    }
  })
}

const selectModel = (model, question) => {
  inquirer
  .prompt([
    {
      type: 'checkbox',
      name: 'model',
      message: question,
      choices: models
    },
  ])
  .then(answers => {
    console.info('Answer:', answers.model);
    let selected = models.filter((x) => x.value == answers.model);
    let modelPath = selected[0].key;
    if(modelPath.length > 0) {
      enterName(model, modelPath, 'Enter image file name: ');
    } else {
      enterModelPath(model, 'Enter model path: ');
    }    
  });
  // cliSelect({
  //   values: ['Poor Model', 'Good Model', 'Other Model'],
  //   valueRenderer: (value, selected) => {
  //     if (selected) {
  //       return chalk.underline(value);
  //     }
  //     return value
  //   }
  // }, (selected) => {
  //   console.log(selected, currentModelPath);
  //   let modelPath = models[selected.value];
  //   if(modelPath.length > 0) {
  //     enterName(model, modelPath, 'Enter image file name: ');
  //   } else {
  //     enterModelPath(model, 'Enter model path: ');
  //   }
  // });
}

const enterModelPath = (model, question) => {
  rl.question(question, (modelPath) => {
    if(fs.existsSync(modelPath)) {
      enterName(model, modelPath, 'Enter image file name: ');
    } else {
      enterModelPath(model, `${modelPath} not found, enter model path again: `);
    }
  })
  rl.write(currentModelPath)
}
const enterName = (model, modelPath, question) => {
  rl.question(question, async (name) => {
    if(fs.existsSync(name)) {
      if(modelPath !== currentModelPath) {
        model = await loadModel(modelPath);
        currentModelPath = modelPath;
      }    
      classify(name, model);
    } else {
      enterName(model, modelPath, `${name} not found, enter name again: `);
    }
  })
}

rl.on('close', () => {
  console.log("\nBYE BYE !!!");
  process.exit(0);
})

const loadModel = async (modelPath) => {
  // const handler = tfnode.io.fileSystem(`./${modelPath}`);
  // const model = await tfnode.loadLayersModel(handler);
  // const model = await tfnode.loadLayersModel(modelPath);
  const model = await tfnode.node.loadSavedModel(modelPath);
  labels = require(`${modelPath}/assets/labels.json`);
  // const model = await tfnode.loadGraphModel(modelPath);
  return model;
}

const classify = async (imagePath, model) => {
  const image = fs.readFileSync(imagePath);
  const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
  const input = decodedImage.expandDims(0);

  let predictions;
  // console.log('model...', model)
  if(model) {
    // const modelInfo = await tfnode.node.getMetaGraphsFromSavedModel(modelPath);
    // console.dir(modelInfo);
    // console.dir(modelInfo[0].signatureDefs.serving_default);
    // console.dir(modelInfo[0].signatureDefs.serving_default.outputs, { depth: null, maxArrayLength: null });
    inference(model, input, imagePath);
  } else {
    model = await mobilenet.load();
    predictions = await model.classify(decodedImage);
  }
  // const predictions = await model.classify(decodedImage);
  // console.log('predictions:', predictions);
}

const inference = async(model, input, image) => {

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
        detectedBox: boxes[0][i].map((el)=>el.toFixed(3)),
        detectedClass: labels[classes[0][i]],
        detectedScore: scores[0][i]
      });
    }
  }
  console.log('predictions:', predictions.length, predictions[0]);
  console.log('time took: ', elapsedTime);
  console.log('build html...');
  await buildHtml(predictions, elapsedTime, image);
  prompt(model);

}

const buildHtml = async(predictions, time, image) => {
  let html = `<!DOCTYPE html>
  <meta charset="utf-8">
  <title>TFJS IEAM Demo</title>
  <style>
    table {
      border-collapse: collapse;
      border-spacing: 0;
      float: left;
      max-width: 700px;
      border: 1px solid #ddd;
      margin-right: 20px;
      margin-bottom: 20px;
      table-layout: fixed;
    }

    th, td {
        text-align: left;
        padding: 8px;
        width: 100%;
    }

    tr:nth-child(even){background-color: #f2f2f2}
    tr th:nth-child(n+2){text-align: right}
    tr td:nth-child(n+2){text-align: right}
  </style>
  <div>
    <div id="time"></div>
    <br />
    <br />
    <div id="table"></div>
    <canvas id="canvas"></canvas>
    <br />
  </div>
  <script>
    const context = document.getElementById('canvas').getContext('2d');
    const canvas = document.getElementById('canvas');
    const timeDiv = document.getElementById('time');
    let tableDiv = document.getElementById('table');
    timeDiv.innerHTML = 'Inference time: ${time.toFixed(2)}';

    let table = document.createElement('table');
    let row = document.createElement('tr');
    let cell = document.createElement('th');
    let cellText = document.createTextNode('Label');
    cell.appendChild(cellText);
    row.appendChild(cell)
    cell = document.createElement('th');
    cellText = document.createTextNode('Confidence');
    cell.appendChild(cellText);
    row.appendChild(cell)
    cell = document.createElement('th');
    cellText = document.createTextNode('Min Pos');
    cell.appendChild(cellText);
    row.appendChild(cell)
    cell = document.createElement('th');
    cellText = document.createTextNode('Max Pos');
    cell.appendChild(cellText);
    row.appendChild(cell)
    table.appendChild(row);

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
        row = document.createElement('tr');
        cell = document.createElement('td');
        cellText = document.createTextNode('${predictions[i].detectedClass}');
        cell.appendChild(cellText);
        row.appendChild(cell)
        cell = document.createElement('td');
        cellText = document.createTextNode('${predictions[i].detectedScore}');
        cell.appendChild(cellText);
        row.appendChild(cell);
        cell = document.createElement('td');
        cellText = document.createTextNode('(${predictions[i].detectedBox[0]},${predictions[i].detectedBox[1]})');
        cell.appendChild(cellText);
        row.appendChild(cell);
        cell = document.createElement('td');
        cellText = document.createTextNode('(${predictions[i].detectedBox[2]},${predictions[i].detectedBox[3]})');
        cell.appendChild(cellText);
        row.appendChild(cell);
        table.appendChild(row);

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
  tableDiv.appendChild(table);
   
  });
  img.src = '${image}';

  setTimeout(() => {
    window.location.reload();
  }, 10000)
  </script>`;

  fs.writeFileSync('my_picture.html', html, (err) => {
    if(err) return console.log(err);
    console.log('my_picture.html created successfully.');
  })
}

const init = async (imagePath, modelPath) => {
  let model = null;
  if(modelPath) {
    model = await loadModel(modelPath);
    currentModelPath = modelPath;
  }
  classify(imagePath, model)  
}

if (process.argv.length < 3 || process.argv.length > 4) 
    throw new Error('Usage: node test-tf.js <image-file> <')

console.log(process.argv[2], process.argv[3])
init(process.argv[2], process.argv[3])