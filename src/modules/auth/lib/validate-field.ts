import { type } from 'arktype';

const emailType = type('string.email').configure({ actual: () => '' });
const nameType = type('string > 0');
const passwordType = type('string > 0');

export { emailType, nameType, passwordType };
