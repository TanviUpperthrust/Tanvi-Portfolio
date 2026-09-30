import { loadConfig } from './src/config.js';
import { openDatabase } from './src/db.js';
import { createMailer } from './src/mail.js';
import { createApp } from './src/app.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
const mailer = createMailer(config.smtp);
const app = createApp({ config, db, mailer });

const server = app.listen(config.port, () => {
  console.log(`Portfolio running at http://localhost:${config.port}`);
  console.log(`Admin panel:        http://localhost:${config.port}/admin`);
  if (!mailer.enabled) console.log('Email notifications off (no SMTP_HOST); messages are saved to the admin inbox.');
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
