function generateRoomId(notEqu = []) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rndString = '';

  do {
    for (let i = 0; i < 5; i++) {
      rndString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (notEqu.includes(rndString))

  return rndString;
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

module.exports = {
  generateRoomId,
  shuffle,
  createArrayFromLength
}