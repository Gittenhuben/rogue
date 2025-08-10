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
    CORRIDORS: {
      MIN: 3,
      MAX: 5
    },
    ROOMS: {
      MIN: 5,
      MAX: 10,
      SIZE: {
        MIN: 3,
        MAX: 8
      }
    }
  },
  SWORDS: {
    BUFF: 50,
    COUNT: 2
  },
  POTIONS: {
    HEALTH: 100,
    COUNT: 10
  },
  ENEMY: {
    COUNT: 10,
    STARTING_DISTANCE: 2,
    DAMAGE: 5
  },
  BOSS: {
    DAMAGE: 10,
    STARTING_DISTANCE: 10,
    ARMOR: 2.5
  },
  PLAYER: {
    DAMAGE: 25
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Game {
  gameStatus;
  mainTimer;

  corridorsH = [];
  corridorsV = [];
  
  playerMoved = false;
  playerCoords = [];
  playerHealth = 100;
  playerHealthPrev = 100;
  playerAttacking = false;
  playerAttackingPrev = false;
  playerStrength = 0;
  playerStrengthPrev = 0;
  
  enemiesCount = 0;
  enemiesCoords = [];
  enemiesHealth = [];
  enemiesHealthPrev = [];
  enemiesAttacking = [];
  enemiesAttackingPrev = [];
  
  bossCount = 0;
  bossCoords = [];
  bossHealth = 1;
  bossHealthPrev = 1;
  bossAttacking = false;
  bossAttackingPrev = false;

  constructor() {
    this.cellsData = Array(CONFIG.FIELD.COLUMNS).fill().map(() => Array(CONFIG.FIELD.ROWS).fill('W'));
    this.cellsDataPrev = Array(CONFIG.FIELD.COLUMNS).fill().map(() => Array(CONFIG.FIELD.ROWS).fill(''));
  
    this.initJSS();
    this.initField();
    this.generateCorridors();
    this.generateRooms();
    this.placePlayer();
    this.placeItems(CONFIG.SWORDS.COUNT, 'SW');
    this.placeItems(CONFIG.POTIONS.COUNT,'HP');
    this.placeEnemies(CONFIG.ENEMY.COUNT);
    this.placeBoss();
  }

  init() {
    function mainCycle() {
      this.moveBoss();
      this.moveEnemies();
      this.enemiesAttacks();
      this.bossAttacks();
      this.checkPlayerHealth();
      this.checkWin();
      this.drawField();
      this.saveTickData();
    }
    this.mainTimer = setInterval(mainCycle.bind(this), CONFIG.DELAY);
    document.documentElement.style.setProperty('--main-cycle-delay', CONFIG.DELAY / 1000 + 's');
    document.documentElement.style.setProperty('--aspect', CONFIG.FIELD.COLUMNS / CONFIG.FIELD.ROWS);
    this.bindKeys();
    this.gameStatus = 'active';
  }

  stopGame() {
    this.drawField();
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.mainTimer = null;
    }
  }

  bindKeys() {
    $(document).keydown(function(event) {
      switch(event.code) {
        case 'ArrowUp':
        case CONFIG.KEYS.UP:
          this.movePlayer('U');
          break;
        case 'ArrowDown':
        case CONFIG.KEYS.DOWN:
          this.movePlayer('D');
          break;
        case 'ArrowLeft':
        case CONFIG.KEYS.LEFT:
          this.movePlayer('L');
          break;
        case 'ArrowRight':
        case CONFIG.KEYS.RIGHT:
          this.movePlayer('R');
          break;
        case 'Space':
        case CONFIG.KEYS.FIRE:
          this.playerAttack();
          break;
      }    
    }.bind(this));
  }

  enemiesAttacks() {
    for (let e = 0; e < this.enemiesCount; e++) {
      if (
        Math.abs(this.enemiesCoords[e][0] - this.playerCoords[0]) <= 1 &&
        Math.abs(this.enemiesCoords[e][1] - this.playerCoords[1]) <= 1
      ) {
        this.enemiesAttacking[e] = true;
        this.playerHealth -= CONFIG.ENEMY.DAMAGE;
      }
    }
  }

  bossAttacks() {
    if (
      this.bossCount > 0 &&
      Math.abs(this.bossCoords[0] - this.playerCoords[0]) <= 1 &&
      Math.abs(this.bossCoords[1] - this.playerCoords[1]) <= 1
    ) {
      this.bossAttacking = true;
      this.playerHealth -= CONFIG.BOSS.DAMAGE;
    }
  }

  checkPlayerHealth() {
    if (this.playerHealth <= 0) {
      this.cellsData[this.playerCoords[0]][this.playerCoords[1]] = 'SW';
      this.gameStatus = 'loss';
      this.stopGame();
    }
  }

  checkWin() {
    if (this.bossCount <= 0 && this.enemiesCount <= 0) {
      this.gameStatus = 'win';
      this.stopGame();
    }
  }

  playerAttack() {
    if (!this.playerAttacking && this.gameStatus === 'active') {
      this.playerAttacking = true;

      for (let e = 0; e < this.enemiesCount; e++) {
        if (
          Math.abs(this.enemiesCoords[e][0] - this.playerCoords[0]) <= 1 &&
          Math.abs(this.enemiesCoords[e][1] - this.playerCoords[1]) <= 1
        ) {
          this.enemiesHealth[e] -= CONFIG.PLAYER.DAMAGE * (1 + this.playerStrength / 100);
          if (this.enemiesHealth[e] <= 0) {
            this.cellsData[this.enemiesCoords[e][0]][this.enemiesCoords[e][1]] = '';
            this.enemiesCount--;
            this.enemiesCoords.splice(e, 1);
            this.enemiesHealth.splice(e, 1);
            this.enemiesHealthPrev.splice(e, 1);
            this.enemiesAttacking.splice(e, 1);
            this.enemiesAttackingPrev.splice(e, 1);
            e--;
          }
        }
      }

      if (
        this.bossCount > 0 &&
        Math.abs(this.bossCoords[0] - this.playerCoords[0]) <= 1 &&
        Math.abs(this.bossCoords[1] - this.playerCoords[1]) <= 1
      ) {
        this.bossHealth -= CONFIG.PLAYER.DAMAGE / CONFIG.BOSS.ARMOR * (1 + this.playerStrength / 100);
        if (this.bossHealth <= 0) {
          this.cellsData[this.bossCoords[0]][this.bossCoords[1]] = 'SW';
          this.bossCount--;
        }
      }
    }  
  }

  movePlayer(direction) {
    let wantedX, wantedY;

    function checkCell(direction) {
      switch(direction) {
        case 'U':
          wantedX = this.playerCoords[0];
          wantedY = this.playerCoords[1] - 1;
          break;
        case 'D':
          wantedX = this.playerCoords[0];
          wantedY = this.playerCoords[1] + 1;
          break;
        case 'L':
          wantedX = this.playerCoords[0] - 1;
          wantedY = this.playerCoords[1];
          break;
        case 'R':
          wantedX = this.playerCoords[0] + 1;
          wantedY = this.playerCoords[1];
          break;
      }
      if (
        wantedX >= 0 &&
        wantedX < CONFIG.FIELD.COLUMNS &&
        wantedY >= 0 &&
        wantedY < CONFIG.FIELD.ROWS &&
        ['', 'HP', 'SW'].includes(this.cellsData[wantedX][wantedY])
      ) {
        return true;
      } else {
        return false;
      }
    }

    if (!this.playerMoved && this.gameStatus === 'active' && checkCell.bind(this)(direction)) {
      if (this.cellsData[wantedX][wantedY] === 'SW') {
        this.playerStrength += CONFIG.SWORDS.BUFF;
        if (this.playerStrength > 100) {
          this.playerStrength = 100;
        }
      } else if (this.cellsData[wantedX][wantedY] === 'HP') {
        this.playerHealth += CONFIG.POTIONS.HEALTH;
        if (this.playerHealth > 100) {
          this.playerHealth = 100;
        }
      }

      this.cellsData[this.playerCoords[0]][this.playerCoords[1]] = '';
      this.playerCoords = [wantedX, wantedY];
      this.cellsData[this.playerCoords[0]][this.playerCoords[1]] = 'P';

      this.playerMoved = true;
    }
  }

  moveEnemies() {
    let wantedX, wantedY;
    for(let e = 0; e < this.enemiesCount; e++) {
      if (!this.enemiesAttackingPrev[e]) {
        wantedX = this.enemiesCoords[e][0] + getRandomInt(-1, 1);
        wantedY = this.enemiesCoords[e][1] + getRandomInt(-1, 1);
        if (
          wantedX >= 0 &&
          wantedX < CONFIG.FIELD.COLUMNS &&
          wantedY >= 0 &&
          wantedY < CONFIG.FIELD.ROWS &&
          this.cellsData[wantedX][wantedY] === ''
        ) {
          this.cellsData[this.enemiesCoords[e][0]][this.enemiesCoords[e][1]] = '';
          this.enemiesCoords[e] = [wantedX, wantedY];
          this.cellsData[this.enemiesCoords[e][0]][this.enemiesCoords[e][1]] = 'E';
        }
      }  
    }
  }

  moveBoss() {
    let distanceX, distanceY, wantedX, wantedY;

    function checkWall(wantedX, wantedY) {
      return (
        wantedX >= 0 &&
        wantedX < CONFIG.FIELD.COLUMNS &&
        wantedY >= 0 &&
        wantedY < CONFIG.FIELD.ROWS &&
        this.cellsData[wantedX][wantedY] === ''
      );
    }

    if (this.bossCount > 0 && !this.bossAttackingPrev) {
      distanceX = this.playerCoords[0] - this.bossCoords[0];
      distanceY = this.playerCoords[1] - this.bossCoords[1];
      wantedX = this.bossCoords[0] + Math.sign(distanceX);
      wantedY = this.bossCoords[1] + Math.sign(distanceY);
      
      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        if (checkWall.bind(this)(wantedX, this.bossCoords[1])) {
          wantedY = this.bossCoords[1];
        } else if (checkWall.bind(this)(this.bossCoords[0], wantedY)) {
          wantedX = this.bossCoords[0];
        }
      } else {
        if (checkWall.bind(this)(this.bossCoords[0], wantedY)) {
          wantedX = this.bossCoords[0];
        } else if (checkWall.bind(this)(wantedX, this.bossCoords[1])) {
          wantedY = this.bossCoords[1];
        }
      }
      
      if (checkWall.bind(this)(wantedX, wantedY)) {
        this.cellsData[this.bossCoords[0]][this.bossCoords[1]] = '';
        this.bossCoords = [wantedX, wantedY];
        this.cellsData[this.bossCoords[0]][this.bossCoords[1]] = 'B';
      }

    }
  }

  initJSS() {
    window.jss.default.use(window.jssPluginCamelCase.default());
    this.styles = {
      field: {
        display: 'grid',
        gridTemplateColumns: 'repeat(' + CONFIG.FIELD.COLUMNS + ', 1fr)',
        gridTemplateRows: 'repeat(' + CONFIG.FIELD.ROWS + ', 1fr)'
      },
    };
    this.classes = window.jss.default.createStyleSheet(this.styles).attach().classes;
  }

  initField() {
    $('.field').addClass(this.classes.field);

    const fragment = document.createDocumentFragment();
    for(let i = 0; i < CONFIG.FIELD.ROWS * CONFIG.FIELD.COLUMNS; i++) {
      const cell = document.createElement('div')
      cell.classList.add('tile');
      fragment.appendChild(cell);
    }
    $('.field').empty().append(fragment);
  }

  drawField() {
    for (let i = 0; i < CONFIG.FIELD.COLUMNS; i++) {
      for (let j = 0; j < CONFIG.FIELD.ROWS; j++) {
        let enemyNumber = -1;
        if (this.cellsData[i][j] === 'E') {
          let e = 0;
          while (e < this.enemiesCount && enemyNumber === -1) {
            if (this.enemiesCoords[e][0] === i && this.enemiesCoords[e][1] === j) {
              enemyNumber = e;
            }
            e++;
          }
        }

        if (
          this.cellsData[i][j] !== this.cellsDataPrev[i][j] ||
          this.cellsData[i][j] === 'P' && (
            this.playerHealth !== this.playerHealthPrev ||
            this.playerAttacking ||
            this.playerAttackingPrev ||
            this.playerStrength !== this.playerStrengthPrev
          ) ||
          this.cellsData[i][j] === 'B' && (
            this.bossHealth !== this.bossHealthPrev ||
            this.bossAttacking ||
            this.bossAttackingPrev
          ) ||
          this.cellsData[i][j] === 'E' &&
          enemyNumber >= 0 && (
            this.enemiesHealth[enemyNumber] !== this.enemiesHealthPrev[enemyNumber] ||
            this.enemiesAttacking[enemyNumber] ||
            this.enemiesAttackingPrev[enemyNumber]
          )
        ) {
          const elemIndex = j * CONFIG.FIELD.COLUMNS + i;
          const newStyleClasses = 'tile' +
            (this.cellsData[i][j] !== '' ? ' tile' + this.cellsData[i][j] : '') +
            (this.gameStatus === 'active' && (
              this.cellsData[i][j] === 'P' && this.playerAttacking ||
              this.cellsData[i][j] === 'E' && this.enemiesAttacking[enemyNumber] ||
              this.cellsData[i][j] === 'B' && this.bossAttacking
            ) ? ' attack' : '')
          $('.field').children().eq(elemIndex).attr('class', newStyleClasses);

          if (this.cellsData[i][j] === 'P') {
            $('.field').children().eq(elemIndex).prop('style').setProperty('--hp', this.playerHealth+'%')
            $('.field').children().eq(elemIndex).prop('style').setProperty('--strength', this.playerStrength+'%')
          }
          if (this.cellsData[i][j] === 'E') {
            $('.field').children().eq(elemIndex).prop('style').setProperty('--hp', this.enemiesHealth[enemyNumber]+'%')
          }
          if (this.cellsData[i][j] === 'B') {
            $('.field').children().eq(elemIndex).prop('style').setProperty('--hp', this.bossHealth+'%')
          }

        }
      }
    }

    if (this.gameStatus === 'loss' || this.gameStatus === 'win') {
      $('.field').addClass(this.gameStatus);
    }
  }

  saveTickData() {
    this.cellsData.forEach((row, i) => {
      this.cellsDataPrev[i] = row.slice();
    });
    
    this.enemiesHealth.forEach((value, i) => {
      this.enemiesHealthPrev[i] = value;
    });
    this.bossHealthPrev = this.bossHealth;
    this.playerHealthPrev = this.playerHealth;

    this.playerStrengthPrev = this.playerStrength;
    
    this.playerMoved = false;

    this.playerAttackingPrev = this.playerAttacking;
    this.playerAttacking = false;
    this.bossAttackingPrev = this.bossAttacking;
    this.bossAttacking = false;
    this.enemiesAttacking.forEach((value, i) => {
      this.enemiesAttackingPrev[i] = value;
      this.enemiesAttacking[i] = false;
    });
  }

  generateCorridors() {
    function generateCorridorsNumbers(need, max) {
      const corridors = [];
  
      const availablePlaces = Array(max).fill(true);
  
      function countAvailablePlaces() {
        let counter = 0;
        for (let i = 0; i < max; i++) {
          if (availablePlaces[i]) {
            counter++;
          }
        }
        return counter;
      }
  
      function getPlaceNumber(availablePlaceNumber) {
        let i = 0;
        let needShift = availablePlaceNumber-1;
  
        while (needShift > 0 || !availablePlaces[i]) {
          if (availablePlaces[i]) {
            needShift--;
          }
          if (i++ >= max ) i = 0;
        }
        return i;
      }
  
      while (corridors.length < need && countAvailablePlaces() > 0) {
        const newPlaceWithinAvailable = getRandomInt(1, countAvailablePlaces());
        const newPlace = getPlaceNumber(newPlaceWithinAvailable);
        availablePlaces[newPlace] = false;
        if (newPlace - 1 >= 0) availablePlaces[newPlace - 1] = false;
        if (newPlace + 1 < max) availablePlaces[newPlace + 1] = false;
        corridors.push(newPlace);
      }
  
      return corridors;
    }

    this.corridorsH = generateCorridorsNumbers(
      getRandomInt(CONFIG.FIELD.CORRIDORS.MIN, CONFIG.FIELD.CORRIDORS.MAX),
      CONFIG.FIELD.ROWS
    );
    this.corridorsV = generateCorridorsNumbers(
      getRandomInt(CONFIG.FIELD.CORRIDORS.MIN, CONFIG.FIELD.CORRIDORS.MAX),
      CONFIG.FIELD.COLUMNS
    );

    for (let c = 0; c < this.corridorsH.length; c++) {
      for (let i = 0; i < CONFIG.FIELD.COLUMNS; i++) {
        this.cellsData[i][this.corridorsH[c]] = '';
      }  
    }

    for (let c = 0; c < this.corridorsV.length; c++) {
      for (let j = 0; j < CONFIG.FIELD.ROWS; j++) {
        this.cellsData[this.corridorsV[c]][j] = '';
      }  
    }
  }

  generateRooms() {
    function checkCorridors(baseX, baseY, lengthX, lengthY) {
      let result = false;
      
      for (let c = 0; c < this.corridorsV.length; c++) {
        if (this.corridorsV[c] >= baseX && this.corridorsV[c] <= baseX + lengthX - 1) {
          result = true;
          break;
        }
      }

      if (!result) {
        for (let c = 0; c < this.corridorsH.length; c++) {
          if (this.corridorsH[c] >= baseY && this.corridorsH[c] <= baseY + lengthY - 1) {
            result = true;
            break;
          }
        }
      }

      return result;
    }

    function checkRooms(baseX, baseY, lengthX, lengthY) {
      for (let i = baseX; i < baseX + lengthX; i++) {
        for (let j = baseY; j < baseY + lengthY; j++) {
          if (!availableCells[i][j]) {
            return false;
          }
        }    
      }
      return true;
    }

    function setSpaceForRoom(baseX, baseY, lengthX, lengthY) {
      for (let i = baseX; i < baseX + lengthX; i++) {
        for (let j = baseY; j < baseY + lengthY; j++) {
          availableCells[i][j] = false;
        }
      }
      for (const i of [baseX - 1, baseX + lengthX]) {
        if (i >= 0 && i < CONFIG.FIELD.COLUMNS) {
          for (let j = baseY; j < baseY + lengthY; j++) {
            if (j >= 0 && j < CONFIG.FIELD.ROWS) {
              availableCells[i][j] = false;
            }  
          }
        }
      }  
      for (const j of [baseY - 1, baseY + lengthY]) {
        if (j >= 0 && j < CONFIG.FIELD.ROWS) {
          for (let i = baseX + 1; i < baseX + lengthX - 1; i++) {
            if (i >= 0 && i < CONFIG.FIELD.COLUMNS) {
              availableCells[i][j] = false;
            }  
          }
        }
      }
    }

    function setRoom(baseX, baseY, lengthX, lengthY) {
      for (let i = baseX; i < baseX + lengthX; i++) {
        for (let j = baseY; j < baseY + lengthY; j++) {
          this.cellsData[i][j] = '';
        }
      }
    }

    const roomsCountNeed = getRandomInt(CONFIG.FIELD.ROOMS.MIN, CONFIG.FIELD.ROOMS.MAX);
    let roomsCount = 0;
    const iterationLimit = 1000;
    let iteration = 0;

    const availableCells = Array(CONFIG.FIELD.COLUMNS).fill().map(() => Array(CONFIG.FIELD.ROWS).fill(true));

    while (iteration < iterationLimit && roomsCount < roomsCountNeed) {
      const lengthX = getRandomInt(CONFIG.FIELD.ROOMS.SIZE.MIN, CONFIG.FIELD.ROOMS.SIZE.MAX);
      const lengthY = getRandomInt(CONFIG.FIELD.ROOMS.SIZE.MIN, CONFIG.FIELD.ROOMS.SIZE.MAX);
      const baseX = getRandomInt(0, CONFIG.FIELD.COLUMNS - lengthX);
      const baseY = getRandomInt(0, CONFIG.FIELD.ROWS - lengthY);

      if (
        checkCorridors.bind(this)(baseX, baseY, lengthX, lengthY) &&
        checkRooms(baseX, baseY, lengthX, lengthY)
      ) {
        setSpaceForRoom(baseX, baseY, lengthX, lengthY);
        setRoom.bind(this)(baseX, baseY, lengthX, lengthY);
        roomsCount++;
      }
      iteration++;
    }
  }

  placeItems(quantity, sign) {
    const iterationLimit = 1000;
    let iteration = 0;
    let itemsCount = 0;
    let x, y;

    while(iteration < iterationLimit && itemsCount < quantity) {
      x = getRandomInt(0, CONFIG.FIELD.COLUMNS - 1);
      y = getRandomInt(0, CONFIG.FIELD.ROWS - 1);
      if (this.cellsData[x][y] === '') {
        this.cellsData[x][y] = sign;
        itemsCount++;
      }
      iteration++;
    }
  }

  placePlayer() {
    let playerPlaced = false;
    let x, y;

    while(!playerPlaced) {
      x = getRandomInt(0, CONFIG.FIELD.COLUMNS - 1);
      y = getRandomInt(0, CONFIG.FIELD.ROWS - 1);
      if (this.cellsData[x][y] === '') {
        this.cellsData[x][y] = 'P';
        this.playerCoords = [x, y];
        playerPlaced = true;
      }
    }
  }

  placeEnemies(quantity) {
    const iterationLimit = 1000;
    let iteration = 0;
    let x, y;

    while (iteration < iterationLimit && this.enemiesCount < quantity) {
      x = getRandomInt(0, CONFIG.FIELD.COLUMNS - 1);
      y = getRandomInt(0, CONFIG.FIELD.ROWS - 1);
      if (
        this.cellsData[x][y] === '' &&
        Math.abs(x - this.playerCoords[0]) > CONFIG.ENEMY.STARTING_DISTANCE &&
        Math.abs(y - this.playerCoords[1]) > CONFIG.ENEMY.STARTING_DISTANCE
      ) {
        this.cellsData[x][y] = 'E';
        this.enemiesCoords.push([x, y]);
        this.enemiesHealth.push(100);
        this.enemiesHealthPrev.push(100);
        this.enemiesAttacking.push(false);
        this.enemiesAttackingPrev.push(false);
        this.enemiesCount++;
      }
      iteration++;
    }
  }

  placeBoss() {
    const iterationLimit = 1000;
    let iteration = 0;
    let bossPlaced = false;
    let x, y;

    while (iteration < iterationLimit && !bossPlaced) {
      x = getRandomInt(0, CONFIG.FIELD.COLUMNS - 1);
      y = getRandomInt(0, CONFIG.FIELD.ROWS - 1);
      if (
        this.cellsData[x][y] === '' &&
        Math.abs(x - this.playerCoords[0]) > CONFIG.BOSS.STARTING_DISTANCE &&
        Math.abs(y - this.playerCoords[1]) > CONFIG.BOSS.STARTING_DISTANCE
      ) {
        this.cellsData[x][y] = 'B';
        this.bossCoords = [x, y];
        this.bossHealth = 100;
        this.bossHealthPrev = 100;
        this.bossCount++;
        bossPlaced = true;
      }
      iteration++;
    }
  }

}
