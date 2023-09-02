// content.js

// Inject CSS
let style = document.createElement('link');
style.rel = 'stylesheet';
style.type = 'text/css';
style.href = chrome.runtime.getURL('main.css');
(document.head || document.documentElement).appendChild(style);

// Fetch and Inject HTML
fetch(chrome.runtime.getURL('index.html'))
    .then(response => response.text())
    .then(data => {
        let div = document.createElement('div');
        div.innerHTML = data;
        document.body.appendChild(div);
    }).then(() => {
        // Inject JS
        let script = document.createElement('script');
        script.src = chrome.runtime.getURL('main.js');
        (document.body || document.documentElement).appendChild(script);
    })
    .catch(err => {
        console.error('Failed to fetch and inject HTML:', err);
    });


