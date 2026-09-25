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
          'Later, you’ll be able to share the parts you choose with a solicitor, your employer, the DWP or a doctor, so you don’t have to explain everything again.',
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
        a: ['Yes. Use the microphone on your phone’s keyboard. Say It Once doesn’t record sound itself.'],
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
          'That also means that if the phone is lost or its browser data is cleared, the record is lost too. A way to save a backup copy is coming.',
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
    title: 'Using it on your phone',
    questions: [
      {
        q: 'Can I put Say It Once on my home screen?',
        a: ['Yes. See “Keep Say It Once on your phone” for the steps for your phone, and one important thing to know first.'],
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
