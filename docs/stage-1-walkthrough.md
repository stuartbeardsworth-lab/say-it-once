# Stage 1 walkthrough: keyboard and VoiceOver

This is the manual check that Stage 1 is "done" (CLAUDE.md, Stage 1). Most of
the keyboard steps are also run automatically on every push by
`e2e/keyboard.spec.ts`, but a person should do them at least once, because
the tests can't judge whether something *feels* right.

Tick each box as you go. If anything doesn't happen as described, note the
step number and what happened instead.

## Part 1: keyboard only (on a computer)

Use a desktop browser. Don't touch the mouse or trackpad once the page is open.

**Safari only:** first turn on Safari → Settings → Advanced → "Press Tab to
highlight each item on a webpage". Without it, Safari's Tab key skips links.

### Home

1. [ ] Open the app. Press **Tab** once. A yellow "Skip to main content" box
   appears at the top left.
2. [ ] Press **Enter**. The yellow box disappears. Press **Tab** again: focus
   goes to the first thing in the page content or footer, not back to the header.
3. [ ] Reload the page. Press **Tab** until "Text size" has a yellow and black
   outline. Every item you pass through has a clearly visible outline.
4. [ ] Press **Enter**. A "Text size" box opens over the page.
5. [ ] Press **Tab** once. "Standard" is highlighted.
6. [ ] Press the **down arrow** three times. The words grow at each press, and
   "Largest" ends up selected.
7. [ ] Press **Tab** several times. Focus never leaves the box.
8. [ ] Press **Escape**. The box closes and the outline is back on "Text size".
   The whole page is now larger: the heading, the banner, the footer links.
9. [ ] Open Text size again and choose "Standard" to put it back.

### Moving between screens

10. [ ] **Tab** to "Privacy & backup" in the footer and press **Enter**. The
    Privacy & backup screen opens and its heading is where focus is (a screen
    reader would read the heading first).
11. [ ] The "Only on this phone" box is shown here too.
12. [ ] **Tab** to "Back" and press **Enter**. You're back on Home.
13. [ ] Press the browser's own back and forward (on a Mac, **Cmd + [** and
    **Cmd + ]**). The screens change and nothing breaks.

### Building blocks (footer → "Building blocks (for review)")

14. [ ] **Dialog:** Tab to "Open an example dialog", press **Enter**. The box opens.
    Tab and **Shift + Tab** round it: focus never goes behind it. **Escape**
    closes it and the outline is back on "Open an example dialog".
15. [ ] **Confirm:** Tab to "Delete example item", press **Enter**. Focus is on
    **Cancel**, not Delete. Press **Escape**: it closes and nothing is deleted.
16. [ ] Open it again, **Tab** to "Delete example", press **Enter**. After a moment
    it closes and "The example was deleted" appears.
17. [ ] Tick "Pretend the next delete fails" (**Space** ticks it), then delete
    again. The box stays open and says "That didn't work, so nothing has changed."
18. [ ] **Text fields:** Tab into "Organisation" and type something. Tab to
    "Show an error message", press **Enter**. A red message appears above the
    box and the box gets a thick red border. The "What happened?" box accepts
    several lines of text.
19. [ ] **Save status:** press "Show a failed save". A red "Not saved" box
    appears. Wait a full minute: it's still there. Tab to "Dismiss this
    message" and press **Enter**: it goes.

## Part 2: VoiceOver on a real iPhone

Open the app in Safari on the iPhone. Turn on VoiceOver (Settings →
Accessibility → VoiceOver, or triple-click the side button if you've set up
that shortcut). Swipe right to move to the next item, swipe left to go
back, double-tap to activate.

20. [ ] On Home, swipe right from the top. You hear "Skip to main content",
    then "Say It Once, link", then "Text size, button", then the heading
    "Keep everything together…, heading level 1".
21. [ ] The "Only on this phone" box is read, including "If the phone or browser
    data is lost, so is your record."
22. [ ] Double-tap "Privacy & backup" in the footer. VoiceOver reads
    "Privacy & backup, heading level 1" straight away (not the top of the page).
23. [ ] Open Text size. VoiceOver says it's a dialog called "Text size". Swipe
    through: each option is read as a radio button with "1 of 4" and so on,
    and the current one is "selected". Choose "Largest": the page grows.
    Double-tap "Done".
24. [ ] On Building blocks, open the confirm dialog. VoiceOver announces it as
    an alert with the heading "Delete this example?", and you can't swipe
    out of it onto the page behind.
25. [ ] Swipe to "Organisation". It's read with its hint ("For example, the
    hospital or GP surgery"). Turn on the error message and swipe back to the
    box: it's now read as "invalid data" with the error message.
26. [ ] Press "Show a failed save". VoiceOver reads "Not saved…" by itself,
    without you moving to it.
27. [ ] Press "Show Saved". VoiceOver says "Saved" without interrupting.

Record the iPhone model, iOS version and date when you've finished:

- iPhone: 
- iOS: 
- Date: 
- Checked by: 
