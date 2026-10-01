import { blank } from '../domain/blank';
import type { AnyItem, ItemDataMap, ItemType } from '../domain/types';

// A fictional example record for testing reports and for trying the app.
// "Sam Taylor" and everything that happens to them is made up. It includes
// private entries of every kind, so their absence from reports can be seen.
//
// Dates are worked out from `today`, so there are always upcoming and past
// appointments. IDs are fixed here; loading the example gives them new ones.

export interface ExampleFile {
  name: string;
  type: string;
  /** The file's contents: text, or base64 for an image. */
  text: string;
  base64?: boolean;
}

/** A tiny made-up picture (a chequered square) for the example's photo. */
const examplePhoto = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAIAAABAJy5dAAAASklEQVR42u3VsQkAIAwEQBdxJhdwfktxBPvYGwgHKR9y1X/rY4Zb+4T7mWlAQOVAue/fDBBQPZAeAgKyZUBAtkwxAgHZMiCgVNAFzgP5Jm3k30MAAAAASUVORK5CYII=';

export interface ExampleEntry {
  id: string;
  type: ItemType;
  data: ItemDataMap[ItemType];
  private: boolean;
  file?: ExampleFile;
}

export interface ExampleRecord {
  recordName: string;
  personName: string;
  entries: ExampleEntry[];
}

