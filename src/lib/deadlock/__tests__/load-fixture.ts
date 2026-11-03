import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURES_DIR = path.join(process.cwd(), "src", "data", "fixtures");

/** A saved API response from src/data/fixtures, by file name without `.json`. */
export function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, `${name}.json`), "utf8"));
}
