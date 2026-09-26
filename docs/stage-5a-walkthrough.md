# Stage 5a walkthrough: PDFs, sharing, and the home-screen app

The same checks run automatically on every push (`e2e/stage5a.spec.ts`,
`src/reports/pdf.test.ts` and the privacy property tests, which now cover
the PDF too). These checks need real devices: a computer and your iPhone.

Each time, start by loading the example record: footer, **Building blocks
(for review)**, **Try the reports**, **Load the example record**.

## On a computer

1. [ ] In **Use my record**, choose **Benefits: the DWP or a form**, then
   **A PIP claim or review**, then **Create the report**.
2. [ ] Press **Make a PDF**. After a moment, **Save the PDF to this device**
   appears, and it says "Your PDF is ready."
3. [ ] Press it. It says your browser is saving the file. Open the PDF from
   your downloads and check:
   - a contents page, and "Page 1 of 7" (or similar) at the foot of each page;
   - letters numbered E1, E2, E3, with an **Evidence index**;
   - **Confirmation** with lines for your name, signature and date;
   - the word **PRIVATE** appears nowhere;
   - no heading is left on its own at the bottom of a page.
4. [ ] Go to **Letters & documents**, open **Discharge letter**, **Edit
   details**, then **Delete**. The question says it was in a report you
   shared or saved today, and that copies already given to someone can't be
   taken back. Press **Cancel**.

## On your iPhone, in Safari

5. [ ] Make the same report, then **Make a PDF**. Both **Share the PDF**
   and **Save the PDF to this device** appear.
6. [ ] Press **Share the PDF**, then close the share options without
   choosing anything. It says **Not sent**.
7. [ ] Press **Share the PDF** again and choose **Mail** (or **Save to
   Files**). Back in Say It Once, it says "Passed to the app you chose".
   Check the PDF arrived.

## As a home-screen app on your iPhone

8. [ ] Follow **Keep Say It Once on your phone** to add it to your home
   screen. The icon is a teal square with **SiO** (a placeholder).
9. [ ] Open it from the icon. It fills the screen, without Safari's address
   bar. It has its own separate record on iPhone, so load the example again.
10. [ ] Make a PDF. Only **Share the PDF** appears, because iPhones save
    through the share options here. Choose **Save to Files** and check the
    file is there.
11. [ ] Close the app completely. Turn on **Aeroplane mode**. Open the app
    from its icon: it opens, and your record is there. Make a PDF: it
    works without a connection. Turn Aeroplane mode off.

## VoiceOver on your iPhone

12. [ ] With VoiceOver on, press **Make a PDF**. It reads "Making the PDF…",
    then "Your PDF is ready." and moves to the Share button.

## Result

- Passed / failed:
- Anything to change (layout of the PDF, wording, the icon):
- Date:
