# Putting Say It Once on Google Play

Say It Once goes on Google Play as a small Android "wrapper" (a Trusted Web
Activity) that opens the real app, https://say-it-once-home.netlify.app,
full screen with no browser bar. The app itself doesn't change. Updates still
go out through Netlify, so you only upload a new Play Store version if the
wrapper itself changes (a new name, icon or web address).

Everything below is ready except the parts marked **You**. The only cost is
Google's one-off **US $25** registration fee.

## What's already done

- **Privacy policy page**: https://say-it-once-home.netlify.app/privacy-policy.html
  (the file is `public/privacy-policy.html`; it's also linked from Privacy &
  backup in the app). Google asks for this link.
- **App manifest**: name, icons (including the "maskable" one Android needs),
  colours, a fixed app id and categories.
- **Store images** in `docs/play-store/`:
  - `1-home.png`, `2-quick-note.png`, `3-keep-track.png`, `4-report.png`:
    phone screenshots, 1080 × 1920, using the made-up example record;
  - `feature-graphic.png`: the 1024 × 500 banner;
  - the 512 × 512 icon is `public/icon-512.png`.
  To remake them after the app changes, see the top of
  `scripts/store-images.mjs`.
- **Store wording, Data safety answers and form answers**: below.

## Step 1 (You): a contact email just for Say It Once

Google shows a contact email on the store listing, publicly. You didn't want
your own email in the app, so make a new free address only for this, for
example a Gmail or Proton Mail account called something like
`sayitonce.help@…`. Use it in the steps below.

## Step 2 (You): a Google Play developer account

1. Go to https://play.google.com/console/signup, signed in with a Google
   account (it can be the new one).
2. Choose **Yourself** (a personal account).
3. Pay the US $25 fee, and complete Google's identity check (a photo of your
   ID). This can take a few days.

## Step 3 (You, about 20 minutes): make the Android package with PWABuilder

PWABuilder is a free tool from Microsoft that turns a web app into a Play
Store package.

1. Go to https://www.pwabuilder.com and enter
   `https://say-it-once-home.netlify.app`, then **Start**.
2. It checks the app. It should score well on the manifest and offline
   support. (If it suggests extra things such as "shortcuts", ignore them.)
3. Choose **Package for stores**, then **Android**, then **Generate package**
   with **Google Play** selected. Before generating, open **All settings**
   and set:
   - **Package ID**: `uk.sayitonce.app`. This can never be changed later.
   - **App name**: `Say It Once`; **Launcher name**: `Say It Once`.
   - **App version**: `1.0.0`; **App version code**: `1`.
   - **Signing key**: **Create new**. Fill in your name and "Say It Once"
     as the organisation. Choose a long password and write it down.
   - Leave everything else as it is.
4. Download the zip. It contains:
   - `app-release-bundle.aab`: the file you upload to Google Play;
   - `signing.keystore` and `signing-key-info.txt`: **the key and its
     password. Keep both somewhere safe, with a second copy** (for example in
     a password manager and on a USB stick). You need them for every update;
   - `assetlinks.json`: send this to me (next step).

## Step 4 (me): prove the app and the website belong together

Android only opens the app full screen (without a browser bar) if the website
lists the app's key. When you send me `assetlinks.json`, I add it to the site
as `/.well-known/assetlinks.json`. After Step 5, Google shows a second key
fingerprint (Play Console → your app → **Test and release** → **App
integrity** → **App signing key certificate** → **SHA-256**). Send me that too
and I'll add it, so both work.

## Step 5 (You): create the app in the Play Console

**Create app**: name `Say It Once`, language English (United Kingdom), **App**,
**Free**, and tick the declarations.

Then work through **Set up your app**. The answers:

| Question | Answer |
| --- | --- |
| Privacy policy | `https://say-it-once-home.netlify.app/privacy-policy.html` |
| App access | All functionality is available without special access (no login). |
| Ads | No, my app does not contain ads. |
| Content rating | Fill in the questionnaire with your contact email. Category: **All other app types**. Answer **No** to every question (no violence, sexual content, gambling, user-to-user chat or location sharing). It should come out as suitable for everyone. |
| Target audience | **18 and over** only. |
| News app | No. |
| Data safety | See below. |
| Government app | No. |
| Financial features | None. |
| Health apps | Tick the option about **personal health records or tracking** (the exact wording changes; choose the one closest to "keeping a personal record of health information"). Don't tick anything about diagnosis, treatment, clinical use or medical devices: Say It Once doesn't do those. |
| App category | **Medical** (or Health & Fitness, if you prefer). |
| Contact details | The new email from Step 1. Website: `https://say-it-once-home.netlify.app`. Leave phone blank. |

