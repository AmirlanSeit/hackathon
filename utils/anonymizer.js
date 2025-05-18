import faker from 'faker';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function anonymizeText(text, mode) {
  let anon = text;

  const kazakhPatterns = {
    iin: /\b\d{12}\b/g,
    passport: /\b[A-Z]\d{7}\b/g,
    oldPassport: /\b[A-Z]{2}\d{7}\b/g,
  };

  const emailPatternDomain = /\b[\w\.-]+@(?:gmail\.com|outlook\.com|mail\.ru|yahoo\.com|hotmail\.com|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
  anon = anon.replace(emailPatternDomain, mode === 'mask' 
    ? '██████████@█████████' 
    : faker.internet.email().toLowerCase());

  Object.entries(kazakhPatterns).forEach(([type, pattern]) => {
    const maskLength = {
      iin: '████████',
      passport: '████████',
      oldPassport: '█████████'
    };

    anon = anon.replace(pattern, mode === 'mask'
      ? maskLength[type]
      : type === 'iin' 
        ? faker.random.number({ min: 10000000, max: 99999999 }).toString()
        : (type === 'passport' ? 'N' + faker.random.number({ min: 1000000, max: 9999999 }).toString() 
          : 'AB' + faker.random.number({ min: 1000000, max: 9999999 }).toString())
    );
  });

  const financialPatterns = {
    bankAccount: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b|(\b\d{8,17}\b)/g,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
    swiftCode: /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?/g,
    ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    taxId: /\b\d{2}[-]?\d{7}\b/g,
    currency: /\b[$€£¥]\s*\d+(?:[.,]\d{2})?\b|\b\d+(?:[.,]\d{2})?\s*[$€£¥]\b/g,
  };

  Object.entries(financialPatterns).forEach(([type, pattern]) => {
    const maskLength = {
      bankAccount: '████████████████',
      creditCard: '████████████████',
      swiftCode: '███████████',
      ssn: '███████████',
      taxId: '██████████',
      currency: '█████',
    };

    anon = anon.replace(pattern, mode === 'mask' 
      ? maskLength[type]
      : type === 'currency' 
        ? '$' + faker.finance.amount()
        : faker.finance.account()
    );
  });

  const namePatterns = [
    /\b(?:Amirlan)\s+(?:Seitkadyrov)\b/gi,
    /\bAmirlan\b/gi,
    /\bSeitkadyrov\b/gi,
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:ov|ev|in|ova?)\b/gi
  ];

  namePatterns.forEach(pattern => {
    anon = anon.replace(pattern, mode === 'mask' ? '█████████' : faker.name.findName());
  });

  const phonePattern = /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g;
  anon = anon.replace(phonePattern, mode === 'mask' ? '███████████' : faker.phone.phoneNumber());

  const emailPattern = /\b[\w\.-]+@[\w\.-]+\.\w{2,}\b/g;
  anon = anon.replace(emailPattern, mode === 'mask' ? '██████@████.███' : faker.internet.email());

  const addressPattern = /\b\d+\s+[A-Za-z\s,]+(?:Avenue|Lane|Road|Boulevard|Drive|Street|Ave|Dr|Rd|Blvd|Ln|St)\.?\s*(?:#\s*\d+)?(?:,\s*(?:Apt|Suite|Unit)\s*#?\s*\d+)?[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gi;
  anon = anon.replace(addressPattern, mode === 'mask' ? '██████████████████' : faker.address.streetAddress());

  return anon;
}