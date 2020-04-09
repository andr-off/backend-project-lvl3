import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import { URL } from 'url';
import axiosDebug from 'axios-debug-log';
import debug from 'debug';
import Listr from 'listr';
import _ from 'lodash';

const pageLoaderDbg = debug('page-loader:main');
const axiosDbg = debug('page-loader:http');
const errorDbg = debug('page-loader:error');

axiosDebug.addLogger(axios, axiosDbg);

const tagToAttr = {
  script: 'src',
  link: 'href',
  img: 'src',
};

const normalizeLink = (urlObj) => {
  const { hostname, pathname } = urlObj;
  const pathObj = path.parse(pathname);
  const { dir, name, ext } = pathObj;

  if (ext === '') {
    const normalizedLink = `${hostname}${pathname}`;

    return _.trim(normalizedLink, '/');
  }

  return path.join(dir, name).slice(1);
};

const replaceNonAlphaNumericSymbolsForDashes = (str) => str.replace(/[\W]/g, '-');

const urlToName = (urlObj) => {
  const normalizedLink = normalizeLink(urlObj);
  const { ext } = path.parse(urlObj.pathname);
  const name = replaceNonAlphaNumericSymbolsForDashes(normalizedLink);

  return ext === '' ? `${name}.html` : `${name}${ext}`;
};

const urlToDirName = (urlObj) => {
  const normalizedLink = normalizeLink(urlObj);
  const name = replaceNonAlphaNumericSymbolsForDashes(normalizedLink);

  return `${name}_files`;
};

const isAlreadyExistsError = (err) => err.code === 'EEXIST';

const getLocalLinksAndHtmlWithChangedLinks = (html, selectors, origin, pathToDirectory) => {
  const $ = cheerio.load(html);

  const nodesWithLocalLinks = selectors
    .flatMap((selector) => $(selector).toArray())
    .filter((node) => {
      const attr = tagToAttr[node.tagName];
      const link = $(node).attr(attr);
      const url = new URL(link, origin);

      return url.origin === origin;
    });

  const localUrls = nodesWithLocalLinks
    .map((node) => {
      const attr = tagToAttr[node.tagName];

      return $(node).attr(attr);
    })
    .map((link) => new URL(link, origin));

  const localPaths = localUrls
    .map(urlToName)
    .map((name) => path.join(pathToDirectory, name));

  nodesWithLocalLinks.forEach((node, i) => {
    const attr = tagToAttr[node.tagName];
    $(node).attr(attr, localPaths[i]);
  });

  return [localUrls, $.html()];
};

const saveFile = (filepath, data) => fs.writeFile(filepath, data)
  .then(() => {
    pageLoaderDbg(`'${filepath}' was created`);
  });

export default (pageLink, destDirPath) => {
  const pageUrl = new URL(pageLink);
  const dirName = urlToDirName(pageUrl, true);
  const dirPath = path.join(destDirPath, dirName);

  const tags = Object
    .entries(tagToAttr)
    .map(([tagName, attribute]) => `${tagName}[${attribute}]`);

  let localUrls;

  return axios.get(pageUrl.toString())
    .then(({ data }) => {
      const html = data;

      const [
        urls,
        resultHtml,
      ] = getLocalLinksAndHtmlWithChangedLinks(html, tags, pageUrl.origin, dirName);

      localUrls = urls;

      const pageName = urlToName(pageUrl);
      const fullFilePath = path.join(destDirPath, pageName);

      return saveFile(fullFilePath, resultHtml);
    })
    .then(() => {
      if (_.isEmpty(localUrls)) {
        return Promise.resolve();
      }

      return fs.mkdir(dirPath);
    })
    .then(() => {
      if (_.isEmpty(localUrls)) {
        return Promise.resolve();
      }

      pageLoaderDbg(`'${dirPath}' was created`);

      const tasks = localUrls.map((url) => ({
        title: url.toString(),
        task: () => axios.get(url.toString(), { responseType: 'arraybuffer' })
          .then((response) => {
            const fileName = urlToName(url);
            const filepath = path.join(dirPath, fileName);
            return saveFile(filepath, response.data);
          }),
      }));

      const list = new Listr(tasks, { concurrent: true });

      return list.run();
    })
    .catch((err) => {
      if (isAlreadyExistsError(err)) {
        throw new Error('It seems like the page was downloaded');
      }

      errorDbg(err.message);

      throw err;
    });
};
