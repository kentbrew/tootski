# Things It Is Good To Know About Tootski

Tootski is a browser extension that allows you to boost, follow, or favorite from outside your home Mastodon server, and instantly share any non-Mastodon page you might be reading.

## The Problem

Mastodon's federated nature means that following a link very often takes you to a server where you're not a member. When you go to interact with a toot or follow an author you get the Dreaded Modal Dialog, which wants you to either sign in on this server or copy a complex-looking piece of text, go to your own server, paste it in, and (hopefully) interact with a search result, which will (hopefully) be the member or toot you wanted to interact with in the first place.

There's a whole lot wrong with this interaction, not the least of which is it sends a strong message that clicking any of the things that Mastodon really, really needs you to click -- those boost, follow, favorite, or reply buttons -- will break your reading flow.

Tootski is here to help.

## Mistakes Made So Far

Being an ever-growing list of things I could have done differently while developing Tootski.

### Credential Handling

Tootski currently gets your credentials by looking at the contents of `<script id="initial-state">` when you visit a page on your Mastodon instance.

Why I like this:

- There's no login step. Although Tootski is currently using local storage, it could store credentials in
  RAM only, forgetting them when the browser closes.
- Tootski should work with multiple logins, remember the last one it encountered, and instantly switch back and forth without requiring page reloads.

Why I don't like this:

- Future updates to the Mastodon Web client could remove the `initial-state` script from the DOM, requiring Tootski to do something more involved, such as listening to headers on API requests for the bearer token.
- Tootski doesn't have an app ID, so it doesn't get credit for activity.
- It's not the canonical Right Way To Do It, so it will incur ill will from some subset of developers and instance admins.

### Not Entirely Removing the Dreaded Modal Dialog

It's possible that Tootski could intercept clicks to inline buttons and boost, follow, or favorite without showing the Dreaded Modal Dialog at all. Here's why I kept it:

- If Tootski failed, the DMD would not be available as fallback.
- There are reasons why you might want to see the DMD. Copying and pasting an URL or two, for instance.
- There are reasons (signups and logins being two) why the server might want you to see the DMD.
- When building extensions it is usually best to add functionality and not take it away.

### Not Launching with Inline Reply

Tootski's flow breaks down when replying. If there was some way to open your home instance with an URL preloaded in the search box the way you can preload a string of text to write a new post, it would be so, so great!

- Parameters that do nothing include `q` and `search`.
- Parameters that populate the textarea and move the cursor to the end include `url` and `text`.

I've tried a bunch of things, like loading the home instance page, finding the box, and filling it with content; on first interaction with the page, everything in the box goes away. Help figuring this out would be really great!

## What Would Really, Really Help

If the developers of Mastodon embraced browser extensions as a way to connect different instances, and left a few hooks for extensions to grab onto.
