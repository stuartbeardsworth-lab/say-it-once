// Sending sign-in codes by email. The provider (an EU-based one, chosen in
// Stage 8b) is plugged in behind this interface. The message holds the code
// and nothing about the person's record.

export interface Mailer {
  sendSignInCode(email: string, code: string): Promise<void>;
}

/** For tests and local use: keeps the messages instead of sending them. */
export class MemoryMailer implements Mailer {
  readonly sent: { email: string; code: string }[] = [];

  async sendSignInCode(email: string, code: string): Promise<void> {
    this.sent.push({ email, code });
  }

  lastCodeFor(email: string): string | undefined {
    return this.sent.filter((m) => m.email === email.toLowerCase()).at(-1)?.code;
  }
}

export function signInEmail(code: string): { subject: string; text: string } {
  return {
    subject: `Your Say It Once code: ${code}`,
    text: [
      `Your code is ${code}`,
      '',
      'Type it into Say It Once to sign in. It works for 10 minutes.',
      '',
      'If you didn’t ask for this, you can ignore this email. Nobody can sign in without the code.',
    ].join('\n'),
  };
}
