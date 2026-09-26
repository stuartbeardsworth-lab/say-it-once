import { Button } from '../components/Button';
import { RouteLink } from '../router';
import { PageTop } from '../shell/PageTop';
import { TryExample } from '../features/example/TryExample';

// Four steps (docs/spec.md, "journey"), describing only what the app does,
// and a made-up record to try things with.

export function HowToUse() {
  return (
    <>
      <PageTop />
      <h1 tabIndex={-1}>How to use Say It Once</h1>
      <ol className="steps">
        <li>
          <h2>Record it</h2>
          <p>
            Write down what happened and how it affects you, in your own words. A few words are enough. Use a Quick Note
            when you just want to get something down.
          </p>
        </li>
        <li>
          <h2>Keep it together</h2>
          <p>Add appointments, treatment, costs, letters and contacts as they happen. Photos of letters are kept too.</p>
        </li>
        <li>
          <h2>Find it</h2>
          <p>Use Find in my record to look up anything, whenever you’re asked.</p>
        </li>
        <li>
          <h2>Use it</h2>
          <p>
            When you need to, Use my record puts together a report for a solicitor, your employer, the DWP or a doctor.
            You choose exactly what goes in, then share or save it as a PDF or a zip file. Anything marked private is
            always left out.
          </p>
        </li>
      </ol>
      <TryExample />
      <div className="button-row no-print">
        <Button onPress={() => window.print()}>Print this guide</Button>
      </div>
      <p className="no-print">
        More help: <RouteLink to="faq">Questions and answers</RouteLink>
      </p>
    </>
  );
}
