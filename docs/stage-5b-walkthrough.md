# Stage 5b walkthrough: the zip file

The same checks run automatically on every push (`e2e/stage5b.spec.ts`,
`src/reports/zip.test.ts`, and the privacy property tests, which now open
every zip and check its file names, its web page and its attachments).

Start by loading the example record: footer, **Building blocks (for
review)**, **Try the reports**, **Load the example record**. It now has a
Quick Note with a small made-up picture (a chequered square).

## On a computer

1. [ ] In **Use my record**, choose **Just for me**, then **Everything in my
   record**, then **Create the report**. The report's **Other notes** has
   the note about the fracture clinic, with "Photo: See P1", and near the
   end there's a **Photos** list with P1.
2. [ ] Under the buttons it says a zip file holds the PDF, a copy that works
   well with screen readers, and the 3 letters and photos it refers to.
3. [ ] Press **Make a zip file**. When it's ready it says its size. Press
   **Save the zip file to this device**, then open (unzip) it. Inside:
   - `report.pdf` — the same PDF as before, now with the Photos list;
   - `report.html` — open it in a browser: the whole report, readable, with
     the file names in the Evidence index and P1 as links;
   - an `attachments` folder with `E1-discharge-letter.pdf`,
     `E3-fracture-clinic-letter.pdf` and `P1-photo.png`. (E2, the taxi
     receipts, is a paper copy only, so it has no file.)
4. [ ] Tap the E1 link in `report.html`: the letter opens. (The example's
   letters are tiny made-up files, so they may look empty or odd.)
5. [ ] Nothing in the zip (file names or contents) says **PRIVATE**.

## On your iPhone

6. [ ] Make the same zip and press **Share the zip file**. Choose **Save to
   Files**. In the Files app, tap the zip: iPhone unpacks it into a folder
   with the same files.
7. [ ] Try **Mail** too, if you like. Some email services refuse large
   attachments; the example's zip is small.
8. [ ] In the home-screen app, with **Aeroplane mode** on, making a zip
   still works.

## Result

- Passed / failed:
- Anything to change:
- Date:
