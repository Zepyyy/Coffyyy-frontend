import assert from "node:assert/strict";
import { test } from "node:test";
import {
	canPermanentlyDelete,
	isSelectableForBrew,
} from "./libraryLifecycle.ts";

test("only active inventory can be selected for a new Brew", () => {
	assert.equal(isSelectableForBrew({ archived: false }), true);
	assert.equal(isSelectableForBrew({}), true);
	assert.equal(isSelectableForBrew({ archived: true }), false);
	assert.equal(isSelectableForBrew(undefined), false);
});

test("permanent deletion is allowed only when an item has no Brew history", () => {
	assert.equal(canPermanentlyDelete(0), true);
	assert.equal(canPermanentlyDelete(1), false);
});
