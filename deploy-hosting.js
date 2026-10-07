const path = require('path');
const nodeDir = 'C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Packages\\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\\node-v24.19.0-win-x64';
const client = require(path.join(nodeDir, 'node_modules/firebase-tools'));
const auth = require(path.join(nodeDir, 'node_modules/firebase-tools/lib/auth'));
const Configstore = require(path.join(nodeDir, 'node_modules/firebase-tools/node_modules/configstore'));
const configstore = new Configstore('firebase-tools');

async function main() {
  const authCode = process.argv[2];
  if (authCode) {
    const state = configstore.get('tempLoginState');
    if (!state || !state.codeVerifier) {
      console.error('No pending login session found.');
      process.exit(1);
    }
    console.log('Completing authentication with Google Firebase...');
    const result = await auth.loginRemotelyComplete(authCode.trim(), state.codeVerifier);
    auth.recordCredentials(result);
    configstore.delete('tempLoginState');
    console.log('Successfully logged in as:', result.user ? result.user.email : 'authenticated user');
  }

  console.log('Deploying to Firebase Hosting (project: my-career-company)...');
  await client.deploy({
    project: 'my-career-company',
    only: 'hosting',
    cwd: __dirname
  });
  console.log('SUCCESS: Deployment to www.mycareercompany.com complete!');
}

main().catch((err) => {
  console.error('Deployment error:', err.message || err);
  process.exit(1);
});
