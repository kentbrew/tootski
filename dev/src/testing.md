# Testing

- Tootski is currently testable in Chrome, Firefox, and Microsoft Edge; Safari will have to wait until we are out and stable.
- While Tootski may potentially work on mobile devices, we're concentrating on desktop only for now.

## Setup

If you're bravely testing this in developer mode (by which I mean not acquiring Tootski from the App Store):

1. Open a new window
1. Open `about:debugging#/runtime/this-firefox` or `chrome://extensions`
1. Remove if installed
1. Click Load Temporary Add-On (Firefox) and then `manifest.json` in `dist/ff` or Drag in `dist/cr` (Chrome, Microsoft Edge)

Otherwise, install Tootski from the app store. URLs will appear here when we have them:

- Chrome: not available yet
- Firefox: not available yet
- Microsoft Edge: not available yet

_Super important: please check that you don't have any other tabs open in this window. If you do, tests listed below are guaranteed to act weird._

## Hashtag Reminder

As you're composing a toot or reply, note that the Publish! will show the warning color--typically red--on hover, and have `#?` prepended to the label until you have at least one hashtag in your entry. This is to help you remember to hashtag your posts for better searchability.

Hashtag reminder is advisory only and does not block functionality; you can always post without hashtags.

## Browser Button

Note that the browser button is gray on browser start. It should remain so until you sign in to at least one Mastodon server.

1. In a new tab, open a home server. If you're not already authed, sign in and reload.
1. Note that the browser button is now purple.
1. Open a non-Mastodon page.
1. Highlight some text.
1. Click the browser button.
1. Note that your home server opens in a new tab with the text you highlighted filled in over the URL of the page you were on. If you highlighted more than 200 characters, Tootski will truncate. _If you see a window saying your server is down for maintenance this is a typical response to a too-long URL; please copy and report the URL._
1. Try some other things:

- If you don't select any text, you should see whatever was in document.title.
- If the page you're on has a canonical link, that's the URL you should see.
- If the page you're on does not have a canonical link, you should see whatever URL is in your address bar, minus the parameters so you don't post a bunch of trackers to Mastodon. _If you run into a situation where you can't share a page without URL parameters, please copy and report the URL._

## Boost, Follow, or Favourite

Be sure you're signed in before trying this. If the browser button is gray, visit your home server, sign in if you're not already, and note that the browser button turns purple.

1. In a new tab, open a Mastodon server that isn't your home server.
1. Choose an interesting toot or account.
1. Click the boost, follow, or favourite button.
1. Note that the Dreaded Modal Dialogue appears, with a new button in the middle labeled `With Tootski`.
1. Note that the button has the appropriate icon (boost, follow, favourite) and the name of your server.
1. Click the button. Note that the button disables for a bit, the icon spins, and then the button then re-enables.

- If you followed, note that the plus-sign in the button icon turned into an x.
- If the button hangs in the disabled state, we probably hit a network error, which we are not yet very good at trapping. Reload the page and try again. _If trouble persists, please copy and report the URL from the On A Different Server box in the Dreaded Modal Dialogue._

1. Open a fresh tab and go to your Mastodon profile, being sure not to close the Dreaded Modal Dialogue.

- If you boosted, look at `https://yourserver.tld/@yourname/with_replies`
- If you followed, look at `https://yourserver.tld/@yourname/following`
- If you favourited, look at `https://yourserver.tld/favourites` (no `@yourname` here)

1. You should see your new boost, follow, or favourite on your server.
1. Go back to the tab on the foreign instance. The Dreaded Modal Dialogue should still be there.
1. Note that when you hover over the button it turns to the warning color, typically red. Click the button again to undo whatever action you took.
1. Go back to your home instance and reload the page. The action you took above should no longer be there. _If it persists, you may need to hard-reload the page. \_If trouble persists, please copy and report the URL from the On A Different Server box in the Dreaded Modal Dialogue._

## Multiple Accounts (optional!)

If you've moved servers you may still have an active login on the original. While testing please be careful about posting to your old server, which may not be where you want things to go.

1. In two different tabs, sign in to two different Mastodon servers.
1. In a third tab, open a Mastodon server that isn't one of your home servers.
1. Click a boost, follow, or favourite button. Note that the With Tootski button comes up showing the name of the most recent server you were looking at.
1. Open the tab containing the other signed-in server.
1. Return to the tab on the foreign Mastodon server.
1. Note that the With Tootski button has changed to show the name of the most recent server you were looking at.

_Known issue: if you boost, follow, or favorite from one server, switch to another, and return here before closing the Dreaded Modal Dialogue, the unboost button will update with the name of the new server, which won't be able to actually undo what you just did. This is on our list of things to fix but it's pretty edge-case-ish._
