// ペヨーテの旅路 (VS-Lite版) - Phaser.js プロトタイプ

// ゲーム設定
const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    backgroundColor: '#222222',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
        preload,
        create,
        update
    },
    plugins: {
        scene: [
            {
                key: 'rexVirtualJoystick',
                plugin: rexvirtualjoystickplugin,
                mapping: 'rexVirtualJoystick'
            }
        ]
    }
};

const game = new Phaser.Game(config);

// グローバル変数
let player;
let cursors;
let targetPosition;

let gameOverTriggered = false;
let healthBar;
let expBar;
let levelText;
let scoreText;
let timeText;
let gameTime = 0;
let score = 0;
let level = 1;
let experience = 0;
let expToNextLevel = 20;
let health = 100;
let maxHealth = 100;
let influenceCircle;
let influenceCooldown = 0;
let influenceMaxCooldown = 1;
let influencePower = 10;
let influenceRadius = 50;
let symbols = [];
let expOrbs = [];
let playerInvincible = 0;

function preload() {
    this.load.image('player', 'assets/images/player.png');

    this.load.spritesheet('enemy_walk', 'assets/images/lpc_teen_animations_2025-04-08T05-06-21/standard/walk.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('enemy_idle', 'assets/images/lpc_teen_animations_2025-04-08T05-06-21/standard/idle.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('enemy_jump', 'assets/images/lpc_teen_animations_2025-04-08T05-06-21/standard/jump.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('enemy_emote', 'assets/images/lpc_teen_animations_2025-04-08T05-06-21/standard/emote.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('enemy_sit', 'assets/images/lpc_teen_animations_2025-04-08T05-06-21/standard/sit.png', {
        frameWidth: 64,
        frameHeight: 64
    });

}

function create() {
    player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player');
    player.setScale(0.3);
    player.setDepth(10);
    player.body.setCircle(38, -38 + player.width / 2, -38 + player.height / 2);

    this.anims.create({
        key: 'enemy_walk_down',
        frames: this.anims.generateFrameNumbers('enemy_walk', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'enemy_walk_left',
        frames: this.anims.generateFrameNumbers('enemy_walk', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'enemy_walk_right',
        frames: this.anims.generateFrameNumbers('enemy_walk', { start: 16, end: 23 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'enemy_walk_up',
        frames: this.anims.generateFrameNumbers('enemy_walk', { start: 24, end: 31 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'enemy_idle',
        frames: this.anims.generateFrameNumbers('enemy_idle', { start: 0, end: 7 }),
        frameRate: 5,
        repeat: -1
    });

    this.anims.create({
        key: 'enemy_jump',
        frames: this.anims.generateFrameNumbers('enemy_jump', { start: 0, end: 7 }),
        frameRate: 5,
        repeat: -1
    });

    this.anims.create({
        key: 'enemy_emote',
        frames: this.anims.generateFrameNumbers('enemy_emote', { start: 0, end: 7 }),
        frameRate: 5,
        repeat: -1
    });

    this.anims.create({
        key: 'enemy_sit',
        frames: this.anims.generateFrameNumbers('enemy_sit', { start: 0, end: 7 }),
        frameRate: 5,
        repeat: -1
    });


    influenceCircle = this.add.circle(0, 0, influenceRadius, 0x00ffff, 0.3);
    influenceCircle.setVisible(false);
    influenceCircle.setDepth(5);


    cursors = this.input.keyboard.createCursorKeys();

    targetPosition = new Phaser.Math.Vector2(config.width / 2, config.height / 2);
    this.input.on('pointermove', (pointer) => {
        if (pointer.isDown) {
            targetPosition.x = pointer.x;
            targetPosition.y = pointer.y;
        }
    });

    createUI(this);

    this.time.addEvent({
        delay: 1000,
        callback: () => {
            const spawnCount = Math.min(level + 2, 10);
            for(let i = 0; i < spawnCount; i++) {
                spawnSymbol(this);
            }
        },
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 100,
        callback: updateInfluence,
        callbackScope: this,
        loop: true
    });

    experience = 0;
    expToNextLevel = calculateExpToNextLevel();
    updateExpBar();

    // ユーザーのジェスチャーでオーディオコンテキストを再開
    this.sound.pauseOnBlur = false;
    
    // 画面タップでオーディオを有効化
    this.input.once('pointerdown', () => {
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
    });
}

function update(time, delta) {
    const dt = delta / 1000;

    if (!gameClearTriggered && !gameOverTriggered) {
        gameTime += dt;
        updateTimeText();
        updateScoreText();
        updateLevelText();
        
        const dx = targetPosition.x - player.x;
        const dy = targetPosition.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 5) {
            player.setVelocity(0, 0);
        } else {
            const speed = 50;
            player.setVelocity((dx / dist) * speed, (dy / dist) * speed);
        }
    }

    if (playerInvincible > 0) {
        playerInvincible -= dt;
        player.alpha = Math.sin(time * 20) > 0 ? 0.3 : 1;
    } else {
        player.alpha = 1;
    }

    updateSymbols(dt);
    updateExpOrbs(dt);

    if (influenceCooldown > 0) influenceCooldown -= dt;

    player.x = Phaser.Math.Clamp(player.x, 0, config.width);
    player.y = Phaser.Math.Clamp(player.y, 0, config.height);

    // クリア条件は15分経過のみ
}

function createUI(scene) {
    const barWidth = 320;
    const healthBarX = (config.width - barWidth) / 2;
    const expBarX = (config.width - barWidth) / 2;

    const healthBarBg = scene.add.rectangle(healthBarX, config.height - 60, barWidth, 20, 0x333333);
    healthBar = scene.add.rectangle(healthBarX, config.height - 60, barWidth, 20, 0x00ff00);
    healthBarBg.setDepth(20);
    healthBar.setDepth(21);

    healthBar.setOrigin(0, 0.5);
    healthBarBg.setOrigin(0, 0.5);

    const expBarBg = scene.add.rectangle(expBarX, config.height - 30, barWidth, 10, 0x333333);
    expBar = scene.add.rectangle(expBarX, config.height - 30, 0, 10, 0x0000ff);
    expBarBg.setDepth(20);
    expBar.setDepth(21);

    expBar.setOrigin(0, 0.5);
    expBarBg.setOrigin(0, 0.5);

    levelText = scene.add.text(config.width - 80, 20, 'Lv.1', { fontSize: '24px', fill: '#fff' }).setDepth(20);
    scoreText = scene.add.text(20, 20, 'Score: 0', { fontSize: '18px', fill: '#fff' }).setDepth(20);
    timeText = scene.add.text(20, 50, 'Time: 0:00', { fontSize: '18px', fill: '#fff' }).setDepth(20);
}

function updatePlayerMovement() {
    let moveX = 0, moveY = 0;
    if (cursors.left.isDown) moveX -= 1;
    if (cursors.right.isDown) moveX += 1;
    if (cursors.up.isDown) moveY -= 1;
    if (cursors.down.isDown) moveY += 1;

    if (moveX !== 0 || moveY !== 0) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= len;
        moveY /= len;
        player.setVelocity(moveX * 200, moveY * 200);
    } else {
        const dx = targetPosition.x - player.x;
        const dy = targetPosition.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
            player.setVelocity(0, 0);
        } else {
            player.setVelocity((dx / dist) * 200, (dy / dist) * 200);
        }
    }
}

function spawnSymbol(scene) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
        case 0: x = Math.random() * config.width; y = -20; break;
        case 1: x = config.width + 20; y = Math.random() * config.height; break;
        case 2: x = Math.random() * config.width; y = config.height + 20; break;
        case 3: x = -20; y = Math.random() * config.height; break;
    }

    const types = ['business', 'academic', 'artist', 'political', 'meditator'];
    const type = types[Math.floor(Math.random() * types.length)];

    const sprite = scene.physics.add.sprite(x, y, 'enemy_walk');
    sprite.setScale(1);
    sprite.setDepth(5);
    sprite.anims.play('enemy_walk_down');
    sprite.symbolType = type;
    sprite.transformationMeter = 0;
    sprite.transformationState = 0;
    sprite.health = 20;
    sprite.moveSpeed = 100 + Math.random() * 100;
    sprite.transformationResistance = 1.0;

    sprite.invincibleTimer = 0;

    sprite.targetPosition = new Phaser.Math.Vector2(Math.random() * 800, Math.random() * 600);
    sprite.movementTimer = 0;
    sprite.nextMovementTime = 1000 + Math.random() * 2000;

    scene.physics.add.overlap(player, sprite, onPlayerHitSymbol, null, scene);
    symbols.push(sprite);
}

function updateSymbols(dt) {
    for (let i = symbols.length - 1; i >= 0; i--) {
        const s = symbols[i];

        if (s.invincibleTimer > 0) {
            s.invincibleTimer -= dt;
            continue;
        }

        s.movementTimer += dt * 1000;
        if (s.movementTimer >= s.nextMovementTime) {
            s.targetPosition.x = Math.random() * config.width;
            s.targetPosition.y = Math.random() * config.height;
            s.movementTimer = 0;
            s.nextMovementTime = 1000 + Math.random() * 2000;
        }
        const dx = s.targetPosition.x - s.x;
        const dy = s.targetPosition.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) {
            s.setVelocity(0, 0);
        } else {
            const vx = (dx / dist) * s.moveSpeed;
            const vy = (dy / dist) * s.moveSpeed;
            s.setVelocity(vx, vy);

            // 向きに応じてアニメーション切り替え - ここを修正
            if (Math.abs(vx) > Math.abs(vy)) {
                if (vx > 0) {
                    s.anims.play('enemy_walk_right', true);
                } else {
                    s.anims.play('enemy_walk_left', true);
                }
            } else {
                if (vy > 0) {
                    s.anims.play('enemy_walk_down', true); // 下方向に移動
                } else {
                    s.anims.play('enemy_walk_up', true); // 上方向に移動
                }
            }
        }
    }
}

function updateExpOrbs(dt) {}

function updateInfluence() {
    if (influenceCooldown > 0) return;
    activateInfluence(this);
    influenceCooldown = influenceMaxCooldown;
}

function activateInfluence(scene) {
    influenceCircle.x = player.x;
    influenceCircle.y = player.y;
    influenceCircle.setVisible(true);

    scene.time.delayedCall(300, () => {
        influenceCircle.setVisible(false);
    });

    for (const s of symbols) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, s.x, s.y);
        if (dist <= influenceRadius) {
            applyInfluenceToSymbol(s, scene);
        }
    }
}

