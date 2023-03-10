/*
  Tootski, copyright Kent Brewster, 2023.  Made with aloha on the island of Kaua'i; whatever you do with Tootski, please keep it pono! <3

  This is content.js: the part that runs inside the browser window
  
  Does different things depending on where it runs and if you're signed in:
  # on a page within a Mastodon instance:
    # if you're signed in to this instance:
      # populate the what's-on-your-mind box with information from the page you were on when you clicked the browser button
      # remind you to use hashtags
    # if you're signed in to a different instance:
      # add a button letting you boost, follow, or favorite from here
  # on a page outside a Mastodon instance:
    # if you're signed in anywhere:
      # light up the browser button so you can share

*/

// change debug level to 0 before shipping!
const config = {
  debug: 3,
  shareTextLimit: 200,
};

// this used to be so great but ugh, the compatibility issues between Gecko and Webkit and now manifest 2 vs manifest 3 are sucking my will to live....
const browser = chrome || browser;

// expected: modalRoot, instance, token
const global = {};

// expected: myButton, myIcon, myMask, etc.
const structure = {};

// expected: instance, token
const local = {};

// log debugging to console
function debug(output, priority) {
  if (!priority) {
    priority = 1;
  }
  if (priority < config.debug) {
    console.log(output);
  }
}

// get the contents of the copy/paste URL
function getCopyPasteURL() {
  return document.querySelector(".copypaste").querySelector("INPUT").value;
}

// keys are the Mastodon class names for boost, follow, and favorite
// TODO: come up with a different way to key on this, because it's brittle
const action = {
  "fa-retweet": {
    modify: (me) => {
      debug("Boost dialog detected!");
      me.data = {
        action: "boost",
        url: getCopyPasteURL(),
      };
      alterStructure(me);
    },
  },
  "fa-user-plus": {
    modify: (me) => {
      debug("Follow dialog detected!");
      me.data = {
        action: "follow",
        url: getCopyPasteURL(),
      };
      alterStructure(me);
    },
  },
  "fa-star": {
    modify: (me) => {
      debug("Favourite dialog detected!");
      me.data = {
        action: "favourite",
        url: getCopyPasteURL(),
      };
      alterStructure(me);
    },
  },
  // TODO: open our home instance with this status set up for reply
  "fa-reply": {
    modify: (me) => {
      me.data = {
        action: "reply",
        url: getCopyPasteURL(),
      };
      alterStructure(me);
      debug("Reply dialog detected!");
    },
  },
};

/*
  Send a message to the background process
 */

function sendToBackground(message) {
  message.to = "background";
  browser.runtime.sendMessage(message);
}

/*
 Background has sent word that someone has clicked the browser button
 so let's decide what to send as the default text and URL 
 */

function share() {
  // do we know our instance?
  if (global.instance) {
    // we will push things to this array and join into a string with empty lines
    let toShare = [];
    // main text will be the highlighted text or document title, trimmed to 200ch
    let shareText = (window.getSelection().toString() || document.title).substring(0, config.shareTextLimit);
    toShare.push(shareText);
    // url will be canonical link or document.URL stripped of parameters
    let url = document.querySelector("link[rel='canonical']")?.getAttribute("href") || document.URL.split("?")[0];
    // URL should be last for preview
    toShare.push(url);
    // blank line between description and URL
    let text = toShare.join("\n\n");
    // encode so we can send the whole thing as a GET parameter
    text = encodeURIComponent(text);
    // save on length with plus-signs
    text = text.replace(/%20/g, "+");
    // ask the background to open the sharing URL
    // we will hit popup blockers if we try it from here
    sendToBackground({
      action: "open",
      url: `https://${global.instance}/home?text=${text}`,
    });
  } else {
    debug(`Share doesn't know our instance; exiting.`);
  }
}

/*
  We have successfully boosted, followed, favorited, 
  unboosted, unfollowed, or unfavorited, so fix up 
  our button so we can undo or redo.
*/

