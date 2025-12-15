export function fallbackCreateRandomId() {
  return 'id-' + Math.random().toString(36).substr(2, 9);
}

export function getUUID(length = 36) {
  let uuid;

  if (crypto.randomUUID) {
    uuid = crypto.randomUUID(); // standard UUID v4, 36 chars
  } else {
    // Fallback: UUID v4 generator
    uuid = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  // Adjust to requested length
  if (length < uuid.length) {
    return uuid.slice(0, length); // truncate
  } else if (length > uuid.length) {
    // pad with extra random hex chars
    while (uuid.length < length) {
      uuid += Math.floor(Math.random() * 16).toString(16);
    }
    return uuid;
  }

  return uuid; // default 36 chars
}


// ULID generator with optional length control
export function getULID(length = 26) {
  // ULID alphabet (Crockford's Base32)
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  
  // Timestamp part (48 bits → 10 chars)
  const now = Date.now();
  let timeChars = "";
  let time = now;
  for (let i = 0; i < 10; i++) {
    timeChars = alphabet[time % 32] + timeChars;
    time = Math.floor(time / 32);
  }

  // Random part (80 bits → 16 chars)
  let randChars = "";
  for (let i = 0; i < 16; i++) {
    randChars += alphabet[Math.floor(Math.random() * 32)];
  }

  // Full ULID (26 chars)
  let ulid = timeChars + randChars;

  // Adjust to requested length
  if (length < ulid.length) {
    return ulid.slice(0, length); // truncate
  } else if (length > ulid.length) {
    // pad with extra random chars
    while (ulid.length < length) {
      ulid += alphabet[Math.floor(Math.random() * 32)];
    }
    return ulid;
  }
  return ulid;
}