### Data safety

Google counts data as "collected" only if it leaves the device. Say It Once
keeps everything on the device, so:

- **Does your app collect or share any of the required user data types?**
  No.
- That's the whole form. (If it asks about encryption in transit or deletion
  requests, those only apply to collected data, so they don't apply.)

This is true today. If sync is ever switched on, this form and the privacy
policy must be updated before that version goes out.

## Step 6 (You): the store listing

Under **Grow users** → **Store presence** → **Main store listing**:

**App name** (up to 30 characters)

> Say It Once

**Short description** (up to 80 characters)

> Keep your injury or illness record together, so you never have to start again.

**Full description**

> After an injury, accident or illness, you're asked the same questions again
> and again: by doctors, the DWP, your employer, a solicitor or an insurer.
> Say It Once lets you write it down once, keep it together, and use it
> whenever you need it.
>
> Record it
> • What happened, in your own words
> • How it affects your daily life, work and health, and how that changes
> • Appointments, treatment and medication
> • Costs and lost income
> • Letters, documents and photos
> • Contacts and reference numbers
> • Quick Notes, for jotting something down in a waiting room or straight
>   after an appointment, and filing it later
>
> Use it when you need it
> • Make a Summary, Evidence Pack or Full Record for a doctor, the DWP (for
>   example a PIP claim), a solicitor, an insurer or your employer
> • Save it as a PDF or a zip with your letters and photos, and share it
>   however you like
> • Anything you mark "Keep this private" is never included
>
> Private by design
> • Your record stays on your phone. There's no account and no sign-in.
> • No adverts, no tracking, nothing measured about how you use it.
> • Save a backup copy whenever you like, and restore it on a new phone.
>
> Made to be easy on a hard day
> • Short, calm wording, and a few words are always enough
> • Text size that makes everything bigger
> • Listen reads the screen aloud
> • Designed to work with screen readers, and works offline
>
> Say It Once keeps records and helps you organise them. It doesn't give
> medical, legal or benefits advice.

**Graphics**: the icon `public/icon-512.png`, the feature graphic
`docs/play-store/feature-graphic.png`, and the four phone screenshots from
`docs/play-store/`.

## Step 7 (You): the closed test, then going public

New personal developer accounts must run a **closed test with at least 12
testers for 14 days in a row** before they can publish to everyone.

1. **Test and release** → **Testing** → **Closed testing** → create a track,
   upload `app-release-bundle.aab`, and add your testers' Google account
   emails (a Google Group or an email list).
2. Send testers the opt-in link Google gives you. They install from the Play
   Store and keep it installed for the 14 days.
3. After 14 days, **Apply for production**. Google asks a few questions
   about the test; answer honestly. Review usually takes a few days.

## Things to know

- **Where the record lives.** In the Play Store app, the record is kept in
  Chrome's storage on the phone for this website. So the Play Store app and
  the website opened in Chrome on the same phone share one record.
  Uninstalling Chrome, or clearing its data, deletes the record. The privacy
  policy says so, and backups are the safeguard.
- **The web address is built in.** The Play Store app is tied to
  `say-it-once-home.netlify.app`. If the app ever moves to another web
  address, a new wrapper has to be made and uploaded.
- **The key.** Losing `signing.keystore` or its password means asking Google
  to reset the upload key, which takes days. Keep the two copies.
- **Updates.** Most changes go live through Netlify as now, with no new
  upload. A new upload is only needed for the wrapper itself: bump the
  version code in PWABuilder and sign with the same key.
- **Apple.** This guide is only for Google Play. Apple's App Store usually
  rejects apps that are a website in a wrapper, and costs US $99 a year.
  iPhone users can keep adding Say It Once to their home screen from Safari.
