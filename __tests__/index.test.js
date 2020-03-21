import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import downloadPage from '../src';

nock.disableNetConnect();

const getFixturePath = (name) => path.join(__dirname, '../__fixtures__', name);

let tempDirPath;

beforeEach(async () => {
  tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('should work', async () => {
  const downloadedPageHost = 'https://ru.hexlet.io';
  const downloadedPagePath = '/courses';
  const { href: downloadedPageLink } = new URL(downloadedPagePath, downloadedPageHost);

  const dirName = 'ru-hexlet-io-courses_files';

  const testPageFilePath = getFixturePath('testPage.html');
  const downloadedPageName = 'ru-hexlet-io-courses.html';
  const expectedHtmlFilePath = getFixturePath('expected.html');
  const htmlFilePath = path.join(tempDirPath, downloadedPageName);

  const cssPath = '/css/style.css';
  const cssName = 'css-style.css';
  const expectedCssFilePath = getFixturePath(cssPath);
  const cssFilePath = path.join(tempDirPath, dirName, cssName);

  const jsPath = '/js/script.js';
  const jsName = 'js-script.js';
  const expectedJsFilePath = getFixturePath(jsPath);
  const jsFilePath = path.join(tempDirPath, dirName, jsName);

  const imgPath = '/images/logo.jpeg';
  const imgName = 'images-logo.jpeg';
  const expectedImgFilePath = getFixturePath(imgPath);
  const imgFilePath = path.join(tempDirPath, dirName, imgName);

  nock(downloadedPageHost)
    .get(downloadedPagePath)
    .replyWithFile(200, testPageFilePath, { 'Content-Type': 'text/html' })
    .get(imgPath)
    .replyWithFile(200, expectedImgFilePath, { 'Content-Type': 'image/jpeg' })
    .get(cssPath)
    .replyWithFile(200, expectedCssFilePath, { 'Content-Type': 'text/css' })
    .get(jsPath)
    .replyWithFile(200, expectedJsFilePath, { 'Content-Type': 'text/javascript' })
    .log(console.log);

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
