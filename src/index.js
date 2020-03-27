import axios from 'axios';
import { promises as fs, constants } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import { URL } from 'url';
import axiosDebug from 'axios-debug-log';
import debug from 'debug';

const pageLoaderDbg = debug('page-loader:main');
const axiosDbg = debug('page-loader:http');
const errorDbg = debug('page-loader:error');

axiosDebug.addLogger(axios, axiosDbg);

axiosDebug({
  request: (dbg, config) => {
    dbg(`Request to '${config.url}'`);
  },
  response: (dbg, response) => {
    const headers = response.headers['content-type'];
    dbg(`Response with '${headers}' from '${response.config.url}'`);
  },
  error: () => {},
});

const tagToAttr = {
  script: 'src',
  link: 'href',
  img: 'src',
};

const getLinksFromHTML = (html, selectors) => {
  const $ = cheerio.load(html);

  const nodes = selectors
    .reduce((acc, selector) => acc.concat($(selector).toArray()), []);

  const links = nodes.map((node) => {
    const attr = tagToAttr[node.tagName];

    return $(node).attr(attr);
  });

  return links;
};

const normalizeLink = (urlObj) => {
  const { hostname, pathname } = urlObj;
  const pathObj = path.parse(pathname);
  const { dir, name, ext } = pathObj;

  if (ext === '') {
    const normalizedLink = `${hostname}${pathname}`;

    return normalizedLink.endsWith('/') ? normalizedLink.slice(0, -1) : normalizedLink;
  }

  return path.join(dir, name).slice(1);
};

const urlToName = (urlObj, isDir = false) => {
  const normalizedLink = normalizeLink(urlObj);
  const { ext } = path.parse(urlObj.pathname);

  const name = normalizedLink.replace(/[^a-zA-Z0-9]/g, '-');

  if (isDir) {
    return `${name}_files`;
  }

  return ext === '' ? `${name}.html` : `${name}${ext}`;
};

const isEmpty = (collection) => collection.length === 0;

const changeUrlsToPaths = (html, selectors, urlObjs, paths) => {
  const $ = cheerio.load(html);

  const nodes = selectors
    .reduce((acc, selector) => acc.concat($(selector).toArray()), []);

  const urls = urlObjs.map(({ pathname }) => pathname);

  const withLocalLinkNodes = nodes.filter((node) => {
    const attr = tagToAttr[node.tagName];
    const link = $(node).attr(attr);

    return urls.includes(link);
  });

  withLocalLinkNodes.forEach((node, i) => {
    const attr = tagToAttr[node.tagName];
    $(node).attr(attr, paths[i]);
  });

  return $.html();
};

export default (pageLink, destDirPath) => {
  const pageUrl = new URL(pageLink);
  const dirName = urlToName(pageUrl, true);
  const dirPath = path.join(destDirPath, dirName);

  const tags = ['script[src]', 'link[href]', 'img[src]'];
  const fileNames = [];
  let localUrls;
  let html;
  let contents;

  return fs.access(destDirPath, constants.W_OK)
    .then(() => fs.stat(destDirPath))
    .then((stats) => {
      if (stats.isFile()) {
        const message = `ENOTDIR: not a directory, '${destDirPath}'`;

        throw new Error(message);
      }
    })
    .then(() => axios.get(pageUrl.toString()))
    .then((response) => {
      html = response.data;

      const links = getLinksFromHTML(html, tags);
      const urls = links.map((link) => new URL(link, pageUrl.origin));

      localUrls = urls.filter((url) => url.origin === pageUrl.origin);


      const responseConfig = { responseType: 'arraybuffer' };
      const promises = localUrls.map((url) => axios.get(url.toString(), responseConfig));

      return Promise.all(promises);
    })
    .then((responses) => {
      contents = responses;

      if (isEmpty(contents)) {
        return Promise.resolve();
      }

      return fs.mkdir(dirPath);
    })
    .then(() => {
      if (isEmpty(contents)) {
        return Promise.resolve();
      }

      pageLoaderDbg(`'${dirPath}' was created`);

      const promises = contents.map(({ data }, i) => {
        const fileName = urlToName(localUrls[i]);

        fileNames.push(fileName);

        const filepath = path.join(dirPath, fileName);
        pageLoaderDbg(`'${filepath}' was created`);

        return fs.writeFile(filepath, data);
      });

      return Promise.all(promises);
    })
    .then(() => {
      const names = localUrls.map((url) => urlToName(url));
      const paths = names.map((name) => path.join(dirName, name));

      const result = changeUrlsToPaths(html, tags, localUrls, paths);

      const pageName = urlToName(pageUrl);
      const fullFilePath = path.join(destDirPath, pageName);

      pageLoaderDbg(`Page was downloaded as '${pageName}'`);

      return fs.writeFile(fullFilePath, result);
    })
    .catch((err) => {
      errorDbg(err.message);

      throw err;
    });
};
