const video = document.getElementById('video')

//promises from models ( INSERT MODELS )
//tiny face detector - facial recogntion
//face landmark - registers different parts of facee
//faceRecognitionNet - allow API to recognize where face is
//faceExpressionNet - recognize emotions
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/computer-vision/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/computer-vision/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/computer-vision/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/computer-vision/models')
]).then(startVideo)

//hooks up webcam to video element
//"stream" comes from webcam, may change for other cameras
function startVideo() {
    var devices = navigator.mediaDevices.enumerateDevices();
    console.log(devices)
    devices.then(function(devices) {
    var device = devices[2]
    console.log(device)
    navigator.getUserMedia({ video: { device: device } }, stream => video.srcObject = stream, err => console.error(err));
    });
    }

// Save the JSON file to the selected directory
async function saveJSONToFile(landmarkJSON) {
    const handle = await requestFileSystemAccess();
    if (handle) {
    try {
        const fileHandle = await handle.getFileHandle('results' + (new Date()).getTime().toString() + '.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(landmarkJSON, null, 2));
        await writable.close();
        console.log('JSON file saved successfully.');
    } catch (err) {
        console.error('Error saving JSON file:', err);
    }
    }
}
    
// Request permission to access the file system
async function requestFileSystemAccess() {
    try {
    const opts = { writable: true, prompt: 'select-directory' };
    const handle = await window.showDirectoryPicker(opts);
    return handle;
    } catch (err) {
    console.error('Error requesting file system access:', err);
    }
}
    
    



//startVideo()

//listener will detect face/collect data
video.addEventListener('play', () => {
document.getElementById('startButton').addEventListener('click', (startEvent) => {
    startEvent.preventDefault();
  const canvas = faceapi.createCanvasFromMedia(video)
  document.body.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  var landmarkPositions = {}
  //drawing facial mask
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    //retrieve points on face
    const landmarks = await faceapi.detectFaceLandmarks(video)
    //if(Object.keys(landmarks).length === 0) {
    //    landmarkTotal += landmarks
    //}
    console.log(landmarks.positions)
    landmarkPositions += landmarks.positions
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    //faceapi.draw.drawFaceLandmarks(canvas, landmarkPoints)
  }, 100)
  //retrieve points
  /*getPoints(async () => {
    const landmarkPositions = await faceapi.detectFaceLandmarks(video, )
  })*/

  //if i want json
    //document.getElementById('jsonButton').addEventListener('click', handleClick(landmarks));
    
    document.getElementById('jsonButton').addEventListener('click', () => {
    const landmarkJSON = JSON.stringify(landmarkPositions);
    const blob = new Blob([landmarkJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    //CREATE DOWNLOAD LINK
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'results' + (new Date()).getTime().toString() + '.json';
    document.body.appendChild(downloadLink);
    //SIMULATE A CLICK TO TRIGGER DOWNLOAD
    downloadLink.click();
    //CLEAN UP THE TEMPORARY URL OBJECT
    URL.revokeObjectURL;
    requestFileSystemAccess();
    saveJSONToFile(landmarkJSON);
    
    
  
  // Usage: call saveJSONToFile(jsonData) with your JSON data


    //var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(landmarkJSON);
    //var dlAnchorElem = document.getElementById('jsonButton');
    //dlAnchorElem.setAttribute("href",     dataStr     );
    //dlAnchorElem.setAttribute("download", 'results' +  time + '.json');

    //write file   
    //const fs = require('fs');

    //try {
    //    fs.writeFileSync('/Users/joe/test.txt', dataStr);
    //    // file written successfully
    //    } catch (err) {
    //        console.error(err);
    //}


    //dlAnchorElem.click();
    //const json = await faceapi.fetchJson(filename)
} ) //end of start click listener
})
})

/*async function handleClick(landmarks) {
    const filename = 'results' + (new Date()).getTime().toString() + '.json'
    const json = landmarks

}*/