function applyInfluenceToSymbol(symbol, scene) {
    if (symbol.transformationState === 3) return;
    if (symbol.invincibleTimer > 0) return;

    symbol.transformationState++;
    updateSymbolVisualEffects(symbol);

    const dx = symbol.x - player.x;
    const dy = symbol.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    if (symbol.transformationState === 1) {
        symbol.setVelocity(nx * 50, ny * 50);
        symbol.invincibleTimer = 1.5;
    } else if (symbol.transformationState === 2) {
        symbol.setVelocity(nx * 75, ny * 75);
        symbol.invincibleTimer = 1.5;
    } else if (symbol.transformationState === 3) {
        symbol.setVelocity(0, 0);
        symbol.invincibleTimer = 2;
        onSymbolFullyTransformed(symbol, scene);
    }
}

function updateSymbolTransformationState(symbol) {
    const oldState = symbol.transformationState;
    if (symbol.transformationMeter >= 100) {
        symbol.transformationState = 3;
    } else if (symbol.transformationMeter >= 50) {
        symbol.transformationState = 2;
    } else if (symbol.transformationMeter >= 25) {
        symbol.transformationState = 1;
    } else {
        symbol.transformationState = 0;
    }
    if (oldState !== symbol.transformationState) {
        updateSymbolVisualEffects(symbol);
    }
}

