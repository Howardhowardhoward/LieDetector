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

var port;
var reader;

document.getElementById('jsonButton').addEventListener('click', () => {
    async function serialPortConnect() {
        port = await navigator.serial.requestPort();
        //wait for serial port to open
        await port.open({ baudRate: 9600 });
        reader = port.readable.getReader();
    }
    serialPortConnect();
})

//startVideo()
var landmarkPositions = {}
var landmarkSet = 0
var gsrValues = []

//listener will detect face/collect data
    video.addEventListener('play', () => {
    document.getElementById('startButton').addEventListener('click', (startEvent) => {
    //for it to unmask? doesn't work
    startEvent.preventDefault();
    //video canvas
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize)
  
    //drawing facial mask

    //prompt user to select port
    //async function getPort(){
    //    const port = await navigator.serial.requestPort();
    //    return port;
    //}

    //const port = getPort();
    
    setInterval(async () => {

     //READ FROM SERIAL PORTS 

    var timeIsUp = false
    function timer(){
        timeIsUp = true;
    }
     
     
     const { value, done } = await reader.read();
     setTimeout(timer, 4950);
     if (timeIsUp) {
         // Allow the serial port to be closed later.
         reader.releaseLock();
     }
     // value is a Uint8Array.
    var gsrString = new TextDecoder().decode(value);

    gsrValues.push(gsrString);

    /*
    //wait for serial port to open
    await port.open({ baudRate: 9600 });

    //READ FROM SERIAL PORTS 
    const reader = port.readable.getReader();
    const { value, done } = await reader.read();
    if (done) {
        // Allow the serial port to be closed later.
        reader.releaseLock();
    }
    // value is a Uint8Array.
    console.log(value);
      */


    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)

    //retrieve points on face
    const landmarks = await faceapi.detectFaceLandmarks(video)
    const landmarkPositionsImmediate = landmarks.positions.reduce((acc, position, index) => {
        
        //LABEL DIFFERENT PARTS OF FACE
        
        switch(true){
            case index <= 17:
                faceType = "jaw";
                refPoint = 0
                break;
            case index <= 22:
                faceType = "leftEyebrow";
                refPoint = 18;
                break;
            case index <= 27:
                faceType = "rightEyebrow";
                refPoint = 23;
                break;
            case index <= 36:
                faceType = "nose";
                refPoint = 28;
                break;
            case index <= 42:
                faceType = "leftEye";
                refPoint = 37;
                break;
            case index <= 48:
                faceType = "rightEye";
                refPoint = 43;
                break;
            case index <= 68:
                faceType = "mouth";
                refPoint = 49;
                break;
            default:
                faceType = "ERROR";
                refPoint = 0;
                break;
        }

        const key = faceType + `${index + 1 - refPoint}` + "set" + + `${landmarkSet+1}`;
        acc[key] = { x: position.x, y: position.y };
        return acc;
      }, {});

    landmarkSet += 1
    landmarkPositions = { ...landmarkPositions, ...landmarkPositionsImmediate };
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
  }, 100)
    
    setTimeout(exportTimer, 5000);
    /*document.getElementById('jsonButton').addEventListener('click', () => {*/
    function exportTimer() {
    const landmarkJSON = JSON.stringify(landmarkPositions);
    console.log(landmarkPositions);
    console.log(landmarkJSON);
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




    //write to file - GSR
    const gsrJSON = JSON.stringify(gsrValues);
    const gsrBlob = new Blob([gsrJSON], { type: 'application/json' });
    const gsrUrl = URL.createObjectURL(gsrBlob);

    //CREATE DOWNLOAD LINK
    const gsrDownloadLink = document.createElement('a');
    gsrDownloadLink.href = gsrUrl;
    gsrDownloadLink.download = 'gsrResults' + (new Date()).getTime().toString() + '.json';
    document.body.appendChild(gsrDownloadLink);

    //SIMULATE A CLICK TO TRIGGER DOWNLOAD
    gsrDownloadLink.click();

    //CLEAN UP THE TEMPORARY URL OBJECT
    URL.revokeObjectURL;
    saveJSONToFile(gsrJSON);
    
    // Usage: call saveJSONToFile(jsonData) with your JSON data



    //READ SERIAL
    if("serial" in navigator){
        console.log("Supported!")
    }
    else{
        console.log("Not supported")
    }


    }
} ) //end of start click listener
})
