import { execSync } from 'child_process';
import GitRemoteHelper, { ApiConnect, logError } from './GitRemoteHelper';

// const handlePush: ApiBoth['handlePush'] = async ({ refs }) => {
//     // Implement push logic using Git CLI command
//     refs.forEach(({ src, dst, force }) => {
//         const pushCommand = force ? 'git push -f' : 'git push';
//         const command = `${pushCommand} ${src}:${dst}`;
//         // logError(`Executing '${pushCommand}'`);
//         execSync(command, { stdio: 'inherit' });
//     });
//     return 'Push successful!';
// };

// const handleFetch: ApiBoth['handleFetch'] = async ({ refs }) => {
//     // Implement fetch logic using Git CLI command
//     refs.forEach(({ ref, oid }) => {
//         const fetchCommand = `git fetch ${oid} ${ref}`;
//         // logError(`Executing '${fetchCommand}'`);
//         execSync(fetchCommand, { stdio: 'inherit' });
//     });
//     return 'Fetch successful!';
// };

const api: ApiConnect = {
    handleConnect: async ({ remoteUrl, gitCommand }) => {
        // Implement connect logic using Git CLI command
        const connectCommand = `${gitCommand} ${remoteUrl}`;
        logError(`Executing '${connectCommand}'`);
        const result = execSync(connectCommand).toString();
        return result;
    },
};

const env = process.env;
const stdin = process.stdin;
const stdout = process.stdout;

GitRemoteHelper({ env, api, stdin, stdout });
