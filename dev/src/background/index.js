/*
  Tootski, copyright Kent Brewster, 2023.  Made with aloha on the island of Kaua'i; whatever you do with Tootski, please keep it pono! <3

  This is background.js: the part that runs behinds the scenes
  - open a new page with a specified URL
  - update stored credentials 
  - call API endpoints to boost, follow, favorite (or undo any of those)
*/

// change debug level to 0 before shipping!
const config = {
  debug: 0,
  helpUrl: "https://tootski.dev",
};

// this used to be so great but the compatibility issues between Gecko and Webkit and now manifest 2 vs manifest 3 are sucking my will to live....
const browser = chrome || browser;

// manifest 2 vs manifest 3
const action = browser.action || browser.browserAction;

const global = {
  // we'll overwrite this from local storage
  instance: null,
  token: null,
};

// log debugging to console
function debug(output, priority) {
  if (!priority) {
    priority = 1;
  }
  if (priority < config.debug) {
    console.log(output);
  }
}

// TODO: write one fetch function to rule them all, maybe add some error handling?

// find a user by URL
function finger(url) {
  return new Promise(function (resolve) {
    /*
      URL looks like this:
        https://zork.social/@frobozz
      We want:
        frobozz@zork.social
    */
    // TODO: defuctor brittle parser
    let t = url.split("/");
    if (t.length > 2) {
      fetch(`https://${global.instance}/api/v1/accounts/lookup?acct=${t[3]}@${t[2]}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${global.token}`,
        },
      })
        .then((fingerResponse) => fingerResponse.json())
        .then((fingerResult) => {
          debug(fingerResult);
          if (fingerResult.id) {
            debug("Finger found the account.");
            resolve(fingerResult.id);
          } else {
            debug("Finger did not find the account.");
            resolve(null);
          }
        });
    } else {
      debug("Input did not contain instance and account.");
      resolve(null);
    }
  });
}

