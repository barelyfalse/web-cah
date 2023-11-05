class Card {
  constructor(cardId, text, initialX, initialY) {
    this.cardId = cardId
    this.x = initialX
    this.y = initialY
    this.destinationX = initialX
    this.destinationY = initialY
    this.velocity = 0
    this.lastDistance = Infinity
    this.movementT = 0
    this.isMoving = false
    const template = document.getElementById('cardTemplate')
    this.cardEl = template.content.cloneNode(true).firstElementChild

    this.cardEl.querySelector('.card').classList.add('card-white')
    this.cardEl.querySelector('.card').textContent = text
    this.cardEl.style.left = `${this.x}px`
    this.cardEl.style.top = `${this.y}px`
    screenParent.appendChild(this.cardEl)
  }

  move() {
    this.movementT += 1
    const deltaX = this.destinationX - this.x
    const deltaY = this.destinationY - this.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance < 0.5 || distance > this.lastDistance) {
      this.x = this.destinationX
      this.y = this.destinationY
      this.isMoving = false
      this.cardEl.style.left = `${this.x}px`
      this.cardEl.style.top = `${this.y}px`
      return
    }

    const stepX = deltaX / distance
    const stepY = deltaY / distance

    this.x += stepX * this.velocity
    this.y += stepY * this.velocity

    this.cardEl.style.left = `${this.x}px`
    this.cardEl.style.top = `${this.y}px`

    this.lastDistance = distance

    requestAnimationFrame(this.move.bind(this))
  }

  moveTo(x, y, velocity) {
    this.lastDistance = Math.sqrt(
      Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2)
    )
    this.destinationX = x
    this.destinationY = y
    this.velocity = velocity
    this.movementT = 0
    if (!this.isMoving) {
      this.isMoving = true
      this.move()
    }
  }

  raise() {
    this.cardEl.querySelector('.card').classList.add('raise')
  }

  drop() {
    this.cardEl.querySelector('.card').classList.remove('raise')
  }

  destroyCard() {
    setTimeout(() => {
      this.cardEl.parentNode.removeChild(this.cardEl)
    }, 2000)
  }
}
