var condition
var id
var url

document.addEventListener('DOMContentLoaded', (event) => {  
    console.log("DOM LOADED")
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    condition = urlParams.get('c')
    id = urlParams.get('id')
    condition = parseInt(condition)
    console.log(id, condition)
});

document.getElementById('download-btn').onclick = function() {
  const loadArea = document.getElementById("load-area")
  loadArea.style.display = 'flex'
  getSummaryPDF() 
  logItem("summaryChoice", 1)
};  

document.getElementById('continue-btn').onclick = function() {
  logItem("summaryChoice", 0)
  window.location.href = "https://ufl.qualtrics.com/jfe/form/SV_b4xk3F1LVNROTWK?id=" + id + "&c=" + condition;
};  

async function getSummaryPDF() {
    const response = await fetch('/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({id: id})
    });
  
    if (response.ok) {
    console.log("got it!")
      const blob = await response.blob();
      console.log(response)
      url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'alex-conversation-summary.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      const ellipse = document.getElementById('lds-ellipsis');
      ellipse.remove();
      document.getElementById("generate-note").innerHTML = "Your conversation summary has automatically downloaded! Please click the button to continue."
      var postBtn = document.getElementById('continue')
      postBtn.style.display = 'flex'
      postBtn.onclick = function() {
        window.location.href = "https://ufl.qualtrics.com/jfe/form/SV_b4xk3F1LVNROTWK?id=" + id + "&c=" + condition;
      }; 
    } else {
      console.error('Failed to generate summary PDF');
    }
  }

  function logItem(columnName, value) {
    fetch('/logItem', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id: id, 
            columnName: columnName, 
            value: value
        })
    })
    .then(response => response.json())
    .then(data => {
    })
    .catch(error => console.error('Error logging transcript:', error));
}