import {SEED, STORAGE_KEY, validate} from "./registry.mjs";

// Supply storage lazily: merely accessing localStorage can throw in a restricted browser.
export function readProjects(getStorage) {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    return {items: validate(raw === null ? SEED : JSON.parse(raw)), warning: ""};
  } catch {
    return {items: validate(SEED), warning: "Saved projects could not be loaded. The starter list is shown; your stored data has not been overwritten. Restore a backup before editing."};
  }
}

export function writeProjects(getStorage, items) {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(validate(items)));
    return {ok: true, warning: ""};
  } catch {
    return {ok: false, warning: "Changes are only in this session because saving failed. Export a backup before closing or reloading."};
  }
}
