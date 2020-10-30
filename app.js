require('dotenv').config();
const fs = require('fs');
const ytdl = require('ytdl-core');
const express = require("express");
const app = express();
const https = require("https");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const { google } = require('googleapis');
const { createCanvas } = require('canvas');
const imgDownload = require('image-downloader');
const parseUrl = require("parse-url");
const ejs = require("ejs");
const path = require('path');
const PNG = require('pngjs').PNG;
const Jimp = require("jimp")
var sizeOf = require('image-size');
const pixelmatch = require('pixelmatch');

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
app.set('view engine', 'ejs');
const viewPath = path.join( __dirname, 'views');
app.set('views', viewPath);
app.use('/static', express.static('public'))


var videoName;
var videoURL;
var thumbnailURL;
var thumbnailName;
var videoTitle;
var urlSearch ;
var videoID;
var datetime;
var numberOfFrames;
const currentdate = new Date();
var frameIndex = 1; 
var frameArray = new Array();


app.get("/",function(req, res){
  res.render("index");
});

app.post("/", function(req, res){
  videoURL = req.body.url;
  urlSearch = parseUrl(videoURL).search;
  videoID = urlSearch.split("=")[1];
  
  
  datetime = currentdate.getFullYear() + "-" 
                + (currentdate.getMonth()+1) + "-" 
                + currentdate.getDate() + "--"  
                + currentdate.getHours() + "_"  
                + currentdate.getMinutes() + "_" 
                + currentdate.getSeconds();

  videoName = datetime + '.mp4';             

  ytdl(videoURL).pipe(fs.createWriteStream("public/"+videoName)).on("finish", function() {
    console.log("Video Finished Download");
                                                           
    google.youtube('v3').videos.list({
      key: process.env.YOUTUBE_TOKEN,
      part: 'snippet',
      id: videoID
    })

    .then((Response) => {

      const {data} = Response;
      console.log(data);
      videoTitle = data.items[0].snippet.title;
      thumbnailURL = data.items[0].snippet.thumbnails.maxres.url;

      // ****** save thumbnail to dir *******
      thumbnailName = datetime + '_thumbnail.jpg' 
      options = {
        url: thumbnailURL,
        dest: __dirname + "/public/" + thumbnailName      
      }

      imgDownload.image(options)
      .then(({ filename }) => {
        
        console.log('thumbnail image saved to', filename) 
        res.redirect("/confirm");
      })
      .catch((err) => console.error(err)) 
      // ************************************

    }).catch((err) => console.log(err))
    
  });;
});

app.get("/confirm", function(req, res){

  res.render("confirm", {
    videoname: videoName, 
    thumbnail: datetime + '_thumbnail.jpg'
  
  });
  
});

app.post("/frame", jsonParser, function(req, res){
    
    var index = 0;

    frameArray = req.body.frames.split(",")
    numberOfFrames = frameArray.length;

    
    frameArray.forEach(element => {        
        makefile(element);  
      })   
   
    async function makefile(frame){
      await fs.writeFile("public/frames/"+ (++index) +".png", frame, 'base64', function(err) {
        if(err){
           console.log(err);
         }
      })
    }
    console.log("finished making files")
    res.redirect("/result");    
  
});

app.get("/result", function(req, res){

  var width; 
  var height;

  tobeNamed().catch((error) => console.log(error));
  
  // get width and height for pixelmatch
  async function tobeNamed(){
    
    try{

      //get width and height for pixelmatch()
      var dimensions = sizeOf('public/'+thumbnailName);

      console.log("got dimension")
      width = dimensions.width;
      height = dimensions.height;
      if(width<height){
        console.log("w<h");
      }else if(width>height){
        console.log("w>h")
      }else{
        console.log("gm doesnt work")
      }

      //turn thumbnail to png, then to buffer(***) for pixelmatch()

      var thumbnailBuffer;
      
      Jimp.read('public/'+thumbnailName)
        .then( image => {
            image.write("public/thumbnail.png")  
        }
      )

      thumbnailBuffer = PNG.sync.read(fs.readFileSync("public/thumbnail.png"));
     
      console.log("got thumbnail buffer");

      //turn frameArray(which is base64 from ajax) to bufferArray
      var bufferArray = new Array(); 
      bufferArray = (() => {
        buffAry = new Array();
        frameArray.forEach((element) =>{
          const frameBuffer = new Buffer(element, 'base64');
          buffAry.push(frameBuffer);
        })
        return buffAry;
      })
      console.log("got bufferArray:")
      
      //comparing thumbnailBuffer with bufferArray and generate a score.
      for( i=1; i < numberOfFrames; i++){
      var img2 = PNG.sync.read(fs.readFileSync('public/frames/'+i+'.png'))

      var numberOfMismatchedPixel = pixelmatch(thumbnailBuffer.data, img2.data, null, width, height);
      console.log("score:"+numberOfMismatchedPixel+' @'+(i-1)+"sec");
      }

    } catch(err) {
      throw new Error(err);
    }

  }

  console.log("done comparing all frames.")
  res.render("result");
 
});

app.listen(3000, function(){
  console.log("Server is up and running at 'localhost:3000'")
});
