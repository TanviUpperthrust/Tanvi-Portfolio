import nodemailer from 'nodemailer';

// Returns a notifier for new contact messages. When SMTP isn't configured it
// resolves to false, and the message simply lives in the admin inbox.
export function createMailer(smtp) {
  if (!smtp.host) {
    return { enabled: false, notifyNewMessage: async () => false };
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  async function notifyNewMessage(msg) {
    const lines = [`From: ${msg.name} <${msg.email}>`];
    if (msg.topic) lines.push(`Project type: ${msg.topic}`);
    if (msg.budget) lines.push(`Budget: ${msg.budget}`);
    lines.push('', msg.message);

    await transport.sendMail({
      from: smtp.from,
      to: smtp.to,
      replyTo: { name: msg.name, address: msg.email },
      subject: `New enquiry from ${msg.name}${msg.topic ? ` · ${msg.topic}` : ''}`,
      text: lines.join('\n'),
    });
    return true;
  }

  return { enabled: true, notifyNewMessage };
}
