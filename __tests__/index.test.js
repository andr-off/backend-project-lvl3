import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import debug from 'debug';

import downloadPage from '../src';

nock.disableNetConnect();

const getFixturePath = (name) => path.join(__dirname, '../__fixtures__', name);

let tempDirPath;
let htmlFilePath;
let cssFilePath;
let jsFilePath;
let imgFilePath;

const nockDbg = debug('page-loader:nock');

const downloadedPageHost = 'https://ru.hexlet.io';
const downloadedPagePath = '/courses';
const downloadedPageUrl = new URL(downloadedPagePath, downloadedPageHost);
const downloadedPageLink = downloadedPageUrl.toString();

const dirName = 'ru-hexlet-io-courses_files';

const testPageFilePath = getFixturePath('testPage.html');
const downloadedPageName = 'ru-hexlet-io-courses.html';
const expectedHtmlFilePath = getFixturePath('expected.html');

const cssPath = '/css/style.css';
const cssName = 'css-style.css';
const expectedCssFilePath = getFixturePath(cssPath);

const jsPath = '/js/script.js';
const jsName = 'js-script.js';
const expectedJsFilePath = getFixturePath(jsPath);

const imgPath = '/images/logo.jpeg';
const imgName = 'images-logo.jpeg';
const expectedImgFilePath = getFixturePath(imgPath);

beforeEach(async () => {
  tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  htmlFilePath = path.join(tempDirPath, downloadedPageName);
  cssFilePath = path.join(tempDirPath, dirName, cssName);
  jsFilePath = path.join(tempDirPath, dirName, jsName);
  imgFilePath = path.join(tempDirPath, dirName, imgName);

  // nock.cleanAll();
});

test('should work', async () => {
  nock(downloadedPageHost)
    .get(downloadedPagePath)
    .replyWithFile(200, testPageFilePath, { 'Content-Type': 'text/html' })
    .get(imgPath)
    .replyWithFile(200, expectedImgFilePath, { 'Content-Type': 'image/jpeg' })
    .get(cssPath)
    .replyWithFile(200, expectedCssFilePath, { 'Content-Type': 'text/css' })
    .get(jsPath)
    .replyWithFile(200, expectedJsFilePath, { 'Content-Type': 'text/javascript' })
    .log(nockDbg);

  await downloadPage(downloadedPageLink, tempDirPath);

  const expectedHtml = await fs.readFile(expectedHtmlFilePath, 'utf-8');
  const html = await fs.readFile(htmlFilePath, 'utf-8');

  const expectedCss = await fs.readFile(expectedCssFilePath, 'utf-8');
  const css = await fs.readFile(cssFilePath, 'utf-8');

  const expectedJs = await fs.readFile(expectedJsFilePath, 'utf-8');
  const js = await fs.readFile(jsFilePath, 'utf-8');

  const expectedImg = await fs.readFile(expectedImgFilePath);
  const img = await fs.readFile(imgFilePath);

  expect(html).toBe(expectedHtml.trimEnd());
  expect(css).toBe(expectedCss);
  expect(js).toBe(expectedJs);
  expect(img).toStrictEqual(expectedImg);
});

const fsErrorCases = [
  [
    'bad path to directory',
    '/wrong/dir/path',
    'no such file or directory',
  ],
  [
    'path to direcotory is path to file',
    expectedImgFilePath,
    'not a directory',
  ],
  [
    'permission denied',
    '/root',
    'permission denied',
  ],
];

test.each(fsErrorCases)(
  '%s',
  async (testName, dirpath, errorMessage) => {
    await expect(downloadPage(downloadedPageLink, dirpath)).rejects.toThrow(errorMessage);
  },
);

const requestErrorCases = [
  [
    'response with status code 404',
    () => {
      nock(downloadedPageHost)
        .get(downloadedPagePath)
        .replyWithFile(200, testPageFilePath, { 'Content-Type': 'text/html' })
        .get(imgPath)
        .replyWithFile(200, expectedImgFilePath, { 'Content-Type': 'image/jpeg' })
        .get(cssPath)
        .reply(404)
        .get(jsPath)
        .replyWithFile(200, expectedJsFilePath, { 'Content-Type': 'text/javascript' })
        .log(nockDbg);
    },
    'Request failed with status code 404',
  ],
  [
    'response with status code 500',
    () => {
      nock(downloadedPageHost)
        .get(downloadedPagePath)
        .reply(500)
        .log(nockDbg);
    },
    'Request failed with status code 500',
  ],
  [
    'page not found',
    () => {
      nock(downloadedPageHost)
        .get(downloadedPagePath)
        .replyWithError('Not found')
        .log(nockDbg);
    },
    'Not found',
  ],
];

test.each(requestErrorCases)(
  '%s',
  async (testName, func, errorMessage) => {
    func();

    await expect(downloadPage(downloadedPageLink, tempDirPath)).rejects.toThrow(errorMessage);
  },
);