function shift(today: string, days: number): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function exampleRecord(today: string): ExampleRecord {
  const day = (n: number) => shift(today, n);
  const entries: ExampleEntry[] = [];
  const add = <T extends ItemType>(id: string, type: T, data: ItemDataMap[T], isPrivate = false, file?: ExampleFile) =>
    entries.push({ id, type, data, private: isPrivate, ...(file && { file }) });

  add('ex-incident', 'incident', {
    date: day(-120),
    time: '14:20',
    place: 'Loading bay, Northgate Distribution, Leeds',
    before: 'I was unloading pallets at the end of a normal shift.',
    what: 'A pallet slipped off the forklift and knocked me down. I landed on my right wrist and hit my head on the kerb.',
    after: 'A first aider stayed with me and my supervisor called an ambulance. I was taken to Leeds General Infirmary.',
    told: 'The paramedic said I might have broken my wrist and should not drive.',
    injuries: 'Broken right wrist (distal radius). Concussion. Bruised hip.',
    witnesses: 'Priya from the day shift, and my supervisor Dan.',
    services: 'Ambulance. The incident was logged in the accident book.',
    treatment: 'X-ray, a plaster cast and painkillers in A&E.',
    complications: 'The wrist needed an operation to fix it with a plate two weeks later.',
    ongoingCare: 'Physiotherapy weekly, and fracture clinic every six weeks.',
  });

  add('ex-work', 'workDetails', {
    employer: 'Northgate Distribution Ltd',
    workplace: 'Leeds depot',
    jobTitle: 'Warehouse operative',
    employmentStart: day(-1500),
    employmentEnd: '',
    payrollRef: 'ND-40721',
    accidentReported: 'Yes',
    reportedTo: 'Dan Hughes, shift supervisor',
    reportDate: day(-120),
    employmentSince: day(-30),
  });

  add('ex-area-dress', 'impactArea', {
    areaKey: 'dress',
    difficulty: 'I find this very difficult',
    detail: 'I can’t do buttons or zips with my right hand. My partner helps me every morning.',
    help: 'Someone to help with buttons, zips and socks.',
    aid: 'A sock aid and elastic shoelaces.',
    often: 'Every day',
    safety: 'I lose my balance putting trousers on, so I sit down.',
    timeLonger: 'About twice as long as before.',
    standard: 'I often have to leave shirts undone.',
  });
  add('ex-area-food', 'impactArea', blank('impactArea', {
    areaKey: 'food',
    difficulty: 'It is harder now',
    detail: 'I can’t chop or lift a full pan. I mostly use ready meals.',
    help: 'Someone to lift pans and drain vegetables.',
    often: 'Every day',
  }));
  add('ex-area-toilet', 'impactArea', blank('impactArea', {
    areaKey: 'toilet',
    difficulty: 'It is harder now',
    detail: 'Cleaning myself with my left hand is difficult and slow.',
    often: 'Every day',
  }));
  add('ex-area-people', 'impactArea', blank('impactArea', {
    areaKey: 'people',
    difficulty: 'It is harder now',
    detail: 'I avoid busy places because I worry someone will knock my arm.',
    often: 'Most days',
  }));
  add(
    'ex-area-money',
    'impactArea',
    blank('impactArea', {
      areaKey: 'money',
      difficulty: 'It is harder now',
      detail: 'PRIVATE: my brother has been lending me money to cover the rent.',
    }),
    true,
  );
  add('ex-note', 'impactNote', { text: 'I had to stop playing five-a-side football, which was my main way of seeing friends.' });

  add('ex-snap-1', 'impactSnapshot', {
    date: day(-100),
    areas: [
      {
        itemId: 'ex-area-dress',
        data: blank('impactArea', { areaKey: 'dress', difficulty: 'I cannot do it at all', detail: 'In a cast I needed help with all dressing.' }),
      },
      {
        itemId: 'ex-area-money',
        data: blank('impactArea', { areaKey: 'money', difficulty: 'I find this very difficult', detail: 'PRIVATE: I missed a rent payment.' }),
      },
    ],
    note: { itemId: 'ex-note', text: 'I could not leave the house much.' },
  });

  add('ex-check-1', 'checkIn', { date: day(-60), pain: 'High', feeling: 'Struggling', pulse: null, note: 'Bad night after physio.' });
  add('ex-check-2', 'checkIn', { date: day(-20), pain: 'Medium', feeling: 'Okay', pulse: null, note: '' });
  add('ex-check-3', 'checkIn', { date: day(-5), pain: 'Medium', feeling: 'Struggling', pulse: null, note: 'PRIVATE: feeling very low this week.' }, true);

  add(
    'ex-doc-discharge',
    'document',
    blank('document', {
      title: 'Discharge letter',
      from: 'Leeds General Infirmary',
      date: day(-118),
      point: 'Operation to fix the wrist with a plate.',
      relatedTo: { section: 'treatment', itemId: null },
      file: { fileId: 'ex-file-discharge', name: 'discharge-letter.pdf', type: 'application/pdf', size: 0 },
    }),
    false,
    { name: 'discharge-letter.pdf', type: 'application/pdf', text: 'Example discharge letter (fictional).' },
  );
  add(
    'ex-doc-letter',
    'document',
    blank('document', {
      title: 'Appointment letter — Fracture clinic',
      from: 'Fracture clinic',
      date: day(-45),
      relatedTo: { section: 'appointments', itemId: 'ex-appt-past' },
      file: { fileId: 'ex-file-letter', name: 'fracture-clinic-letter.pdf', type: 'application/pdf', size: 0 },
    }),
    false,
    { name: 'fracture-clinic-letter.pdf', type: 'application/pdf', text: 'Example appointment letter (fictional).' },
  );
  add(
    'ex-doc-private',
    'document',
    blank('document', {
      title: 'PRIVATE: Counselling assessment',
      from: 'PRIVATE: Leeds Talking Therapies',
      date: day(-30),
      point: 'PRIVATE: referred for anxiety.',
      file: { fileId: 'ex-file-private', name: 'PRIVATE-counselling.pdf', type: 'application/pdf', size: 0 },
    }),
    true,
    { name: 'PRIVATE-counselling.pdf', type: 'application/pdf', text: 'PRIVATE example file.' },
  );
  add(
    'ex-doc-receipt',
    'document',
    blank('document', { title: 'Taxi receipts', from: 'City Cabs', date: day(-90), paperCopy: 'Blue folder, kitchen drawer' }),
  );

  add('ex-appt-past', 'appointment', {
    date: day(-45),
    time: '09:30',
    organisation: 'Fracture clinic, Leeds General Infirmary',
    person: 'Mr Okafor',
    purpose: 'Check-up after the operation',
    location: 'Outpatients, level 2',
    type: 'In person',
    told: 'The bone is healing. Keep doing the exercises.',
    next: 'Physiotherapy twice a week, then back in six weeks.',
    documentId: 'ex-doc-letter',
  });
  add('ex-appt-next', 'appointment', blank('appointment', {
    date: day(14),
    time: '11:00',
    organisation: 'Fracture clinic, Leeds General Infirmary',
    purpose: 'Six-week review',
    type: 'In person',
  }));
  add('ex-appt-physio', 'appointment', blank('appointment', {
    date: day(3),
    time: '15:45',
    organisation: 'Physiotherapy, St James’s',
    purpose: 'Wrist exercises',
    type: 'In person',
  }));
  add(
    'ex-appt-private',
    'appointment',
    blank('appointment', {
      date: day(7),
      organisation: 'PRIVATE: Talking therapies',
      purpose: 'PRIVATE: counselling',
      documentId: 'ex-doc-private',
    }),
    true,
  );

  add('ex-treat-op', 'treatment', { name: 'Operation to fix the wrist with a plate', date: day(-106), effect: 'Helped a lot', note: '' });
  add('ex-treat-physio', 'treatment', { name: 'Physiotherapy', date: day(-30), effect: 'Helped a little', note: 'Grip is getting stronger.' });
  add('ex-med-cocodamol', 'medication', blank('medication', {
    name: 'Co-codamol',
    forWhat: 'Pain',
    status: 'Stopped',
    dose: '30/500',
    often: 'Four times a day',
    started: day(-118),
    effect: 'Helped a lot',
    sideEffects: 'Constipation and drowsiness.',
  }));
  add('ex-med-naproxen', 'medication', blank('medication', {
    name: 'Naproxen',
    forWhat: 'Pain and swelling',
    status: 'Still taking',
    dose: '500 mg',
    often: 'Twice a day',
    started: day(-60),
    effect: 'Helped a little',
  }));
  add('ex-med-private', 'medication', blank('medication', { name: 'PRIVATE: Sertraline', forWhat: 'PRIVATE: mood', status: 'Still taking' }), true);

  add('ex-cost-taxi', 'cost', {
    kind: 'expense',
    date: day(-90),
    dateTo: '',
    item: 'Taxis to hospital and physio',
    amountPence: 18640,
    evidence: 'Receipts in the blue folder',
    documentId: 'ex-doc-receipt',
  });
  add('ex-cost-brace', 'cost', blank('cost', { kind: 'expense', date: day(-100), item: 'Wrist brace', amountPence: 2499 }));
  add('ex-cost-wages', 'cost', blank('cost', {
    kind: 'income',
    date: day(-119),
    dateTo: day(-40),
    item: 'Wages while off sick, after sick pay',
    amountPence: 214000,
    evidence: 'Payslips',
  }));
  add('ex-cost-private', 'cost', blank('cost', { kind: 'expense', date: day(-10), item: 'PRIVATE: loan from my brother', amountPence: 50000 }), true);

  add('ex-contact-solicitor', 'contact', { organisation: 'Hartley & Shah Solicitors', role: 'Case handler: Jo Hartley', reference: 'PI/2231', phoneOrEmail: '0113 496 0000' });
  add('ex-contact-hr', 'contact', { organisation: 'Northgate Distribution HR', role: 'HR adviser', reference: '', phoneOrEmail: 'hr@example.com' });
  add('ex-contact-private', 'contact', { organisation: 'PRIVATE: my GP about my mood', role: '', reference: '', phoneOrEmail: '0113 496 0999' }, true);

  add('ex-qn-1', 'quickNote', { text: 'Physio says to squeeze the stress ball ten times, three times a day.', filedTo: { section: 'treatment', impactArea: null }, photoFileId: null });
  add(
    'ex-qn-2',
    'quickNote',
    { text: 'Ask the fracture clinic about going back to lifting at work. Photo of the exercise sheet.', filedTo: null, photoFileId: 'ex-file-photo' },
    false,
    { name: 'exercise-sheet.png', type: 'image/png', text: examplePhoto, base64: true },
  );
  add('ex-qn-private', 'quickNote', { text: 'PRIVATE: argued with my partner about money again.', filedTo: { section: 'impact', impactArea: 'money' }, photoFileId: null }, true);

  return { recordName: 'Example: fall at work (made up)', personName: 'Sam Taylor', entries };
}

/** The example as stored items, with fixed IDs, for tests. */
export function exampleItems(today: string, recordId = 'ex-record'): AnyItem[] {
  const ex = exampleRecord(today);
  const stamp = `${shift(today, -1)}T12:00:00.000Z`;
  const meta = {
    id: recordId,
    recordId,
    type: 'recordMeta',
    schema: 1,
    private: false,
    data: { name: ex.recordName, impactCurrentSince: shift(today, -100) },
    createdAt: stamp,
    updatedAt: stamp,
  } as AnyItem;
  return [
    meta,
    ...ex.entries.map(
      (e, i) =>
        ({
          id: e.id,
          recordId,
          type: e.type,
          schema: 1,
          private: e.private,
          data: e.data,
          createdAt: `${shift(today, -120 + i)}T12:00:00.000Z`,
          updatedAt: `${shift(today, -120 + i)}T12:00:00.000Z`,
        }) as AnyItem,
    ),
  ];
}
