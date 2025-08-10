const CONFIG = {
  DELAY: 250,
  KEYS: {
    UP: 'KeyW',
    DOWN: 'KeyS',
    LEFT: 'KeyA',
    RIGHT: 'KeyD',
    FIRE: 'Space'
  },
  FIELD: {
    COLUMNS: 40,
    ROWS: 24,
    CORRIDORS: { MIN: 3, MAX: 5 },
    ROOMS: {
      MIN: 5,
      MAX: 10,
      SIZE: { MIN: 3, MAX: 8 }
    },
  },
  SWORD: { BUFF: 50, COUNT: 2, SYMBOL: 'SW' },
  POTION: { HEALTH: 100, COUNT: 10, SYMBOL: 'HP' },
  ENEMY: { DAMAGE: 5, STARTING_DISTANCE: 2, COUNT: 10, SYMBOL: 'E' },
  BOSS: { DAMAGE: 10, STARTING_DISTANCE: 10, ARMOR: 2.5, SYMBOL: 'B' },
  PLAYER: { DAMAGE: 25, SYMBOL: 'P' },
  WALL: { SYMBOL: 'W' },
  EMPTY: { SYMBOL: '' }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Unit {
  constructor(x, y, damage, armor = 1) {
    this.x = x;
    this.y = y;
    this.attacking = false;
    this.health = 100;
    this.strength = 0;
    this.damage = damage;
    this.armor = armor;
  }

  move(x, y) {
    this.x = x;
    this.y = y;
  }

  attack(target) {
    const totalDamage = this.damage * (1 + this.strength / 100);
    target.takeDamage(totalDamage);
  }

  takeDamage(amount) {
    const realDamage = amount / this.armor;
    this.health -= realDamage;
    if (this.health <= 0) this.health = 0;
  }
}

class Player extends Unit {
  constructor(x, y, damage, armor = 1) {
    super(x, y, damage, armor);
    this.moved = false;
  }

  useItem(type) {
    switch (type) {
      case CONFIG.SWORD.SYMBOL:
        this.strength += CONFIG.SWORD.BUFF;
        if (this.strength > 100) this.strength = 100;
        break;
      case CONFIG.POTION.SYMBOL:
        this.health += CONFIG.POTION.HEALTH;
        if (this.health > 100) this.health = 100;
        break;
    }
  }
}

class Item {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
  }
}

class GameField {
  constructor() {
    this.columns = CONFIG.FIELD.COLUMNS;
    this.rows = CONFIG.FIELD.ROWS;
    this.cells = Array(this.columns).fill().map(() => Array(this.rows).fill(CONFIG.WALL.SYMBOL));
    this.cellsPrev = Array(this.columns).fill().map(() => Array(this.rows).fill(CONFIG.EMPTY.SYMBOL));
    this.corridorsH = [];
    this.corridorsV = [];
  }

  getFreeCell(distanceLimit = -1, targetX = 0, targetY = 0) {
    let x, y;
    do {
      x = getRandomInt(0, this.columns - 1);
      y = getRandomInt(0, this.rows - 1);
    } while (
      this.cells[x][y] !== CONFIG.EMPTY.SYMBOL ||
      Math.abs(targetX - x) <= distanceLimit &&
      Math.abs(targetY - y) <= distanceLimit
    );
    return [x, y];
  }

  setCell(type, x, y) {
    this.cells[x][y] = type;
  }

  generateCorridors() {
    const min = CONFIG.FIELD.CORRIDORS.MIN;
    const max = CONFIG.FIELD.CORRIDORS.MAX;

    this.corridorsH = this.generateRandomCorridors(min, max, this.rows);
    this.corridorsV = this.generateRandomCorridors(min, max, this.columns);

    this.corridorsH.forEach(y => {
      for (let x = 0; x < this.columns; x++) {
        this.cells[x][y] = CONFIG.EMPTY.SYMBOL;
      }
    });

    this.corridorsV.forEach(x => {
      for (let y = 0; y < this.rows; y++) {
        this.cells[x][y] = CONFIG.EMPTY.SYMBOL;
      }
    });
  }

  generateRandomCorridors(min, max, fieldLimit) {
    const count = getRandomInt(min, max);
    const result = [];
    const available = Array(fieldLimit).fill(true);

    while (result.length < count) {
      const position = getRandomInt(0, fieldLimit - 1);
      if (available[position]) {
        result.push(position);
        available[position] = false;
        if (position > 0) available[position - 1] = false;
        if (position < fieldLimit - 1) available[position + 1] = false;
      }
    }

    return result;
  }

