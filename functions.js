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

module.exports = {
  generateRoomId
}