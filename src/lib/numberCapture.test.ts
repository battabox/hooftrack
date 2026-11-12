import { describe, expect, it } from 'vitest';
import { numbersFromPhotoText, numbersFromSpeech } from './numberCapture';

describe('numbers from speech', () => {
  it('splits a spoken list on "en"/"and" and commas', () => {
    expect(numbersFromSpeech('1234 en 5678')).toEqual(['1234', '5678']);
    expect(numbersFromSpeech('1234 and 5678, 91011')).toEqual(['1234', '5678', '91011']);
  });
  it('joins digits the recogniser split up', () => {
    expect(numbersFromSpeech('12 34')).toEqual(['1234']);
  });
  it('understands digits spoken one by one (Dutch and English)', () => {
    expect(numbersFromSpeech('vier vijf zes zeven')).toEqual(['4567']);
    expect(numbersFromSpeech('one two three')).toEqual(['123']);
  });
  it('ignores words without numbers and duplicates', () => {
    expect(numbersFromSpeech('koe 1234 en nog eens 1234')).toEqual(['1234']);
    expect(numbersFromSpeech('hallo')).toEqual([]);
  });
});

describe('numbers from an ear-tag photo', () => {
  it('finds the work number and the NL life number', () => {
    expect(numbersFromPhotoText('NL 123456789\n56789\n')).toEqual(['NL 123456789', '56789']);
  });
  it('fixes common misreads (O→0) and drops short noise', () => {
    expect(numbersFromPhotoText('4O21\n7\n 12 ')).toEqual(['4021']);
  });
  it('joins digits split by spaces on one line', () => {
    expect(numbersFromPhotoText('5 1234 5678')).toEqual(['512345678']);
  });
  it('returns nothing when no number is readable', () => {
    expect(numbersFromPhotoText('')).toEqual([]);
  });
});
