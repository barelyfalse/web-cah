function generateRoomId(notEqu = []) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rndString = "";

  do {
    rndString = "";
    for (let i = 0; i < 5; i++) {
      rndString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (notEqu.includes(rndString));

  return rndString;
}

function generateKey(notEqu = []) {
  const chars = "0123456789abcdef";
  let rndString = "";

  do {
    rndString = "";
    for (let i = 0; i < 16; i++) {
      rndString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (notEqu.includes(rndString));

  return rndString;
}

function validUsername(uname) {
  return /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/.test(uname);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createArrayFromLength(length) {
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(i);
  }
  return result;
}

function validUUId(uuid) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    uuid
  );
}

function validDocID(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

module.exports = {
  generateRoomId,
  generateKey,
  validUsername,
  shuffle,
  createArrayFromLength,
  validUUId,
  validDocID,
};
