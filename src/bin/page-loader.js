#!/usr/bin/env node

import commander from 'commander';
import process from 'process';
import downloadPage from '..';

const program = new commander.Command();

const main = () => {
  program
    .version('0.0.1')
    .description('Download webpage by link')
    .option('--output [type]', 'path to directory', process.cwd())
    .arguments('<link>')
    .action((link) => {
      downloadPage(link, program.output)
        .catch((err) => {
          console.error(err.message);
          process.exit(1);
        });
    });

  program.parse(process.argv);
};

main();
