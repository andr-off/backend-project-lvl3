install:
	npm install

start:
	npm run babel-node -- src/bin/page-loader.js

publish:
	npm publish --dry-run

lint:
	npx eslint .

build:
	rm -rf dist
	npm run build

test:
	npm test

watch:
	npx jest --watch .

test-coverage:
	npm test -- --coverage

.PHONY: test
