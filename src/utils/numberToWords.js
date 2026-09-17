/**
 * Convert number to words (Indian Numbering System format)
 */
export function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  const n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return 'Zero';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(val) {
    if (val < 20) return a[val];
    const tens = b[Math.floor(val / 10)];
    const units = a[val % 10];
    return units ? `${tens} ${units}` : tens;
  }

  function convertThreeDigits(val) {
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
    let res = '';
    if (hundred > 0) {
      res += `${a[hundred]} Hundred`;
    }
    if (rest > 0) {
      res += (res ? ' ' : '') + convertTwoDigits(rest);
    }
    return res;
  }

  let crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  let hundreds = remainder % 1000;

  let words = [];

  if (crore > 0) {
    words.push(`${convertThreeDigits(crore)} Crore`);
  }
  if (lakh > 0) {
    words.push(`${convertTwoDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    words.push(`${convertTwoDigits(thousand)} Thousand`);
  }
  if (hundreds > 0) {
    words.push(convertThreeDigits(hundreds));
  }

  return words.join(' ');
}
