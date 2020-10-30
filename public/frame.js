const thumbnailImage = document.getElementById('thumbnail').src;
const frameArray = new Array();

function getVideoImage(path, secs, callback) {
    var me = this, video = document.createElement('video');
    video.onloadedmetadata = function() {
      if ('function' === typeof secs) {
        secs = secs(this.duration);
      }
      this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration);
    };
    video.onseeked = function(e) {
      
      var canvas = document.createElement('canvas');
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var img = new Image();
      img.origin = 'anonymous';
      img.crossOrigin = 'anonymous';
      img.src = canvas.toDataURL()

      callback.call(me, img, this.currentTime, e);
    };
    video.onerror = function(e) {
      callback.call(me, undefined, undefined, e);
    };
    video.src = path;
}
 

function showImageAt(secs) {
    var duration;
    getVideoImage(
      document.getElementById('video').src,
      function(totalTime) {
        duration = totalTime;
        return secs;
      },
      function(img, secs, event) {
        if (event.type == 'seeked') {

          frameArray.push((img.src).replace(/^data:image\/png;base64,/, ""))
       
          var li = document.createElement('li');
          li.innerHTML += '<b>Frame at second ' + secs + ':</b><br />';
          li.appendChild(img);

          document.getElementById('olFrames').appendChild(li);
          if (duration >= ++secs) {
            showImageAt(secs);
          }else{
            
            console.log("last frame has shown.")

            $.ajax({
              url: '/frame',
              type: 'post',
              data: {
                frames: frameArray.join(",")
              },
              success: function(response){
                  if(response != 0){
                      console.log("frame is sent to Server");
                  }else{
                      alert('file not uploaded');
                  }
              },
            });

          }
          
        }
      }
    );
}

showImageAt(0)
