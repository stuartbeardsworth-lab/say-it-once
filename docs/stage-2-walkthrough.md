# Stage 2 walkthrough: saving on this device

This is the manual check for Stage 2 (domain and local store). The same
steps run automatically on every push in `e2e/storage.spec.ts`, but a person
should try them once on a real phone and a computer.

Use the live Netlify site. Open **Building blocks (for review)** from the
footer and scroll to **Saving on this device**. The pretend failures only
exist on that page and go when it is removed in Stage 6.

Tick each box as you go. If anything doesn't happen as described, note the
step number and what happened instead.

## On a computer

### Saving and reloading

1. [ ] In **Try a Quick Note**, type a sentence. Stop typing. Within about a
   second, "Saved" appears under the box.
2. [ ] Your note appears in **Quick Notes saved on this device**.
3. [ ] Reload the page. The note is still in the list.
4. [ ] Type in the box again, then press **Tab** straight away (don't wait).
   "Saved" appears at once: leaving the box saves it.

### Two tabs

5. [ ] Open the site in a second tab, on the same Building blocks page.
6. [ ] In the first tab, press **Start a new note** and type something. Switch
   to the second tab: the new note is already in its list, without reloading.

### Honest errors

7. [ ] Under **Should the next save fail?**, choose "Yes: the device is full".
8. [ ] Type in the note box. A red **Not saved** box appears saying the device
   has run out of space and what to do. Your words are still in the box.
9. [ ] The dropdown has gone back to "No, save normally". Type another word:
   "Saved" appears, and the list shows your latest words.
10. [ ] Try the other two reasons ("blocking storage", "closed storage"). Each
    gives its own explanation.
11. [ ] Press **Pretend storage is unavailable**. A red message appears at the
    top of the page: "Say It Once can’t save on this device at the moment".
12. [ ] Type in the note box. It says **Not saved**.
13. [ ] Go to **Privacy & backup**. The same red message is there too.
14. [ ] Press **Try again** in the message. It disappears, and saving works again.

### Deleting

15. [ ] Press **Delete this note** on a note. A box asks "Delete this Quick
    Note?" with focus on **Cancel**. Press **Delete note**.
16. [ ] The note disappears from the list. Reload: it's still gone.

### Text size and space

17. [ ] Open **Text size**. The four sizes sit side by side, each showing an
    "A" at about that size. Choose **Larger**, press **Done**, then reload.
    The page is still at the larger size.
18. [ ] On **Privacy & backup**, **Space on this device** says how much storage
    Say It Once is using, and whether the browser has agreed to keep your record.

## On your iPhone (Safari)

19. [ ] Repeat steps 1 to 3: write a note, reload, and it's still there.
20. [ ] Close Safari completely (swipe it away), open it again and go back to
    the page. The note is still there.
21. [ ] Repeat step 17 with VoiceOver on. Each size is read as a radio button,
    for example "Larger, radio button, 3 of 4", and the chosen one as "selected".

## Result

- Passed / failed: 
- Notes: 
- Date: 
- Checked by: 
