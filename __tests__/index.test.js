import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import debug from 'debug';
import downloadPage from '../src';

nock.disableNetConnect();

const getFixturePath = (name) => path.join(__dirname, '../__fixtures__', name);

let tempDirPath;
let downloadedHtmlFilePath;
let downloadedCssFilePath;
let downloadedJsFilePath;
let downloadedImgFilePath;

const nockDbg = debug('page-loader:nock');

const downloadedPageHost = 'https://ru.hexlet.io';
const downloadedPagePath = '/courses';
const downloadedPageUrl = new URL(downloadedPagePath, downloadedPageHost);
const downloadedPageLink = downloadedPageUrl.toString();

const dirName = 'ru-hexlet-io-courses_files';

const testPageFilePath = getFixturePath('testPage.html');
const downloadedPageName = 'ru-hexlet-io-courses.html';
const expectedHtmlFilePath = getFixturePath('expected.html');

const cssFilePath = '/css/style.css';
const downloadedCssFileName = 'css-style.css';
const expectedCssFilePath = getFixturePath(cssFilePath);

const jsFilePath = '/js/script.js';
const downloadedJsFileName = 'js-script.js';
const expectedJsFilePath = getFixturePath(jsFilePath);

const imgFilePath = '/images/logo.jpeg';
const downloadedImgFileName = 'images-logo.jpeg';
const expectedImgFilePath = getFixturePath(imgFilePath);

beforeEach(async () => {
  tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  downloadedHtmlFilePath = path.join(tempDirPath, downloadedPageName);
  downloadedCssFilePath = path.join(tempDirPath, dirName, downloadedCssFileName);
  downloadedJsFilePath = path.join(tempDirPath, dirName, downloadedJsFileName);
  downloadedImgFilePath = path.join(tempDirPath, dirName, downloadedImgFileName);

  nock.cleanAll();
});

test('should work', async () => {
  nock(downloadedPageHost)
    .get(downloadedPagePath)
    .replyWithFile(200, testPageFilePath, { 'Content-Type': 'text/html' })
    .get(imgFilePath)
    .replyWithFile(200, expectedImgFilePath, { 'Content-Type': 'image/jpeg' })
    .get(cssFilePath)
    .replyWithFile(200, expectedCssFilePath, { 'Content-Type': 'text/css' })
    .get(jsFilePath)
    .replyWithFile(200, expectedJsFilePath, { 'Content-Type': 'text/javascript' })
    .log(nockDbg);

  await downloadPage(downloadedPageLink, tempDirPath);

  const expectedHtml = await fs.readFile(expectedHtmlFilePath, 'utf-8');
  const downloadedHtml = await fs.readFile(downloadedHtmlFilePath, 'utf-8');

  const expectedCss = await fs.readFile(expectedCssFilePath, 'utf-8');
  const downloadedCss = await fs.readFile(downloadedCssFilePath, 'utf-8');

  const expectedJs = await fs.readFile(expectedJsFilePath, 'utf-8');
  const downloadedJs = await fs.readFile(downloadedJsFilePath, 'utf-8');

  const expectedImg = await fs.readFile(expectedImgFilePath);
  const downloadedImg = await fs.readFile(downloadedImgFilePath);

  expect(downloadedHtml).toBe(expectedHtml.trimEnd());
  expect(downloadedCss).toBe(expectedCss);
  expect(downloadedJs).toBe(expectedJs);
  expect(downloadedImg).toStrictEqual(expectedImg);
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
    nock(downloadedPageHost)
      .get(downloadedPagePath)
      .replyWithFile(200, testPageFilePath, { 'Content-Type': 'text/html' })
      .log(nockDbg);

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
        .get(imgFilePath)
        .replyWithFile(200, expectedImgFilePath, { 'Content-Type': 'image/jpeg' })
        .get(cssFilePath)
        .reply(404)
        .get(jsFilePath)
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
