import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import downloadPage from '../src';

nock.disableNetConnect();

const getFixturePath = (name) => path.join(__dirname, '../__fixtures__', name);

const testPagePath = getFixturePath('testPage.html');
const expectedPath = getFixturePath('expected.html');

let tempDirPath;

beforeEach(async () => {
  tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('should work', async () => {
  const downloadedPageHost = 'https://ru.hexlet.io';
  const downloadedPagePath = '/courses';
  const downloadedPageName = 'ru-hexlet-io-courses.html';
  const downloadedPageLink = `${downloadedPageHost}${downloadedPagePath}`;
  const downloadedPageFilePath = path.join(tempDirPath, downloadedPageName);
  const testPageContent = await fs.readFile(testPagePath, 'utf-8');
  const expected = await fs.readFile(expectedPath, 'utf-8');

  nock(downloadedPageHost)
    .get(downloadedPagePath)
    .reply(200, testPageContent);

  await downloadPage(downloadedPageLink, tempDirPath);

  const downloadedPageContent = await fs.readFile(downloadedPageFilePath, 'utf-8')
    .catch((err) => {
      console.log(err);
    });

  expect(downloadedPageContent).toBe(expected);
});
