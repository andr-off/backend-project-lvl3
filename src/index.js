import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import { URL } from 'url';

const tagToAttr = {
  script: 'src',
  link: 'href',
  img: 'src',
};

const getLinksFromHTML = (html) => {
  const $ = cheerio.load(html);
  const selectors = ['script[src]', 'link[href]', 'img[src]'];

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

export default (pageLink, destDirPath) => {
  const pageUrl = new URL(pageLink);
  const dirName = urlToName(pageUrl, true);
  const dirPath = path.join(destDirPath, dirName);
  const fileNames = [];
  let localUrls;
  let html;

  return fs.mkdir(dirPath)
    .then(() => axios.get(pageUrl.toString()))
    .then((response) => {
      html = response.data;

      const links = getLinksFromHTML(html);
      const urls = links.map((link) => new URL(link, pageUrl.origin));

      localUrls = urls.filter((url) => url.origin === pageUrl.origin);

      const responseConfig = { responseType: 'arraybuffer' };
      const promises = localUrls.map((url) => axios.get(url.toString(), responseConfig));

      return Promise.all(promises);
    })
    .then((responses) => {
      const promises = responses.map(({ data }, i) => {
        const fileName = urlToName(localUrls[i]);

        fileNames.push(fileName);

        const filepath = path.join(dirPath, fileName);

        return fs.writeFile(filepath, data);
      });

      return Promise.all(promises);
    })
    .then(() => {
      const selectors = ['script[src]', 'link[href]', 'img[src]'];
      const $ = cheerio.load(html);

      const nodes = selectors
        .reduce((acc, selector) => acc.concat($(selector).toArray()), []);

      const paths = localUrls.map((url) => url.pathname);

      const withLocalLinkNodes = nodes.filter((node) => {
        const attr = tagToAttr[node.tagName];
        const link = $(node).attr(attr);

        return paths.includes(link);
      });

      withLocalLinkNodes.forEach((node, i) => {
        const fileName = fileNames[i];
        const filePath = path.join(dirName, fileName);
        const attr = tagToAttr[node.tagName];
        $(node).attr(attr, filePath);
      });

      const pageName = urlToName(pageUrl);
      const fullFilePath = path.join(destDirPath, pageName);

      return fs.writeFile(fullFilePath, $.html());
    })
    .catch(console.log);
};
