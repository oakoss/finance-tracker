import { serialize } from 'cookie';
import Cookies from 'universal-cookie';

type CookieOptions = {
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
  domain?: string;
};

const defaultOptions: CookieOptions = {
  path: '/',
};

export const createClientCookies = () => new Cookies(undefined, defaultOptions);

export const createServerCookies = (cookieHeader: string | null | undefined) =>
  new Cookies(cookieHeader ?? '', defaultOptions);

export const setClientCookie = (
  name: string,
  value: string,
  options: CookieOptions = defaultOptions,
) => {
  const cookies = createClientCookies();
  cookies.set(name, value, options);
};

export const setServerCookie = (
  cookieHeader: string | null | undefined,
  name: string,
  value: string,
  options: CookieOptions = defaultOptions,
) => {
  const cookies = createServerCookies(cookieHeader);
  cookies.set(name, value, options);
  return cookies;
};

export const serializeServerCookie = (
  name: string,
  value: string,
  options: CookieOptions = defaultOptions,
) => {
  return [serialize(name, value, options)];
};

export const appendSetCookieHeaders = (
  headers: Headers,
  setCookieHeaders: string[],
) => {
  for (const header of setCookieHeaders) {
    headers.append('Set-Cookie', header);
  }
};
