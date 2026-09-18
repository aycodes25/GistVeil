import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvRow } from './csv';

describe('csvCell', () => {
  test('quotes plain strings', () => {
    assert.equal(csvCell('hello'), '"hello"');
  });

  test('doubles embedded quotes', () => {
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  });

  test('keeps commas and newlines inside the quotes', () => {
    assert.equal(csvCell('a,b'), '"a,b"');
    assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
    assert.equal(csvCell('line1\r\nline2'), '"line1\r\nline2"');
  });

  test('neutralises spreadsheet formula prefixes with a leading apostrophe', () => {
    assert.equal(csvCell('=1+1'), `"'=1+1"`);
    assert.equal(csvCell('+1'), `"'+1"`);
    assert.equal(csvCell('-1'), `"'-1"`);
    assert.equal(csvCell('@SUM(A1)'), `"'@SUM(A1)"`);
    assert.equal(csvCell('\tcmd'), `"'\tcmd"`);
    assert.equal(csvCell('\rcmd'), `"'\rcmd"`);
  });

  test('a formula prefix is only dangerous at the start of the cell', () => {
    assert.equal(csvCell('a=1+1'), '"a=1+1"');
    assert.equal(csvCell('2026-09-18T12:00:00Z'), '"2026-09-18T12:00:00Z"');
  });

  test('neutralises the prefix and still escapes quotes', () => {
    assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
  });

  test('null and undefined become an empty quoted cell', () => {
    assert.equal(csvCell(null), '""');
    assert.equal(csvCell(undefined), '""');
  });

  test('numbers and booleans are unquoted and never neutralised', () => {
    assert.equal(csvCell(5), '5');
    assert.equal(csvCell(-3), '-3');
    assert.equal(csvCell(0), '0');
    assert.equal(csvCell(true), 'true');
    assert.equal(csvCell(false), 'false');
  });
});

describe('csvRow', () => {
  test('joins cells with commas and no line ending', () => {
    assert.equal(csvRow(['a', 1, null]), '"a",1,""');
  });

  test('an empty row is an empty string', () => {
    assert.equal(csvRow([]), '');
  });
});
