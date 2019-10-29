"use strict";

import {html, render} from "lit-html";
import "./modules/authenticator-table.js";

let tabId = chrome.devtools.inspectedWindow.tabId;
let _enabled = false;
let pollingHandle;

let displayError = error => {
  let message;
  try {
    message = JSON.parse(error).message;
  } catch (e) {
    message = error;
  }
  let container = document.getElementById("error-container");
  let row = document.createElement("div");
  row.classList.add("error-row");
  row.innerText = message;
  container.appendChild(row);
  window.setTimeout(() => container.removeChild(row), 30000);
};

let displayEnabled = enabled => {
  _enabled = enabled;

  document.getElementById("toggle").checked = enabled;
  if (enabled) {
    document.getElementById("splash").classList.add("hidden");
    document.getElementById("authenticators").classList.remove("hidden");
  } else {
    document.getElementById("authenticators").classList.add("hidden");
    document.getElementById("authenticators").removeChild(
      document.querySelector("authenticator-table"));
    document.getElementById("splash").classList.remove("hidden");
  }
};

let startPollingForCredentials = () => {
  pollingHandle = window.setInterval(() => {
    authenticators.forEach(authenticator => {
      chrome.debugger.sendCommand(
        {tabId}, "WebAuthn.getCredentials", {authenticatorId: authenticator.id},
        (response) => {
          if (chrome.runtime.lastError) {
            displayError(chrome.runtime.lastError.message);
            return;
          }
          let row = document.getElementById(`credentials-${authenticator.id}`);
          let oldTable = row.querySelector(".credentials-table");
          if (oldTable)
            row.removeChild(oldTable);
          if (response.credentials.length === 0) {
            row.classList.remove("hidden");
            return;
          }
          row.classList.add("hidden");
        });
    })
  }, 1000);
};

let enable = () => {
  chrome.debugger.attach({tabId}, "1.3", () => {
    if (chrome.runtime.lastError) {
      displayError(chrome.runtime.lastError.message);
      document.getElementById("toggle").checked = false;
      return;
    }
    chrome.debugger.sendCommand(
        {tabId}, "WebAuthn.enable", {}, () => {
          displayEnabled(true);
          let table = document.createElement("authenticator-table");
          document.getElementById("authenticators").appendChild(table);
          table.tabId = tabId;
        });
  });
  chrome.debugger.onDetach.addListener(source => {
    if (source.tabId == tabId) {
      displayEnabled(false);
    }
  });
};

let disable = async () => {
  chrome.debugger.detach({tabId}, () => displayEnabled(false));
};

window.addEventListener("beforeunload", () => {
  if (_enabled)
    chrome.debugger.detach({tabId}, () => {});
});

let toggle = document.getElementById("toggle");
toggle.addEventListener("click", (e) => {
  if (toggle.checked)
    enable();
  else
    disable();
});