  generateRooms() {
    const targetRooms = getRandomInt(CONFIG.FIELD.ROOMS.MIN, CONFIG.FIELD.ROOMS.MAX);
    const available = Array(this.columns).fill().map(() => Array(this.rows).fill(true));
    let roomsCreated = 0;

    for (let i = 0; i < 1000 && roomsCreated < targetRooms; i++) {
      const width = getRandomInt(CONFIG.FIELD.ROOMS.SIZE.MIN, CONFIG.FIELD.ROOMS.SIZE.MAX);
      const height = getRandomInt(CONFIG.FIELD.ROOMS.SIZE.MIN, CONFIG.FIELD.ROOMS.SIZE.MAX);
      const x = getRandomInt(0, this.columns - width);
      const y = getRandomInt(0, this.rows - height);

      if (this.canPlaceRoom(x, y, width, height, available)) {
        this.placeRoom(x, y, width, height);
        this.markRoomArea(x, y, width, height, available);
        roomsCreated++;
      }
    }
  }

  canPlaceRoom(x, y, width, height, available) {
    for (let i = x; i < x + width; i++) {
      for (let j = y; j < y + height; j++) {
        if (!available[i][j]) return false;
      }
    }

    for (let corridor of this.corridorsH) {
      if (y <= corridor && corridor < y + height) return true;
    }
    for (let corridor of this.corridorsV) {
      if (x <= corridor && corridor < x + width) return true;
    }

    return false;
  }

  placeRoom(x, y, width, height) {
    for (let i = x; i < x + width; i++) {
      for (let j = y; j < y + height; j++) {
        this.cells[i][j] = CONFIG.EMPTY.SYMBOL;
      }
    }
  }

  markRoomArea(x, y, width, height, available) {
    for (let i = x - 1; i <= x + width; i++) {
      for (let j = y - 1; j <= y + height; j++) {
        if (i >= 0 && i < this.columns && j >= 0 && j < this.rows) {
          available[i][j] = false;
        }
      }
    }
  }
}

class Renderer {
  initDOM(rows, columns) {
    document.documentElement.style.setProperty('--main-cycle-delay', CONFIG.DELAY / 1000 + 's');
    document.documentElement.style.setProperty('--aspect', columns / rows);

    $('.field').css({
      display: 'grid',
      gridTemplateColumns: 'repeat(' + columns + ', 1fr)',
      gridTemplateRows: 'repeat(' + rows + ', 1fr)'
    })

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < rows * columns; i++) {
      const cell = document.createElement('div')
      cell.classList.add('tile');
      fragment.appendChild(cell);
    }
    $('.field').empty().append(fragment);
  }

  drawDOM(field, player, enemies, boss, gameStatus) {
    for (let i = 0; i < field.columns; i++) {
      for (let j = 0; j < field.rows; j++) {
        let enemyNumber = -1;
        if (field.cells[i][j] === CONFIG.ENEMY.SYMBOL) {
          let e = 0;
          while (e < enemies.length && enemyNumber === -1) {
            if (enemies[e].x === i && enemies[e].y === j) {
              enemyNumber = e;
            }
            e++;
          }
        }

        if (
          field.cells[i][j] !== field.cellsPrev[i][j] ||
          [CONFIG.PLAYER.SYMBOL, CONFIG.BOSS.SYMBOL, CONFIG.ENEMY.SYMBOL].includes(field.cells[i][j])
        ) {
          field.cellsPrev[i][j] = field.cells[i][j];
          const elemIndex = j * field.columns + i;
          const newStyleClasses = 'tile' +
            (field.cells[i][j] !== CONFIG.EMPTY.SYMBOL ? ' tile' + field.cells[i][j] : '') +
            (gameStatus === 'active' && (
              field.cells[i][j] === CONFIG.PLAYER.SYMBOL && player.attacking ||
              field.cells[i][j] === CONFIG.ENEMY.SYMBOL && enemies[enemyNumber].attacking ||
              field.cells[i][j] === CONFIG.BOSS.SYMBOL && boss && boss.attacking
            ) ? ' attack' : '')
          $('.field').children().eq(elemIndex).attr('class', newStyleClasses);

          if (field.cells[i][j] === CONFIG.PLAYER.SYMBOL) {
            $('.field').children().eq(elemIndex).prop('style').setProperty('--hp', player.health + '%')
            $('.field').children().eq(elemIndex).prop('style').setProperty('--strength', player.strength + '%')
          }
          if (field.cells[i][j] === CONFIG.ENEMY.SYMBOL) {
            $('.field').children().eq(elemIndex).prop('style').setProperty('--hp', enemies[enemyNumber].health + '%')
          }
          if (field.cells[i][j] === CONFIG.BOSS.SYMBOL) {
            $('.field').children().eq(elemIndex).prop('style').setProperty('--hp', (boss ? boss.health : 0) + '%')
          }
        }
      }
    }

    if (gameStatus === 'loss' || gameStatus === 'win') {
      $('.field').addClass(gameStatus);
    }
  }
}