function updateSymbolVisualEffects(symbol) {
    switch (symbol.transformationState) {
        case 0:
            symbol.setTint(0xffffff);
            symbol.setTexture('enemy_walk');
            symbol.anims.play('enemy_walk_down', true);
            break;
        case 1:
            symbol.setTint(0x66ccff);
            symbol.setTexture('enemy_jump');
            symbol.anims.play('enemy_jump', true);
            break;
        case 2:
            symbol.setTint(0x3399ff);
            symbol.setTexture('enemy_emote');
            symbol.anims.play('enemy_emote', true);
            break;
        case 3:
            symbol.setTint(0x00ff00);
            symbol.setTexture('enemy_sit');
            symbol.anims.play('enemy_sit', true);
            break;
    }
}

function onSymbolFullyTransformed(symbol, scene) {
    symbol.setVelocity(0, 0);

    // パーティクル削除済み

    addExperience(10);
    score += 10;
    updateScoreText();

    scene.time.delayedCall(2000, () => {
        const idx = symbols.indexOf(symbol);
        if (idx !== -1) symbols.splice(idx, 1);
        symbol.destroy();
    });
}

function createExperienceOrb(x, y, value) {
    // 省略（必要なら後で実装）
}

function onPlayerHitSymbol(player, symbol) {
    if (symbol.transformationState < 3) {
        takeDamage(5);
    }
}