function success(me) {
  if (structure.myButton) {
    debug("success found button");
    // re-enable the button, so we can click it again
    structure.myButton.removeAttribute("disabled");
    // cancel and remove animation
    global.amSpinning.cancel();
    switch (me.success) {
      case "boost":
        debug("boost success");
        structure.myMask.dataset.action = "unboost";
        // button will show the warning color, possibly red, on hover
        structure.myButton.classList.add("button--destructive");
        // so we can quickly unboost without searching again
        structure.myMask.dataset.statusId = me.statusId;
        break;
      case "follow":
        structure.myIcon.classList.remove("fa-user-plus");
        structure.myIcon.classList.add("fa-user-times");
        structure.myButton.classList.add("button--destructive");
        structure.myMask.dataset.action = "unfollow";
        // so we can quickly unfollow without fingering again
        structure.myMask.dataset.accountId = me.accountId;
        break;
      case "favourite":
        structure.myMask.dataset.action = "unfavourite";
        structure.myButton.classList.add("button--destructive");
        // so we can quickly unfavourite without searching again
        structure.myMask.dataset.statusId = me.statusId;
        break;
      case "unboost":
        structure.myMask.dataset.action = "boost";
        // button will no longer show the warning color on hover
        structure.myButton.classList.remove("button--destructive");
        break;
      case "unfollow":
        structure.myIcon.classList.remove("fa-user-times");
        structure.myIcon.classList.add("fa-user-plus");
        structure.myMask.dataset.action = "follow";
        structure.myButton.classList.remove("button--destructive");
        break;
      case "unfavourite":
        structure.myMask.dataset.action = "favourite";
        structure.myButton.classList.remove("button--destructive");
        break;
      default:
        debug(`unknown success ${me.success} received!`);
    }
  } else {
    debug(`Success message is here but can't find the button; exiting.`);
  }
}

/*
  Listen for messages from the background process
*/

function listen() {
  browser.runtime.onMessage.addListener((me) => {
    // TODO: decide if we really need this filter
    if (me.to === "content") {
      if (me.success) {
        debug("Success message has arrived.");
        debug(me);
        success(me);
      } else {
        if (me.action === "share") {
          debug("Share request has arrived.");
          share();
        }
      }
    }
  });
}

/*
  Someone has clicked our button!
*/

function myButtonClick() {
  if (structure.myMask.dataset.action) {
    // no more clicks until we're back
    structure.myButton.disabled = true;
    // start spinning the icon - run global.amSpinning.cancel() to stop
    global.amSpinning = structure.myIcon.animate(
      {
        transform: "rotate(0deg)",
        transform: "rotate(360deg)",
      },
      {
        duration: 250,
        // keep spinning until the API replies
        iterations: Infinity,
      }
    );
    // send over anything on the button's dataset
    let message = {};
    for (let k in structure.myMask.dataset) {
      message[k] = structure.myMask.dataset[k];
    }
    sendToBackground(message);
  }
}

/*
  Someone has clicked document.body!
*/

function bodyClick(event) {
  // have we rendered our button?
  if (structure.myButton) {
    // what's our target?
    if (event.target === structure.myMask) {
      myButtonClick();
    }
  }
}

/*
  set a DOM property or data attribute:
  {
    el: [an element],
    att: [an attribute],
    string: [a string]
  }
*/

function set(me) {
  if (typeof me.el[me.att] === "string") {
    // natural DOM attribute
    me.el[me.att] = me.string;
  } else {
    // data attribute
    me.el.dataset[me.att] = me.string;
  }
}

/*
  using a DOM parser, clean troublesome characters and extra whitespace from strings
  me: {
    str: [string]
  }
*/

function filterWhiteSpace(me) {
  // note: this won't work for the background process if we switch to a service worker
  return new DOMParser()
    .parseFromString(me.str, "text/html")
    .documentElement.textContent.replace(/(\n|\r)/g, "")
    .replace(/ +(?= )/g, "");
}

/* 
  create a DOM element with attributes; apply styles if requested
  {
    [a tag name]: {
      [an attribute name]: [a string],
      style: {
        [a valid rule name]: [a string]
      }
    }
  }
*/

function make(me) {
  const tagName = Object.keys(me)[0],
    instructions = me[tagName],
    el = document.createElement(tagName);
  // iterate through keys
  for (let key in instructions) {
    const value = instructions[key];
    // shall we build a text attribute?
    if (typeof value === "string") {
      // set will do the right thing for html and data attributes
      set({
        el: el,
        att: key,
        string: value,
      });
    }
    // shall we build an inline style object?
    if (typeof value === "object" && key === "style") {
      Object.assign(el.style, value);
    }
  }
  return el;
}

/*
  Add a (potentially complex) DOM element
  TODO: explore DocumentFragment
*/