class Game {
  constructor() {
    this.field = new GameField();
    this.renderer = new Renderer();
    this.player = null;
    this.enemies = [];
    this.boss = null;
    this.items = [];
    this.gameStatus = null;
    this.mainTimer = null;

    this.field.generateCorridors();
    this.field.generateRooms();
    this.placePlayer();
    this.placeItems(CONFIG.SWORD.SYMBOL, CONFIG.SWORD.COUNT);
    this.placeItems(CONFIG.POTION.SYMBOL, CONFIG.POTION.COUNT);
    this.placeEnemies(CONFIG.ENEMY.COUNT);
    this.placeBoss();
  }

  placePlayer() {
    const [x, y] = this.field.getFreeCell();
    this.player = new Player(x, y, CONFIG.PLAYER.DAMAGE);
    this.field.setCell(CONFIG.PLAYER.SYMBOL, x, y);
  }

  placeItems(type, quantity) {
    let x, y;
    for (let i = 0; i < quantity; i++) {
      [x, y] = this.field.getFreeCell();
      this.items.push(new Item(type, x, y));
      this.field.setCell(type, x, y);
    }
  }

  placeEnemies(quantity) {
    let x, y;
    for (let i = 0; i < quantity; i++) {
      [x, y] = this.field.getFreeCell(CONFIG.ENEMY.STARTING_DISTANCE, this.player.x, this.player.y);
      this.enemies.push(new Unit(x, y, CONFIG.ENEMY.DAMAGE));
      this.field.setCell(CONFIG.ENEMY.SYMBOL, x, y);
    }
  }

  placeBoss() {
    const [x, y] = this.field.getFreeCell(CONFIG.BOSS.STARTING_DISTANCE, this.player.x, this.player.y);
    this.boss = new Unit(x, y, CONFIG.BOSS.DAMAGE, CONFIG.BOSS.ARMOR);
    this.field.setCell(CONFIG.BOSS.SYMBOL, x, y);
  }

  init() {
    this.renderer.initDOM(this.field.rows, this.field.columns);
    this.startGameLoop();
    this.bindKeys();
    this.gameStatus = 'active';
  }

  startGameLoop() {
    this.mainTimer = setInterval(() => {
      this.update();
      this.draw();
      this.resetAttackStates();
    }, CONFIG.DELAY);
  }

  update() {
    this.checkAttacks();
    this.checkHP();
    this.checkGameOver();
    this.moveEnemies();
    this.moveBoss();
  }

  draw() {
    this.renderer.drawDOM(this.field, this.player, this.enemies, this.boss, this.gameStatus);
  }

  resetAttackStates() {
    this.enemies.forEach((enemy) => {
      enemy.attacking = false;
    });
    if (this.boss) {
      this.boss.attacking = false;
    }
    this.player.moved = false;
    this.player.attacking = false;
  }

  bindKeys() {
    $(document).keydown((event) => {
      switch (event.code) {
        case CONFIG.KEYS.UP:
        case 'ArrowUp':
          this.movePlayer('U');
          break;
        case CONFIG.KEYS.DOWN:
        case 'ArrowDown':
          this.movePlayer('D');
          break;
        case CONFIG.KEYS.LEFT:
        case 'ArrowLeft':
          this.movePlayer('L');
          break;
        case CONFIG.KEYS.RIGHT:
        case 'ArrowRight':
          this.movePlayer('R');
          break;
        case CONFIG.KEYS.FIRE:
        case 'Space':
          this.player.attacking = true;
          break;
      }
    });
  }

  movePlayer(direction) {
    let wantedX, wantedY;

    function checkCell(direction) {
      switch (direction) {
        case 'U':
          wantedX = this.player.x;
          wantedY = this.player.y - 1;
          break;
        case 'D':
          wantedX = this.player.x;
          wantedY = this.player.y + 1;
          break;
        case 'L':
          wantedX = this.player.x - 1;
          wantedY = this.player.y;
          break;
        case 'R':
          wantedX = this.player.x + 1;
          wantedY = this.player.y;
          break;
      }
      if (
        wantedX >= 0 &&
        wantedX < this.field.columns &&
        wantedY >= 0 &&
        wantedY < this.field.rows &&
        [CONFIG.EMPTY.SYMBOL, CONFIG.POTION.SYMBOL, CONFIG.SWORD.SYMBOL].includes(this.field.cells[wantedX][wantedY])
      ) {
        return true;
      } else {
        return false;
      }
    }

    if (!this.player.moved && this.gameStatus === 'active' && checkCell.bind(this)(direction)) {
      if (this.field.cells[wantedX][wantedY] === CONFIG.SWORD.SYMBOL) {
        this.player.useItem(CONFIG.SWORD.SYMBOL)
        this.deleteItem(wantedX, wantedY)
      } else if (this.field.cells[wantedX][wantedY] === CONFIG.POTION.SYMBOL) {
        this.player.useItem(CONFIG.POTION.SYMBOL)
        this.deleteItem(wantedX, wantedY)
      }

      this.field.setCell(CONFIG.EMPTY.SYMBOL, this.player.x, this.player.y);
      this.player.move(wantedX, wantedY);
      this.field.setCell(CONFIG.PLAYER.SYMBOL, this.player.x, this.player.y);

      this.player.moved = true;
    }
  }

