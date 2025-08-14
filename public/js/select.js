function getButtons() {
    document.getElementById("rashi").onclick = function() {
      sessionStorage.setItem("character", "rashi.glb")
      sessionStorage.setItem("body", "F")
      window.location.href = "/intro";
    };  
    document.getElementById("chris").onclick = function() {
      sessionStorage.setItem("character", "chris.glb")
      sessionStorage.setItem("body", "M")
      window.location.href = "/intro";
    };  
    document.getElementById("roshan").onclick = function() {
      sessionStorage.setItem("character", "roshan.glb")
      sessionStorage.setItem("body", "M")
      window.location.href = "/intro";
    };  
    document.getElementById("danish").onclick = function() {
      sessionStorage.setItem("character", "demo.glb") //CHANGE
      sessionStorage.setItem("body", "F") //CHANGE
      window.location.href = "/intro";
    };  
  }

  // Load and show the avatar
document.addEventListener('DOMContentLoaded', async function (e) {
    getButtons();
})