function takeDamage(amount) {
    if (playerInvincible > 0) return;
    health = Math.max(0, health - amount);
    updateHealthBar();
    playerInvincible = 1.5;
    if (health <= 0) gameOver();
}

function addExperience(amount) {
    experience += amount;
    checkLevelUp();
    updateExpBar();
}

function checkLevelUp() {
    while (experience >= expToNextLevel) {
        experience -= expToNextLevel;
        level++;
        if (level >= 10 && !gameClearTriggered) gameClear();
        expToNextLevel = calculateExpToNextLevel();
        onLevelUp();
    }
}

function onLevelUp() {
    updateLevelText();
    upgradeInfluence();
}

function upgradeInfluence() {
    const t = Math.floor(Math.random() * 3);
    if (t === 0) influencePower += 5;
    else if (t === 1) {
        influenceRadius += 10;
        influenceCircle.setRadius(influenceRadius);
    } else if (t === 2) {
        influenceMaxCooldown = Math.max(0.5, influenceMaxCooldown - 0.1);
    }
}

function updateHealthBar() {
    healthBar.width = (health / maxHealth) * 320;
}

function updateExpBar() {
    const ratio = Math.max(0, Math.min(experience / expToNextLevel, 1));
    expBar.width = ratio * 320;
}

function updateLevelText() {
    levelText.setText(`Lv.${level}`);
}

function updateScoreText() {
    scoreText.setText(`Score: ${score}`);
}

function updateTimeText() {
    const m = Math.floor(gameTime / 60);
    const s = Math.floor(gameTime % 60);
    timeText.setText(`Time: ${m}:${s.toString().padStart(2, '0')}`);
}

function calculateExpToNextLevel() {
    return 20 + (level - 1) * 20;
}

let gameClearTriggered = false;

function gameOver() {
    if (gameClearTriggered) return;
    gameClearTriggered = true;
    game.scene.pause();
    const scene = game.scene.scenes[0];
    scene.add.text(config.width / 2, config.height / 2 - 50, 'GAME OVER', { fontSize: '48px', fill: '#ff0000' }).setOrigin(0.5);
    const restartButton = scene.add.text(config.width / 2, config.height / 2 + 50, 'Restart', { fontSize: '24px', fill: '#ffffff', backgroundColor: '#333333', padding: { left: 20, right: 20, top: 10, bottom: 10 } }).setOrigin(0.5).setInteractive();
    restartButton.on('pointerdown', () => window.location.reload());
}

function gameClear() {
    if (gameClearTriggered) return;
    gameClearTriggered = true;
    game.scene.pause();
    const scene = game.scene.scenes[0];
    scene.add.text(config.width / 2, config.height / 2 - 50, 'CLEAR!', { fontSize: '48px', fill: '#00ff00' }).setOrigin(0.5);
    const restartButton = scene.add.text(config.width / 2, config.height / 2 + 50, 'Restart', { fontSize: '24px', fill: '#ffffff', backgroundColor: '#333333', padding: { left: 20, right: 20, top: 10, bottom: 10 } }).setOrigin(0.5).setInteractive();
    restartButton.on('pointerdown', () => window.location.reload());
}