// find a toot by URL
function search(url) {
  return new Promise(function (resolve) {
    // TODO: encode the URL?
    fetch(`https://${global.instance}/api/v2/search?resolve=true&limit=1&type=statuses&q=https://${url}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((searchResponse) => searchResponse.json())
      .then((searchResult) => {
        debug(searchResult);
        if (searchResult.statuses && searchResult.statuses[0] && searchResult.statuses[0].id) {
          debug("Search found the toot.");
          resolve(searchResult.statuses[0].id);
        } else {
          debug("Search did not find the toot.");
          resolve(null);
        }
      });
  });
}

// follow an account by id (run finger first)
function follow(accountId) {
  if (accountId) {
    fetch(`https://${global.instance}/api/v1/accounts/${accountId}/follow`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((followResponse) => followResponse.json())
      .then((followResult) => {
        debug(followResult);
        sendToContent({ success: "follow", accountId });
      });
  }
}

// boost a toot by id (run search first)
function boost(statusId) {
  debug(`Boosting ${statusId}`);
  if (statusId) {
    fetch(`https://${global.instance}/api/v1/statuses/${statusId}/reblog`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((boostResponse) => boostResponse.json())
      .then((boostResult) => {
        debug(boostResult);
        // send the ID back so we can undo without running another search
        sendToContent({ success: "boost", statusId });
      });
  }
}

// boost a toot by id (run search first)
function favourite(statusId) {
  if (statusId) {
    // favourite it
    fetch(`https://${global.instance}/api/v1/statuses/${statusId}/favourite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((favouriteResponse) => favouriteResponse.json())
      .then((favouriteResult) => {
        // TODO: we need to send off a success / fail message here!
        debug(favouriteResult);
        // send the ID back so we can undo without running another search
        sendToContent({ success: "favourite", statusId });
      });
  }
}

// unfollow an account by the ID we sent back
function unfollow(accountId) {
  if (accountId) {
    fetch(`https://${global.instance}/api/v1/accounts/${accountId}/unfollow`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((unFollowResponse) => unFollowResponse.json())
      .then((unFollowResult) => {
        debug(unFollowResult);
        sendToContent({ success: "unfollow" });
      });
  }
}

// unboost a toot by the ID we sent back
function unboost(statusId) {
  debug(`Unboosting ${statusId}`);
  if (statusId) {
    fetch(`https://${global.instance}/api/v1/statuses/${statusId}/unreblog`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((unBoostResponse) => unBoostResponse.json())
      .then((unBoostResult) => {
        debug(unBoostResult);
        sendToContent({ success: "unboost" });
      });
  }
}

// unfavourite a toot by the ID we sent back
function unfavourite(statusId) {
  if (statusId) {
    // unFavourite it
    fetch(`https://${global.instance}/api/v1/statuses/${statusId}/unfavourite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((unFavouriteResponse) => unFavouriteResponse.json())
      .then((unFavouriteResult) => {
        debug(unFavouriteResult);
        sendToContent({ success: "unfavourite" });
      });
  }
}

// update status of browser action button
function changeBrowserAction(state) {
  if (state === "on") {
    action.setIcon({ path: "/img/enabled.png" });
  }
  if (state === "off") {
    action.setIcon({ path: "/img/disabled.png" });
  }
}

// send a message to the active tab
async function sendToContent(me) {
  const message = { to: "content" };
  for (let k in me) {
    message[k] = me[k];
  }
  // TODO: defuctor inconsistent promise behavior
  try {
    // it's Chrome
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    browser.tabs.sendMessage(tab.id, message);
  } catch {
    // it's Firefox
    browser.tabs.query({ active: true, currentWindow: true }, (tab) => {
      if (tab[0]) {
        browser.tabs.sendMessage(tab[0].id, message);
      }
    });
  }
}

// listen for messages
browser.runtime.onMessage.addListener((request) => {
  debug("Message received", request);
  if (request.to === "background" && request.action) {
    // update credentials
    if (request.action === "credentials") {
      debug(`Credential update request received`);
      if (request.instance && request.token) {
        debug(`Token received for ${request.instance}.`);
        // shall we change our instance and token?
        if (global?.instance !== request.instance || global?.token !== request.token) {
          global.instance = request.instance;
          global.token = request.token;
          debug(`Setting new token for new instance ${request.instance}`);
          // TODO: defuctor inconsistent promise behavior
          browser.storage.local.set({ instance: request.instance, token: request.token });
        } else {
          debug(`No change; instance is still ${global.instance}`);
        }
        changeBrowserAction("on");
      } else {
        // be paranoid; it's easy enough to reload
        debug(`Instance or token missing, clearing everything`);
        global.instance = null;
        global.token = null;
        browser.storage.local.clear();
        changeBrowserAction("off");
      }
    }
    // open an URL in a new tab (for sharing)
    if (request.action === "open" && request.url) {
      browser.tabs.create({ url: request.url });
    }
    // follow, boost, and favourite all send us the copy/paste URL
    // shown in the modal dialog
    if (request.action === "follow" && request.url) {
      debug("a follow request has arrived!");
      debug(request);
      finger(request.url).then((accountId) => {
        follow(accountId);
      });
    }
    if (request.action === "boost" && request.url) {
      debug("a boost request has arrived!");
      // status search needs just the status ID, not the full URL
      search(request.url.split("https://")[1]).then((statusId) => {
        boost(statusId);
      });
    }
    if (request.action === "favourite" && request.url) {
      debug("a favourite request has arrived!");
      // status search needs just the status ID, not the full URL
      search(request.url.split("https://")[1]).then((statusId) => {
        favourite(statusId);
      });
    }
    /*
      unfollow, unboost, and unfavorite:
        send back the new ID we got when we followed, boosted, or favorited
        so we can quickly undo the action without running search again
    */
    if (request.action === "unfollow" && request.accountId) {
      debug("an unfollow request has arrived!");
      debug(request);
      unfollow(request.accountId);
    }
    if (request.action === "unboost" && request.statusId) {
      debug("an unboost request has arrived!");
      unboost(request.statusId);
    }
    if (request.action === "unfavourite" && request.statusId) {
      debug("an unfavourite request has arrived!");
      unfavourite(request.statusId);
    }
  }
});

// someone wants to share the page
action.onClicked.addListener(() => {
  sendToContent({ to: "content", action: "share" });
});

// on session start, attempt to load up our instance and token
browser.storage.local.get(["instance", "token"], (me) => {
  // anything in local storage is now available in global
  for (let i in me) {
    global[i] = me[i];
  }
  debug("Globals loaded");
  debug(global);
});

// pop a page on install
browser.runtime.onInstalled.addListener((me) => {
  if (me.reason === browser.runtime.OnInstalledReason.INSTALL) {
    browser.tabs.create({ url: config.helpUrl }, function () {
      debug("Welcome page loaded.");
    });
  }
});