function addFromTemplate(me) {
  for (const key in me.template) {
    const value = me.template[key];
    if (value) {
      if (typeof value === "string" || typeof value === "number") {
        // do we need to add some class names?
        if (key === "addClass") {
          const classNames = value.split(" ");
          classNames.map((name) => {
            me.addTo.className = `${me.addTo.className} ${name}`;
          });
        } else {
          // we needed a way to create non-SPAN tags
          if (key === "text") {
            me.addTo.innerText = filterWhiteSpace({ str: value });
          } else {
            if (key !== "tag") {
              set({
                el: me.addTo,
                att: key,
                // if we get a number here, turn it into a string
                string: `${value}`,
              });
            }
          }
        }
      } else {
        // shall we bulk-assign all style rules?
        if (key === "style") {
          Object.assign(me.addTo.style, value);
        } else {
          // create a new container template
          const container = {
            [value.tag || "SPAN"]: {
              className: `${key}`,
            },
          };
          // build the container
          const child = make(container);
          if (me.before) {
            me.before.parentNode.insertBefore(child, me.before);
          } else {
            // add it to the parent
            if (me.prepend) {
              // at top
              me.addTo.prepend(child);
            } else {
              // at bottom
              me.addTo.appendChild(child);
            }
          }

          // overwrite into our global structure object
          structure[key] = child;
          // recurse until done
          addFromTemplate({ template: value, addTo: child });
        }
      }
    }
  }
}

/*
  make and place our new button
  expects:
    buttonClass: one of the keys in the action object
    data: { 
      things: toPassToBackground
    }
*/
function alterStructure(me) {
  debug("attempting to alter structure");
  // find the modal lead-in,
  let lead = global.modalRoot.getElementsByClassName("interaction-modal__lead")[0];
  let before = global.modalRoot.getElementsByClassName("interaction-modal__choices")[0];
  if (lead && before) {
    // TODO: do we need to try this again?
    removeStructure();
    let myThing = {
      addTo: lead.parentNode,
      before,
      template: {
        myContainer: {
          tag: "DIV",
          className: "interaction-modal__choices",
          style: {
            flexGrow: "1",
            textAlign: "center",
          },
          myChoice: {
            tag: "DIV",
            className: "interaction-modal__choices__choice",
            style: {
              width: "100%",
            },
            myHeadline: {
              tag: "H3",
              myHeadlineContents: {
                tag: "SPAN",
                text: "With Tootski",
              },
            },
            myButton: {
              tag: "BUTTON",
              className: "button",
              myMask: {
                style: {
                  cursor: "pointer",
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  top: "0",
                  left: "0",
                  right: "0",
                  bottom: "0",
                },
              },
              myIcon: {
                tag: "I",
                className: `fa ${me.buttonClass}`,
              },
              myWhiteSpace: {
                tag: "SPAN",
                text: "&nbsp;",
              },
              myLabel: {
                tag: "SPAN",
                text: `${global.instance}`,
              },
            },
          },
        },
      },
    };
    // add data- attributes to myButton before rendering
    for (let k in me.data) {
      myThing.template.myContainer.myChoice.myButton.myMask[k] = me.data[k];
    }
    addFromTemplate(myThing);
    debug("Structure added.");
  } else {
    debug("Did not find modal lead!");
  }
}

// in a perfect world this would be a mutation observer
// but there's no telling when that I tag is actually visible
function addStuff() {
  let icon = global.modalRoot.getElementsByTagName("I")[0];
  if (icon) {
    debug("Adding structure");
    // action has commands for boost, follow, favourite
    for (let k in action) {
      if (icon.classList.contains(k)) {
        debug(`Adding ${k} to buttonClass`);
        action[k].modify({ buttonClass: k });
      }
    }
  } else {
    debug("Can't add structure; icon not found");
    // try again in a little bit
    window.setTimeout(addStuff, 100);
  }
}

function removeStructure() {
  // remove from DOM
  if (structure.myContainer && structure.myContainer.parentNode) {
    debug("removing structure");
    structure.myContainer.parentNode.removeChild(structure.myContainer);
  }
}

function watchModal() {
  global.modalRoot = document.querySelector(".modal-root");
  if (global.modalRoot) {
    debug("watching modal");
    let watcher = new MutationObserver(function () {
      if (document.body.classList.contains("with-modals--active")) {
        addStuff();
      } else {
        removeStructure();
      }
    });
    watcher.observe(document.body, {
      attributes: true,
    });
  } else {
    debug("Did not find modal root.");
  }
}

/*
  Update the background's notion of where we are signed in
*/
function updateCredentials(instance, token) {
  debug("updating credentials");
  sendToBackground({
    action: "credentials",
    instance,
    token,
  });
}

// when the tab comes back into focus, check for login change
function watchVisibility() {
  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      debug("Page is visible");
      if (local.instance && local.token) {
        // we are on one of our instances, so send credentials to background
        updateCredentials(local.instance, local.token);
      } else {
        // we are on a foreign instance, refresh globals from local storage
        browser.storage.local.get(null, (me) => {
          const t = {};
          for (let it in me) {
            t[it] = me[it];
          }
          if (t.instance && t.token) {
            // we are signed in, do we need to rebuild?
            if (global.instance !== t.instance || global.token !== t.token) {
              // we have a new token
              global.instance = t.instance;
              global.token = t.token;
              // fix button label
              if (structure.myLabel) {
                structure.myLabel.textContent = global.instance;
              }
            }
          } else {
            // we have signed out, leave no trace
            removeStructure();
          }
        });
      }
    }
  });
}

