import assert from "node:assert/strict";
import { test } from "node:test";
import {
	LIBRARY_DEFAULT_PATH,
	LIBRARY_PATHS,
	LIBRARY_ROUTE_PATTERNS,
	beanLibraryPath,
	brewerLibraryPath,
	brewLogPath,
	parseBeanIdParam,
} from "./libraryRoutes.ts";

test("library paths keep collections and details nested", () => {
	assert.equal(LIBRARY_PATHS.root, "/library");
	assert.equal(LIBRARY_DEFAULT_PATH, "/library/beans");
	assert.deepEqual(LIBRARY_ROUTE_PATTERNS, {
		beans: "/library/beans",
		beanDetail: "/library/beans/:beanId",
		brewers: "/library/brewers",
		brewerDetail: "/library/brewers/:brewerId",
	});
	assert.equal(beanLibraryPath(12), "/library/beans/12");
	assert.equal(brewerLibraryPath("robot"), "/library/brewers/robot");
});

test("brew links preserve optional library context", () => {
	assert.equal(brewLogPath({ beanId: 12 }), "/log/brew?beanId=12");
	assert.equal(
		brewLogPath({ beanId: 12, brewerId: 4 }),
		"/log/brew?beanId=12&brewerId=4",
	);
	assert.equal(brewLogPath(), "/log/brew");
});

test("bean detail route params become valid database ids", () => {
	assert.equal(parseBeanIdParam("12"), 12);
	assert.equal(parseBeanIdParam(undefined), undefined);
	assert.equal(parseBeanIdParam("not-a-number"), undefined);
});
