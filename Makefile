install:
	npm install

start:
	npm run babel-node -- dist/bin/page-loader.js

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

debug:
	DEBUG=page-loader:* npm test

test-coverage:
	npm test -- --coverage

.PHONY: test
