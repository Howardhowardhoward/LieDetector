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
let questionBeingAsked = false;

//INITIAL CONNECT SERIAL PORT
//document.getElementById('jsonButton').addEventListener('click', () => {
    /*async function serialPortConnect() {
        port = await navigator.serial.requestPort();
        //wait for serial port to open
        await port.open({ baudRate: 9600 });
        reader = port.readable.getReader();
    }
    serialPortConnect();*/
//})

//IF CAN READ SERIAL
if("serial" in navigator){
    console.log("Serial Supported!")
}
else{
    console.log("ERROR - Serial Not Supported")
}

//startVideo()  

var landmarkPositions = {}
var landmarkSet = 0
var gsrValues = []

//listener will detect face/collect data
    video.addEventListener('play', () => {
        //ON INITIALIZATION BUTTON PRESS
    document.getElementById('startButton').addEventListener('click', (startEvent) => {

    //serial port initialization
    /*async function serialPortConnect() {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    reader = port.readable.getReader();
    }
    serialPortConnect();*/
    
    //video canvas
    var canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)
    var displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize)
    
    //ON NEW QUESTION BUTTON PRESS
    document.getElementById('jsonButton').addEventListener('click', () => {
    questionBeingAsked = true;  //flag raised positive (undone after exportTimer is called)
    setTimeout(exportTimer, 5000);  //exportTimer
    landmarkPositions = {}
    landmarkSet = 0
    })

    

    setInterval(async () => {

    //READ FROM SERIAL PORTS 
    /*if(questionBeingAsked){
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
    }*/

    var detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    var resizedDetections = faceapi.resizeResults(detections, displaySize)
    
    //retrieve points on face
    var landmarks = await faceapi.detectFaceLandmarks(video)

    if(questionBeingAsked){
    var landmarkPositionsImmediate = landmarks.positions.reduce((acc, position, index) => {

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

        const key = faceType + `${index + 1 - refPoint}` + "set" + + `${landmarkSet+1}`;    //got rid of sets, unnecessary
        acc[key] = { x: position.x, y: position.y };
        //console.log(Math.sqrt((position.x)**2 + (position.y)**2))
        //data = Math.sqrt((position.x)**2 + (position.y)**2)
        //if(!(key in acc)){
        //    acc[key] = [];
        //}
        //acc[key].push(data);
           
            //console.log(Math.sqrt((position.x)**2 + (position.y)**2))
        return acc;
      }, {});

    landmarkSet += 1
    landmarkPositions = { ...landmarkPositions, ...landmarkPositionsImmediate };
    }//end of question being asked functions

    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
  }, 100)
//})  //end of new question button

    /*document.getElementById('jsonButton').addEventListener('click', () => {*/
    function exportTimer() {
    var landmarkJSON = JSON.stringify(landmarkPositions);
    console.log(landmarkPositions);
    console.log(landmarkJSON);
    var blob = new Blob([landmarkJSON], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    //STOP NEW QUESTION LOOPING
    questionBeingAsked = false;

    //CREATE DOWNLOAD LINK
    var downloadLink = document.createElement('a');
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
/*
    //first filter data
    filteredValues = []
    console.log(gsrValues)
    const pattern = /\d{1,3}\.00/g; // Regular expression pattern
    gsrValues.forEach((item) => {
    // Remove "\r\n" characters
    item = item.replace(/\r\n/g, " ");
    item = item.split(" ")
    console.log(item)
    // Filter out numbers not matching the pattern
    item.forEach(singleString)
    const filteredNumbers = item.match(pattern);
    filteredValues.push(...filteredNumbers);
    });

    //Create JSON, blob, URL
    const gsrJSON = JSON.stringify(filteredValues);
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
    saveJSONToFile(gsrJSON);*/
    
    // Usage: call saveJSONToFile(jsonData) with your JSON data



    


    }
} ) //end of start click listener
})
