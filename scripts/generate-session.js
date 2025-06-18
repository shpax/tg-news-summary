const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function generateSession() {
  try {
    const apiId = await new Promise((resolve) =>
      rl.question('Enter your API ID: ', resolve)
    );

    const apiHash = await new Promise((resolve) =>
      rl.question('Enter your API Hash: ', resolve)
    );

    console.log('\nConnecting to Telegram...');

    const session = new StringSession('');
    const client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () =>
        new Promise((resolve) =>
          rl.question(
            'Enter your phone number (with country code, e.g., +1234567890): ',
            resolve
          )
        ),
      password: async () =>
        new Promise((resolve) =>
          rl.question('Enter your 2FA password (if enabled): ', resolve)
        ),
      phoneCode: async () =>
        new Promise((resolve) =>
          rl.question(
            'Enter the verification code sent to your phone: ',
            resolve
          )
        ),
      onError: (err) => {
        console.error('Error:', err);
      },
    });

    const sessionString = client.session.save();

    console.log('\n✅ Success! Your session string is:');
    console.log('────────────────────────────────────────');
    console.log(sessionString);
    console.log('────────────────────────────────────────');
    console.log('\nAdd this to your .env file as TELEGRAM_SESSION_STRING');
    console.log('\n⚠️  Keep this session string secure and private!');

    await client.disconnect();
  } catch (error) {
    console.error('\n❌ Error generating session:', error.message);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  console.log('🔐 Telegram Session String Generator');
  console.log('═══════════════════════════════════════\n');
  console.log(
    'This script will help you generate a session string for your Telegram account.'
  );
  console.log(
    "You'll need your API ID and API Hash from https://my.telegram.org/apps\n"
  );

  generateSession().catch(console.error);
}

module.exports = { generateSession };
