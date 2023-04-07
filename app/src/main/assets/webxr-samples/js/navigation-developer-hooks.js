// Copyright 2023 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export function developerHooks(options) {
    const BODY = document.body;
    const BUTTON_STYLE =
      "cursor: pointer;width: 10cm;height: 5cm;background-color: coral;font-size: 300%;";
    const NAVIGATE_URL = options.url;

    const onSessionStarted = (session) => {
        options.onSessionStarted(session);

        var btn = document.getElementById("hide_panel");
        btn.disabled = false;
        btn.style.cursor = "pointer";

        session.addEventListener('end', onSessionEnded);
    }
    const onSessionEnded = (event) => {
        options.onSessionEnded(event);

        var btn = document.getElementById("hide_panel");
        btn.disabled = true;
        btn.style.cursor = "not-allowed";

        BODY.style.display = "block";
    }

    var xrButton = options.xrButton;
    xrButton.options.onRequestSession = () => {
        return navigator.xr.requestSession('immersive-vr', {
            requiredFeatures: ['dom-overlay'],
            domOverlay: {
              root: document.body,
              mode: '3d',
            }}).then(onSessionStarted);
     };

    navigator.xr.addEventListener('sessiongranted', function (evt) {
       var session = evt.session;

       // One could check for the type of session granted.
       // Events notifies of session creation after navigation, UA action, or requestSession.
       // The session object is provided as part of this event.
       if (session.mode === 'immersive-vr') {
          // set up app state for immersive vr, if that's what the app wants
          onSessionStarted(session);
       } else {
          // notify user that this app only works in immersive vr mode, if desired
       }
    });

    // 创建一个文档片段，此时还没有插入到DOM树中.
    var frag = document.createDocumentFragment();

    var btn = document.createElement("button");
    btn.innerHTML = "Navigate";
    btn.style = BUTTON_STYLE;
    btn.addEventListener('click', function handleClick() {
      window.location.href = NAVIGATE_URL;
    });
    frag.appendChild(btn);

    btn = document.createElement("button");
    btn.id = "hide_panel";
    btn.innerHTML = "Hide Panel";
    btn.style = BUTTON_STYLE;
    btn.addEventListener('click', function handleClick() {
      BODY.style.display = "none";
    });
    frag.appendChild(btn);

    const URL = window.location.href;
    var loaded_times = localStorage.getItem(URL);
    if (!loaded_times) {
        loaded_times = 1;
    } else {
        ++loaded_times;
    }
    localStorage.setItem(URL, loaded_times);

    btn = document.createElement("button");
    btn.id = "clear_data";
    btn.innerHTML = "Clear Data";
    btn.style = BUTTON_STYLE;
    btn.addEventListener('click', function handleClick() {
      localStorage.removeItem(URL);

      var main_p = document.getElementById("main_p");
      main_p.innerHTML = `WebXR Navigation example - loaded times: cleared`;

      btn.disabled = true;
      btn.style.cursor = "not-allowed";
    });
    frag.appendChild(btn);

    var main = document.createElement("main");
    main.id = "main";
    main.style = "text-align: center;";
    var p = document.createElement("p");
    p.id = "main_p";
    p.innerHTML = `WebXR Navigation example - loaded times: ${loaded_times}`;
    main.appendChild(p);
    frag.appendChild(main);

    // 都完成之后，再插入到DOM树中.
    BODY.appendChild(frag);
}
