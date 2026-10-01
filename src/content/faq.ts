// Questions and answers. DRAFT for the owner to review before release
// (CLAUDE.md, "Decisions made during the build"). Every answer describes
// only what the app does now; update them when features change (D10).

export interface FaqTopic {
  title: string;
  questions: { q: string; a: string[] }[];
}

export const faq: FaqTopic[] = [
  {
    title: 'Getting started',
    questions: [
      {
        q: 'What is Say It Once for?',
        a: [
          'It helps you keep a record of what happened, how it affects you, and your appointments, treatment, costs, letters and contacts, all in one place.',
          'When you need to, Use my record puts together the parts you choose for a solicitor, your employer, the DWP or a doctor, so you don’t have to explain everything again.',
        ],
      },
      {
        q: 'Do I have to fill everything in?',
        a: ['No. Nothing is required except a few details that make an entry make sense, such as the date of an appointment. A few words are always enough, and you can come back any time.'],
      },
      {
        q: 'Where do I start?',
        a: [
          'Most people start with a Quick Note, or with What happened. You can also use Add something on the Home screen to choose what to add.',
        ],
      },
      {
        q: 'Can I speak instead of typing?',
        a: [
          'Yes. Use the microphone on your phone’s keyboard. Say It Once doesn’t record sound itself.',
          'If you can’t find it, choose “Rather talk than type?” under the main writing boxes (in What happened, a Quick Note, and How it affects me). It shows the steps for iPhone, Android and Samsung phones, including how to turn the microphone on.',
        ],
      },
    ],
  },
  {
    title: 'Saving and keeping your record safe',
    questions: [
      {
        q: 'Do I need to press Save?',
        a: [
          'On What happened, no: it saves as you type, and says “Saved” when it has. In boxes that open over the page, such as an appointment, press the Save button.',
          'If something can’t be saved, you’ll see a red “Not saved” message saying why, and your words stay on the screen.',
        ],
      },
      {
        q: 'Where is my record kept?',
        a: [
          'Only in this browser, on this device. It isn’t sent anywhere, and no one at Say It Once can see it.',
          'That also means that if the phone is lost or its browser data is cleared, the record is lost too. Save a backup copy now and then, in Privacy & backup, and keep it somewhere safe.',
        ],
      },
      {
        q: 'Who can see my record?',
        a: ['Anyone who can open this device and this browser. Keeping your phone locked keeps your record private.'],
      },
      {
        q: 'What does “Keep this private” do?',
        a: [
          'A private entry stays in your record, but is never included in anything you create to share. It also can’t be added to your calendar or contacts, and isn’t printed.',
          'To include it later, untick “Keep this private” on that entry.',
        ],
      },
      {
        q: 'How do I delete something?',
        a: [
          'Open it and press Delete. You’re always asked first. Deleting removes it from this device completely, including any photo or file saved with it.',
          'It can’t take back a PDF you’ve already shared or saved. If the entry was in one, the question before deleting says so.',
        ],
      },
    ],
  },
  {
    title: 'Your record',
    questions: [
      {
        q: 'What is a Quick Note?',
        a: [
          'A quick way to jot something down, with a photo if you like. You can file it later in the right place, such as Appointments or How it affects me, or leave it as it is.',
        ],
      },
      {
        q: 'What’s the difference between “Something has changed” and “I’m correcting what I wrote”?',
        a: [
          '“Something has changed” keeps a copy of how things were before, so you can show how they’ve changed over time.',
          '“I’m correcting what I wrote” replaces the words, and nothing is kept of the old version.',
        ],
      },
      {
        q: 'Can I keep more than one record?',
        a: ['Yes. In My records you can add a separate record for each injury or illness, and switch between them.'],
      },
      {
        q: 'How do I find something?',
        a: ['Use Find in my record. Type any word, such as a name, a medicine or a word from a letter. It also shows totals for money spent and lost, your current medication and your next appointment.'],
      },
    ],
  },
  {
    title: 'Backups',
    questions: [
      {
        q: 'How do I save a backup?',
        a: [
          'Go to Privacy & backup and press Make a backup. When it’s ready, share it to your email or a cloud drive, or save it to your phone or computer.',
          'A backup holds every record on this device, including entries marked “Keep this private”. You can lock it with a password, so only someone with the password can open it. Then it’s safe to keep in your email or a cloud drive, where it’s kept even if you lose your phone.',
        ],
      },
      {
        q: 'What if I forget the password for a locked backup?',
        a: [
          'The backup can’t be opened without it, and nobody can reset it, not even Say It Once. That’s what keeps it private. Write the password down when you make the backup, and keep it apart from the backup.',
          'If you’ve forgotten it but still have your record on this phone, make a new backup with a new password.',
        ],
      },
      {
        q: 'How do I bring my record back from a backup?',
        a: [
          'Go to Privacy & backup and press Choose a backup file. Say It Once shows what the backup holds, and anything it can’t bring back, before it changes anything.',
          'Restoring only ever adds records. It never replaces or changes what’s already on this device. If a record is already here, you choose whether to add it again as a separate copy.',
          'This is also how to move your record from Safari to Say It Once on your home screen: save a backup in Safari, then restore it in the home-screen app.',
        ],
      },
    ],
  },
  {
    title: 'Sharing your record',
    questions: [
      {
        q: 'How do I give my record to someone?',
        a: [
          'Go to Use my record. Choose who it’s for and what they need, check what goes in, then press Create the report.',
          'Press Make a PDF. When it’s ready, press Share the PDF to send it with email, a message or another app, or save it to your phone or computer.',
          'Or press Make a zip file. A zip file is one file holding the PDF, a copy that works well with screen readers, and the letters and photos the report refers to, numbered to match it (E1, E2, P1…).',
          'Anything marked “Keep this private” is never included.',
        ],
      },
      {
        q: 'How do I know it was sent?',
        a: [
          'Say It Once can tell when the PDF was passed to the app you chose, such as your email. Whether the message was then sent is up to that app, so check there.',
          'If you close the share options without choosing an app, it says “Not sent”.',
        ],
      },
    ],
  },
  {
    title: 'Using it on your phone',
    questions: [
      {
        q: 'Can I put Say It Once on my home screen?',
        a: ['Yes. See “Keep Say It Once on your phone” for the steps for your phone, and one important thing to know first.'],
      },
      {
        q: 'Does it work without the internet?',
        a: [
          'Yes. Once Say It Once has been opened with a connection, it keeps what it needs on your device. You can write, find things and make PDFs without a connection.',
          'When a new version is ready, a message offers it. Nothing changes until you choose, and your record stays as it is.',
        ],
      },
      {
        q: 'Can I make the words bigger?',
        a: ['Yes. Press “Text size” at the top of any screen and choose from four sizes. Say It Once remembers your choice on this device.'],
      },
      {
        q: 'Does it work with VoiceOver and other screen readers?',
        a: ['Yes. Every screen and button is labelled, and everything can be done with a keyboard.'],
      },
    ],
  },
];
