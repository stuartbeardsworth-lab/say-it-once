# Stage 6a walkthrough: backup and restore

The same checks run automatically on every push (`e2e/stage6a.spec.ts` and
`src/features/backup/backup.test.ts`, which saves a backup, restores it on
an empty device and checks every entry, link and file comes back exactly).

Start by loading the example record: footer, **Building blocks (for
review)**, **Try the reports**, **Load the example record**.

## The reminder

1. [ ] Go **Home**. A note says **Keep a copy of your record safe**, with a
   link to save a backup. (It shows once a record has 10 or more entries and
   no backup has been saved from this device for three weeks.)
2. [ ] Press **Not now**. It goes, and stays gone after reloading the page.

## Saving a backup (on a computer)

3. [ ] Open **Privacy & backup**. Read **Save a backup copy**: it says the
   backup holds everything, private entries too, and isn't locked with a
   password.
4. [ ] (Since 27 September 2026 a backup can be locked; see "Locked
   backups" below.) Choose **Don't lock it**, press **Make a backup**, then **Save the backup to this device**. It
   says your browser is saving "Say It Once backup (today's date).zip", and
   "Last backup saved from this device" shows today.
5. [ ] Unzip it if you like: `manifest.json` (readable, and it says the file
   isn't encrypted), a `records` folder and a `files` folder.

## Locked backups (added 27 September 2026)

- [ ] **Lock it (recommended)** is already chosen. Press **Make a backup**
  with no password: it asks for one and for the "written down" tick.
- [ ] **Suggest a password** fills in four words. Tick **I've written the
  password down**, make the backup and save it: the file ends
  "(locked).sayitonce".
- [ ] In another browser, restore it: it says **This backup is locked**.
  A wrong password says it doesn't match; the right one shows what's in
  the backup, as below.

## Restoring on another device

6. [ ] Open the preview in a **different browser**, or a private window, so
   it starts empty. Go to **Privacy & backup**, **Choose a backup file**, and
   pick the backup.
7. [ ] It shows **In this backup, saved (date)**, with each record, how many
   entries and files it has, and nothing is changed yet.
8. [ ] Press **Restore 2 records**. It says they're now on this device. In
   **My records**, show the example record: its letters, photos and private
   entries are all there.

## Restoring on the same device

9. [ ] Back in the first browser, choose the same backup again. Each record
   says it's **already on this device**, with **Leave it out** chosen. The
   button says **Nothing to restore**.
10. [ ] Choose **Restore it as a separate copy** for the example, and
    restore. **My records** now has the example and "… (restored copy)".
    Delete the copy if you like.

## A wrong file

11. [ ] Choose a file that isn't a backup (a photo, or a PDF made earlier).
    A red **Not restored** message says so, and that nothing has changed.

## From Safari to the home screen, on your iPhone

12. [ ] In Safari, load the example and make a backup; **Share the backup**,
    **Save to Files**.
13. [ ] Open Say It Once from your home screen icon. In **Privacy & backup**,
    **Choose a backup file**, pick it from Files, and restore. The example is
    now in the home-screen app too.

## Deleting everything

14. [ ] In **Privacy & backup**, press **Delete everything on this device**.
    Focus starts on **Cancel**. Press **Delete everything**: you're taken
    Home, and **My records** has only an empty "My record".

## Result

- Passed / failed:
- Anything to change:
- Date:
