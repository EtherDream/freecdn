console.log('Hello World')

window.onload = function() {
  btnPlay.onclick = function() {
    video.innerHTML = '<video src="assets/video/test.mp4" controls autoplay></video>'
  }

  btnShow.onclick = function() {
    image.innerHTML = '<img src="assets/img/pic.jpg">'
  }
}