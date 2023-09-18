import { execSync } from 'child_process';
import GitRemoteHelper, { ApiBoth } from './GitRemoteHelper';

const handlePush: ApiBoth['handlePush'] = async ({ refs }) => {
    // Implement push logic using Git CLI command
    refs.forEach(({ src, dst, force }) => {
        const pushCommand = force ? 'git push -f' : 'git push';
        const command = `${pushCommand} ${src}:${dst}`;
        execSync(command, { stdio: 'inherit' });
    });
    return 'Push successful!';
};

const handleFetch: ApiBoth['handleFetch'] = async ({ refs }) => {
    // Implement fetch logic using Git CLI command
    refs.forEach(({ ref, oid }) => {
        const fetchCommand = `git fetch ${oid} ${ref}`;
        execSync(fetchCommand, { stdio: 'inherit' });
    });
    return 'Fetch successful!';
};

const api: ApiBoth = {
    handlePush,
    handleFetch,
    list: async ({ forPush, remoteName, remoteUrl }) => {
        // Implement list logic using Git CLI command
        const listCommand = forPush
            ? `git remote show ${remoteName}`
            : `git ls-remote --heads ${remoteUrl}`;
        const result = execSync(listCommand).toString();
        return result;
    },
};

const env = process.env;
const stdin = process.stdin;
const stdout = process.stdout;

GitRemoteHelper({ env, api, stdin, stdout });