  deleteItem(x, y) {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].x === x && this.items[i].y === y) {
        this.items.splice(i, 1);
        break;
      }
    }
  }

  moveEnemies() {
    this.enemies.forEach(enemy => {
      if (!enemy.attacking) {
        const dx = getRandomInt(-1, 1);
        const dy = getRandomInt(-1, 1);

        const wantedX = enemy.x + dx;
        const wantedY = enemy.y + dy;

        if (this.isValidMove(wantedX, wantedY)) {
          this.field.setCell(CONFIG.EMPTY.SYMBOL, enemy.x, enemy.y);
          enemy.move(wantedX, wantedY);
          this.field.setCell(CONFIG.ENEMY.SYMBOL, enemy.x, enemy.y);
        }
      }
    });
  }

  moveBoss() {
    let distanceX, distanceY, wantedX, wantedY;

    if (this.boss && this.boss.health > 0 && !this.boss.attacking) {
      distanceX = this.player.x - this.boss.x;
      distanceY = this.player.y - this.boss.y;
      wantedX = this.boss.x + Math.sign(distanceX);
      wantedY = this.boss.y + Math.sign(distanceY);

      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        if (this.isValidMove(wantedX, this.boss.y)) {
          wantedY = this.boss.y;
        } else if (this.isValidMove(this.boss.x, wantedY)) {
          wantedX = this.boss.x;
        }
      } else {
        if (this.isValidMove(this.boss.x, wantedY)) {
          wantedX = this.boss.x;
        } else if (this.isValidMove(wantedX, this.boss.y)) {
          wantedY = this.boss.y;
        }
      }

      if (this.isValidMove(wantedX, wantedY)) {
        this.field.setCell(CONFIG.EMPTY.SYMBOL, this.boss.x, this.boss.y);
        this.boss.move(wantedX, wantedY);
        this.field.setCell(CONFIG.BOSS.SYMBOL, this.boss.x, this.boss.y);
      }
    }
  }

  checkAttacks() {
    this.checkPlayerAttacks();
    this.checkEnemyAttacks();
    this.checkBossAttacks();
  }

  checkPlayerAttacks() {
    if (this.player.attacking) {
      this.enemies.forEach(enemy => {
        if (this.isNear(this.player, enemy)) {
          this.player.attack(enemy);
        }
      });

      if (this.boss && this.isNear(this.player, this.boss)) {
        this.player.attack(this.boss);
      }
    }
  }

  checkEnemyAttacks() {
    this.enemies.forEach(enemy => {
      if (this.isNear(enemy, this.player)) {
        enemy.attack(this.player);
        enemy.attacking = true;
      }
    });
  }

  checkBossAttacks() {
    if (this.boss && this.boss.health > 0 && this.isNear(this.boss, this.player)) {
      this.boss.attack(this.player);
      this.boss.attacking = true;
    }
  }

  isNear(entity1, entity2) {
    return Math.abs(entity1.x - entity2.x) <= 1 && Math.abs(entity1.y - entity2.y) <= 1;
  }

  isValidMove(x, y) {
    return x >= 0 && x < this.field.columns &&
      y >= 0 && y < this.field.rows &&
      this.field.cells[x][y] === CONFIG.EMPTY.SYMBOL;
  }

  checkHP() {
    for (let e = 0; e < this.enemies.length; e++) {
      if (this.enemies[e].health <= 0) {

        this.field.setCell(CONFIG.EMPTY.SYMBOL, this.enemies[e].x, this.enemies[e].y);
        this.enemies.splice(e, 1);
        e--;
      }

      if (this.boss && this.boss.health <= 0) {
        this.field.setCell(CONFIG.SWORD.SYMBOL, this.boss.x, this.boss.y);
        this.boss = null;
      }
    }
  }

  checkGameOver() {
    if (this.player.health <= 0) {
      this.field.setCell(CONFIG.SWORD.SYMBOL, this.player.x, this.player.y);
      this.gameStatus = 'loss';
      this.stopGame();
    }

    if (this.enemies.length === 0 && (!this.boss || this.boss.health <= 0)) {
      this.gameStatus = 'win';
      this.stopGame();
    }
  }

  stopGame() {
    this.draw();
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.mainTimer = null;
    }
  }

}