import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const linkToName = (link) => {
  const urlObj = url.parse(link);
  const urlPathname = urlObj.pathname;
  const urlPathnameLastIndex = urlPathname.length - 1;

  const urlPathnameWithoutLastSlash = urlObj.pathname[urlPathnameLastIndex] === '/'
    ? urlObj.pathname.slice(0, -1)
    : urlObj.pathname;

  const urlSearch = urlObj.search || '';

  const normalizedLink = `${urlObj.host}${urlPathnameWithoutLastSlash}${urlSearch}`;
  const symbols = ['_', '/', '$', '.', '~', '?', '=', '&'];
  const name = normalizedLink
    .split('')
    .map((char) => (symbols.includes(char) ? '-' : char))
    .join('');

  return `${name}.html`;
};

export default (link, filepath) => {
  return axios.get(link)
    .then((response) => {
      const fullpath = path.join(filepath, linkToName(link));

      return fs.writeFile(fullpath, response.data);
    })
    .catch((err) => console.log(err));
};
