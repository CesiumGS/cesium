function go(element) {
  var message;
  if (element.value === 'radio1') {
    message = 'You selected the number 1.';
  }
  else if (element.value === 'radio2') {
    message = 'You selected the number 2.';
  }
  else if (element.value === 'radio3') {
    message = 'You selected the number 3.';
  }
  else if (element.value === 'radio4') {
    message = 'You selected the number 4.';
  }

  var request = document.getElementById('request');
  request.className = 'black';

  var result = document.getElementById('result');
  while (result.hasChildNodes()) {
    result.removeChild(result.firstChild);
  }

  var p = document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
  p.appendChild(document.createTextNode(message));
  result.appendChild(p);

  message = 'If you are running the instrumented version of this program, when you exit the coverage report will be stored.';
  p = document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
  p.appendChild(document.createTextNode(message));
  result.appendChild(p);
}
