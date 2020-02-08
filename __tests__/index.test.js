import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import downloadPage from '../src';

nock.disableNetConnect();

const getFixturePath = (name) => path.join(__dirname, '../__fixtures__', name);

const testPagePath = getFixturePath('testPage.html');

let tempDirPath;

beforeEach(async () => {
  tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('with pathname in url', async () => {
  const downloadedPageHost = 'https://hexlet.io';
  const downloadedPagePath = '/courses';
  const downloadedPageLink = `${downloadedPageHost}${downloadedPagePath}`;
  const downloadedPageName = 'hexlet-io-courses.html';
  const downloadedPageFilePath = path.join(tempDirPath, downloadedPageName);

  const testPageContent = await fs.readFile(testPagePath, 'utf-8');

  nock(downloadedPageHost)
    .get(downloadedPagePath)
    .reply(200, testPageContent);

  await downloadPage(downloadedPageLink, tempDirPath);

  const downloadedPageContent = await fs.readFile(downloadedPageFilePath, 'utf-8')
    .catch((err) => {
      console.log(err);
    });

  expect(testPageContent).toBe(downloadedPageContent);
});

test('without pathname in url', async () => {
  const downloadedPageHost = 'https://hexlet.io';
  const downloadedPagePath = '/';
  const downloadedPageLink = `${downloadedPageHost}${downloadedPagePath}`;
  const downloadedPageName = 'hexlet-io.html';
  const downloadedPageFilePath = path.join(tempDirPath, downloadedPageName);

  const testPageContent = await fs.readFile(testPagePath, 'utf-8');

  nock(downloadedPageHost)
    .get(downloadedPagePath)
    .reply(200, testPageContent);

  await downloadPage(downloadedPageLink, tempDirPath);

  const downloadedPageContent = await fs.readFile(downloadedPageFilePath, 'utf-8')
    .catch((err) => {
      console.log(err);
    });

  expect(testPageContent).toBe(downloadedPageContent);
});

test('with pathname and querystring in url', async () => {
  const downloadedPageHost = 'https://yandex.ru';
  const downloadedPagePath = '/search/?text=node.js';
  const downloadedPageLink = `${downloadedPageHost}${downloadedPagePath}`;
  const downloadedPageName = 'yandex-ru-search-text-node-js.html';
  const downloadedPageFilePath = path.join(tempDirPath, downloadedPageName);

  const testPageContent = await fs.readFile(testPagePath, 'utf-8');

  nock(downloadedPageHost)
    .get(downloadedPagePath)
    .reply(200, testPageContent);

  await downloadPage(downloadedPageLink, tempDirPath);

  const downloadedPageContent = await fs.readFile(downloadedPageFilePath, 'utf-8')
    .catch((err) => {
      console.log(err);
    });

  expect(testPageContent).toBe(downloadedPageContent);
});