// Disabling this for 0.0.2; seeing a front-end crash after sending a DM
function hashtagReminder() {
  const hashTagObserver = new MutationObserver(function () {
    // look for the form
    const f = document.getElementsByClassName("compose-form");
    if (f[0]) {
      if (f[0].dataset.hashtagHelper) {
        return;
      } else {
        let form = f[0],
          input,
          submit,
          submitText;
        // find the input box
        const t = form.getElementsByTagName("TEXTAREA");
        // assume it's the first textarea in the form
        if (t.length) {
          input = t[0];
        } else {
          // did not find it
          return;
        }
        // find the submit button
        const b = form.getElementsByTagName("BUTTON");
        for (var i = 0; i < b.length; i = i + 1) {
          if (b[i].type === "submit") {
            submit = b[i];
            break;
          }
        }
        // did not find it
        if (!submit) {
          return;
        }
        // tell our observer we found the form we want
        form.dataset.hashTagHelper = true;
        // start listening
        let lastValue = "";
        // SpiffY!Search listener
        function checkMe() {
          // split current button text by spaces;
          // if the reminder is there, it will be in space 0
          let z = submit.innerText.split(" ");
          // do we have a value?
          if (input.value) {
            // has it changed?
            if (input.value !== lastValue) {
              // check for at least one hashtag
              // TODO: this does not catch one-character hashtags
              if (input.value.match(/\B\#\w\w+\b/g)) {
                // do we need to remove the reminder?
                if (z[0] === "#?") {
                  // remove #? from array
                  z.shift();
                  // join the rest back up again
                  submit.innerText = z.join(" ");
                }
                submit.classList.remove("button--destructive");
              } else {
                // do we need to show the reminder?
                if (z[0] !== "#?") {
                  z.unshift("#?");
                  submit.innerText = z.join(" ");
                  submit.classList.add("button--destructive");
                }
              }
              // remember value for next time
              lastValue = input.value;
            }
          } else {
            // entry is blank. If the reminder is up, remove it
            if (z[0] === "#?") {
              z.shift();
              submit.innerText = z.join(" ");
            }
          }
          // check again in a tenth of a second
          window.setTimeout(checkMe, 100);
        }
        // start checking
        checkMe();
      }
    }
  });
  // start waiting for a Publish form to appear
  hashTagObserver.observe(document.body, { attributes: true });
}

// decide what to do and do it
function build() {
  let initState = document.querySelector("#initial-state");
  if (initState) {
    console.log(initState);
    try {
      let json = JSON.parse(initState.textContent);
      if (json.meta && json.meta.domain && "limited_federation_mode" in json.meta) {
        if (json.meta.access_token) {
          debug(`Home instance: ${json.meta.domain}`);
          // store to local so we can update background
          local.instance = json.meta.domain;
          local.token = json.meta.access_token;
          // send instance and token to background
          updateCredentials(local.instance, local.token);
          // start watching for the Publish form
          // disabled for 0.0.2
          // hashtagReminder();
          // look for our reply feature
          if (window.location.hash.match(/^#tootskiReply/)) {
            history.pushState("", document.title, window.location.pathname + window.location.search);
            let replyId = window.location.pathname;
            let sel = `[ href="${replyId}"]`;
            function seekButton() {
              let t = document.querySelector(sel);
              if (t) {
                let reply = document.querySelector(".fa-reply");
                let replyAll = document.querySelector(".fa-reply-all");
                if (replyAll) {
                  replyAll.click();
                } else {
                  reply.click();
                }
              } else {
                window.setTimeout(seekButton, 100);
              }
            }
            seekButton();
          }
        } else {
          // we're on a foreign instance
          debug(`Foreign instance: ${json.meta.domain}`);
          if (global.instance && global.token) {
            debug(`Home instance: ${global.instance}`);
          }
          // add a single event listener to document.body
          // if and only if we are on a foreign Mastodon instance
          if (!global.bodyClickListener) {
            document.body.addEventListener("click", bodyClick);
            global.bodyClickListener = true;
          }
          // start observing the modal
          watchModal();
        }
      }
    } catch (err) {
      debug("Could not parse initial-state JSON");
    }
  } else {
    debug("initial-state not found");
  }
}

// on startup, attempt to determine our instance
browser.storage.local.get(["instance"], (me) => {
  for (let i in me) {
    global[i] = me[i];
  }
  build();
  // keep an eye on this tab and refresh if token changes
  watchVisibility();
  // start listening for messages
  listen();
  debug("running");
});
