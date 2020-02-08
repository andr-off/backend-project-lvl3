import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import downloadPage from '../src';

nock.disableNetConnect();

const getFixturePath = (name) => path.join(__dirname, '../__fixtures__', name);

const testPagePath = getFixturePath('testPage.html');

let tempDirPath;

const table = [
  [
    'with pathname in url',
    'https://hexlet.io',
    '/courses',
    'hexlet-io-courses.html',
  ],
  [
    'without pathname in url',
    'https://hexlet.io',
    '/',
    'hexlet-io.html',
  ],
  [
    'with pathname and querystring in url',
    'https://yandex.ru',
    '/search/?text=node.js',
    'yandex-ru-search-text-node-js.html',
  ],
];

beforeEach(async () => {
  tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test.each(table)(
  '%s',
  async (testName, downloadedPageHost, downloadedPagePath, downloadedPageName) => {
    const downloadedPageLink = `${downloadedPageHost}${downloadedPagePath}`;
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
  },
);
