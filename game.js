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
    }
};

const game = new Phaser.Game(config);

// グローバル変数
let player;
let cursors;
let targetPosition;

let gameOverTriggered = false;
let gameClearTriggered = false;
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
let influenceRadius = 120;
let symbols = [];
let expOrbs = [];
let playerInvincible = 0;

// ペヨーテの棘（弾）関連の変数
let spines; // 弾のグループ
let spineCooldown = 0; // 弾のクールダウン
let spineMaxCooldown = 0.5; // 弾の発射間隔（秒）
let spineSpeed = 600; // 弾の速度
let spineLength = 30; // 弾の長さ
let spineDamage = 7; // 弾のダメージ量

// 背景関連の変数
let backgrounds = [];
let backgroundSpeed = 3.0; // さらに3倍速く（1.0から3.0へ）
let backgroundVelocityX = -1; // 背景の移動方向（負の値で左方向）
let backgroundVelocityY = -0.5; // 背景の移動方向（負の値で上方向）

// 音楽関連の変数
let music;
let musicTracks = [];

function preload() {
    this.load.image('player', 'assets/images/player.png');

    // 背景画像の読み込み - 一枚だけ読み込む
    this.load.image('background', `assets/images/songCoverImage/Song_Cover_Image_3.jpg`);

    // 音楽ファイルの読み込み
    this.load.audio('music1', 'assets/audio/Cacti_Dreams.mp3');
    this.load.audio('music2', 'assets/audio/Desert_Mirage.mp3');
    this.load.audio('music3', 'assets/audio/Peyote_Nights.mp3');

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
    // 背景の作成
    createBackground(this);

    // 音楽の設定 - タッチ/クリック後に開始するよう変更
    const scene = this;
    
    // AudioContextの警告を回避するためにユーザー操作後に音楽を開始
    scene.input.once('pointerdown', function() {
        setupMusic(scene);
    });

    player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player');
    player.setScale(0.3);
    player.setDepth(10);
    // 当たり判定を小さくする - 半径を20に変更（以前は38）
    player.body.setCircle(20, -20 + player.width / 2, -20 + player.height / 2);

    // 注意：スプライトシートの実際の並びに合わせてアニメーションを定義
    // ※1段目（0-7）は上向き、4段目（24-31）は下向き
    this.anims.create({
        key: 'enemy_walk_up',
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
        key: 'enemy_walk_down',
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

    // ペヨーテの棘（弾）のグループを作成
    spines = this.physics.add.group();

    influenceCircle = this.add.circle(0, 0, influenceRadius, 0x00ffff, 0.3);
    influenceCircle.setVisible(false);
    influenceCircle.setDepth(5);


    cursors = this.input.keyboard.createCursorKeys();

    targetPosition = new Phaser.Math.Vector2(config.width / 2, config.height / 2);
    this.input.on('pointerdown', (pointer) => {
        // ゲームクリア後はタップでリトライを優先
        if (gameClearTriggered) {
            return;
        }
        
        // タップは移動専用に変更
        targetPosition.x = pointer.x;
        targetPosition.y = pointer.y;
    });

    // キーボード用の発射機能は残す
    this.input.keyboard.on('keydown-SPACE', () => {
        // ゲームクリア後は無効
        if (gameClearTriggered) {
            return;
        }
        
        // スペースキーでも発射（プレイヤーの前方向に）
        const dx = Math.cos(player.rotation);
        const dy = Math.sin(player.rotation);
        shootSpine(this, player.x + dx * 100, player.y + dy * 100);
    });

    createUI(this);

    this.time.addEvent({
        delay: 1500,
        callback: () => {
            let spawnCount = 1;
            
            if (level >= 2) spawnCount = 2;
            if (level >= 4) spawnCount = 3;
            if (level >= 6) spawnCount = 4;
            if (level >= 8) spawnCount = 5;
            
            spawnCount = Math.min(spawnCount, 5);
            
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

    // ペヨーテの棘発射のクールダウン更新用タイマー
    this.time.addEvent({
        delay: 100,
        callback: updateSpineCooldown,
        callbackScope: this,
        loop: true
    });

    // 自動弾発射タイマーを追加
    this.time.addEvent({
        delay: 1000, // 1秒間隔で発射
        callback: () => {
            if (!gameClearTriggered && !gameOverTriggered) {
                // プレイヤーの周囲にいる最も近い敵を探す
                let nearestSymbol = null;
                let minDist = Infinity;
                
                for (const s of symbols) {
                    if (s.transformationState < 3) { // 変身完了していない敵のみ
                        const dist = Phaser.Math.Distance.Between(player.x, player.y, s.x, s.y);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestSymbol = s;
                        }
                    }
                }
                
                // 一番近い敵がいればその方向に発射
                if (nearestSymbol) {
                    shootSpine(this, nearestSymbol.x, nearestSymbol.y);
                } else {
                    // 敵がいない場合はランダムな方向に発射
                    const randomAngle = Math.random() * Math.PI * 2;
                    const targetX = player.x + Math.cos(randomAngle) * 100;
                    const targetY = player.y + Math.sin(randomAngle) * 100;
                    shootSpine(this, targetX, targetY);
                }
            }
        },
        callbackScope: this,
        loop: true
    });
}

// 背景の作成 - 常に中央部分が表示されるように配置
function createBackground(scene) {
    try {
        // 背景画像を作成 - 画面中央に配置
        const bg = scene.add.image(config.width/2, config.height/2, 'background');
        bg.setDepth(0); // 最背面に配置
        
        // 画像を画面全体よりも適度な大きさに設定（画質を考慮して縮小）
        const maxScale = Math.max(
            (config.width / bg.width) * 3.0, // 5.0から3.0に縮小
            (config.height / bg.height) * 3.0 // 5.0から3.0に縮小
        );
        bg.setScale(maxScale);
        
        // 中心を原点として配置
        bg.setOrigin(0.5, 0.5);
        
        backgrounds = [bg]; // 背景は1つだけ
    } catch (e) {
        console.error("背景作成エラー:", e);
        // エラーが発生した場合は単色の背景を作成
        scene.cameras.main.setBackgroundColor('#222222');
    }
}

// 背景のスクロール更新 - 中央原点に合わせて調整
function updateBackground(dt) {
    try {
        if (backgrounds.length === 0) return;
        
        const bg = backgrounds[0];
        
        // 背景を移動（dt値で調整された一定の速度）
        bg.x += backgroundVelocityX * backgroundSpeed * dt;
        bg.y += backgroundVelocityY * backgroundSpeed * dt;
        
        // 背景画像のサイズを取得（原点は中央なので半分で計算）
        const bgHalfWidth = (bg.width * bg.scaleX) / 2;
        const bgHalfHeight = (bg.height * bg.scaleY) / 2;
        
        // 画面サイズ
        const screenHalfWidth = config.width / 2;
        const screenHalfHeight = config.height / 2;
        
        // 画像の端が見える前の安全マージン（十分大きく取る）
        const safeMarginX = bgHalfWidth - screenHalfWidth - 100;
        const safeMarginY = bgHalfHeight - screenHalfHeight - 100;
        
        // 画面端に近づく前に方向転換（画像の端が見える前）
        if (Math.abs(bg.x - config.width/2) >= safeMarginX * 0.8) {
            backgroundVelocityX *= -1; // X方向を反転
        }
        
        if (Math.abs(bg.y - config.height/2) >= safeMarginY * 0.8) {
            backgroundVelocityY *= -1; // Y方向を反転
        }
        
        // 背景位置に絶対的な制限を設ける（保険）
        bg.x = Phaser.Math.Clamp(
            bg.x, 
            config.width/2 - safeMarginX, 
            config.width/2 + safeMarginX
        );
        bg.y = Phaser.Math.Clamp(
            bg.y, 
            config.height/2 - safeMarginY, 
            config.height/2 + safeMarginY
        );
    } catch (e) {
        console.error("背景更新エラー:", e);
    }
}

// 音楽の設定
function setupMusic(scene) {
    try {
        // AudioContextのロック解除を確認
        if (scene.sound.context.state === 'suspended') {
            scene.sound.context.resume();
        }
        
        musicTracks = [
            scene.sound.add('music1'),
            scene.sound.add('music2'),
            scene.sound.add('music3')
        ];
        
        // ランダムな曲を選択して再生
        playRandomMusic();
        
        // 曲が終わったら次の曲を再生
        musicTracks.forEach(track => {
            track.once('complete', playRandomMusic);
        });
    } catch (e) {
        console.error("音楽の読み込みエラー:", e);
        // エラーが発生しても処理を続行
    }
}

// ランダムな曲を再生
function playRandomMusic() {
    try {
        // 前の曲が再生中なら停止
        if (music && music.isPlaying) {
            music.stop();
        }
        
        // ランダムに曲を選んで再生
        if (musicTracks && musicTracks.length > 0) {
            const index = Math.floor(Math.random() * musicTracks.length);
            music = musicTracks[index];
            music.play({
                volume: 0.5
            });
        }
    } catch (e) {
        console.error("音楽再生エラー:", e);
    }
}

function update(time, delta) {
    const dt = delta / 1000;

    if (!gameClearTriggered && !gameOverTriggered) {
        gameTime += dt;
        updateTimeText();
        updateScoreText();
        updateLevelText();
        
        updatePlayerMovement();
        
        // 背景のスクロール更新
        updateBackground(dt);
        
        // ゲームクリア条件をチェック
        checkGameClear.call(this);
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
    if (spineCooldown > 0) spineCooldown -= dt;

    player.x = Phaser.Math.Clamp(player.x, 0, config.width);
    player.y = Phaser.Math.Clamp(player.y, 0, config.height);
}

// クリア条件をチェックする関数
function checkGameClear() {
    // レベル10に到達でゲームクリア
    if (level >= 10 && !gameClearTriggered) {
        gameClearTriggered = true;
        
        // ペヨーテくんを大きく表示
        const centerX = config.width / 2;
        const centerY = config.height / 2;
        const scene = this;
        
        // 現在の位置から中央に移動
        this.tweens.add({
            targets: player,
            x: centerX,
            y: centerY,
            scale: 0.8, // 通常の0.3から大きくする
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                // 回転アニメーション
                scene.tweens.add({
                    targets: player,
                    angle: 360,
                    duration: 2000,
                    ease: 'Power1',
                    repeat: -1
                });
                
                // 拡大縮小アニメーション
                scene.tweens.add({
                    targets: player,
                    scale: 1.0,
                    duration: 1500,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
                
                // 光の輝きエフェクト（Phaser 3.60以降対応）
                try {
                    // 単純な光るエフェクト
                    const glowCircle = scene.add.circle(player.x, player.y, 30, 0xffff00, 0.3);
                    glowCircle.setDepth(player.depth - 1);
                    
                    // 輝きアニメーション
                    scene.tweens.add({
                        targets: glowCircle,
                        scale: 1.5,
                        alpha: 0.1,
                        duration: 1000,
                        yoyo: true,
                        repeat: -1
                    });
                    
                    // プレイヤーに追従
                    scene.time.addEvent({
                        delay: 16,
                        callback: () => {
                            glowCircle.x = player.x;
                            glowCircle.y = player.y;
                        },
                        loop: true
                    });
                } catch (e) {
                    console.error("エフェクト作成エラー:", e);
                }
                
                // クリア報酬の表示
                displayClearRewards(scene, centerX, centerY);
                
                // 画面全体をタップ可能に（リトライ用）
                scene.input.on('pointerdown', function() {
                    console.log('画面タップでリトライします...');
                    
                    // タップした時の視覚的なフィードバック
                    scene.cameras.main.flash(500, 255, 255, 255);
                    scene.cameras.main.shake(300, 0.02);
                    
                    // フラッシュ後にリスタート
                    scene.time.delayedCall(700, () => {
                        window.location.reload();
                    });
                });
                
                // タップを促すテキストを表示
                const tapText = scene.add.text(centerX, centerY + 300, '画面をタップしてリトライ！', {
                    fontFamily: 'Arial',
                    fontSize: 24,
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4,
                    backgroundColor: '#333333',
                    padding: { left: 10, right: 10, top: 5, bottom: 5 }
                }).setOrigin(0.5);
                
                // 点滅アニメーション
                scene.tweens.add({
                    targets: tapText,
                    alpha: 0.6,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
            }
        });
        
        // "GAME CLEAR!" テキストを表示（キラキラ効果付き）
        const clearText = this.add.text(centerX, centerY - 150, 'GAME CLEAR!', {
            fontFamily: 'Arial',
            fontSize: 48,
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // テキストをキラキラさせる
        this.tweens.add({
            targets: clearText,
            alpha: 0.7,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }
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
    sprite.moveSpeed = 70 + Math.random() * 70;
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

            // 向きに応じてアニメーション切り替え - 修正済み
            if (Math.abs(vx) > Math.abs(vy)) {
                if (vx > 0) {
                    s.anims.play('enemy_walk_right', true);
                } else {
                    s.anims.play('enemy_walk_left', true);
                }
            } else {
                if (vy > 0) {
                    s.anims.play('enemy_walk_down', true); // 下に移動しているなら下向きアニメーション
                } else {
                    s.anims.play('enemy_walk_up', true); // 上に移動しているなら上向きアニメーション
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
        symbol.invincibleTimer = 1.0;
    } else if (symbol.transformationState === 2) {
        symbol.setVelocity(nx * 75, ny * 75);
        symbol.invincibleTimer = 1.0;
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

    // パーティクル作成（省略可能）

    addExperience(10); // 20から10に減少
    score += 10; // 20から10に減少
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
    playerInvincible = 0.5;
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
    if (t === 0) {
        // 影響力の強さを増加（弱化）
        influencePower += 5; // 10から5に減少
    } else if (t === 1) {
        // 影響範囲を拡大（弱化）
        influenceRadius += 10; // 25から10に減少
        influenceCircle.setRadius(influenceRadius);
    } else if (t === 2) {
        // クールダウンを減少（弱化）
        influenceMaxCooldown = Math.max(0.5, influenceMaxCooldown - 0.1); // 0.15から0.1に減少、最小値も0.3から0.5に変更
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
    // レベルアップに必要な経験値を増加
    return 20 + (level - 1) * 20; // 15 + (level - 1) * 15から変更
}

function gameOver() {
    if (gameClearTriggered) return;
    gameClearTriggered = true;
    game.scene.pause();
    const scene = game.scene.scenes[0];
    scene.add.text(config.width / 2, config.height / 2 - 50, 'GAME OVER', { fontSize: '48px', fill: '#ff0000' }).setOrigin(0.5);
    const restartButton = scene.add.text(config.width / 2, config.height / 2 + 50, 'Restart', { fontSize: '24px', fill: '#ffffff', backgroundColor: '#333333', padding: { left: 20, right: 20, top: 10, bottom: 10 } }).setOrigin(0.5).setInteractive();
    restartButton.on('pointerdown', () => window.location.reload());
}

// ゲームクリア関数
function gameClear() {
    // checkGameClear関数で処理するようになったので、この関数は最小限に
    if (gameClearTriggered) return;
    checkGameClear.call(game.scene.scenes[0]);
}

// 新しく追加：クリア報酬を表示する関数
function displayClearRewards(scene, centerX, centerY) {
    // 報酬テキスト（最終スコアとボーナスポイント）
    const bonus = level * 500;
    const finalScore = score + bonus;
    
    // スコア情報の表示
    const scoreInfo = scene.add.text(centerX, centerY + 100, `最終スコア: ${finalScore}`, {
        fontFamily: 'Arial',
        fontSize: 32,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5);
    
    const bonusInfo = scene.add.text(centerX, centerY + 150, `クリアボーナス: +${bonus}`, {
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    // スコアカウントアップアニメーション
    let currentScore = score;
    const scoreInterval = setInterval(() => {
        currentScore += Math.ceil((finalScore - currentScore) / 10) || 1;
        scoreInfo.setText(`最終スコア: ${currentScore}`);
        
        if (currentScore >= finalScore) {
            clearInterval(scoreInterval);
            
            // "おめでとう！" テキスト
            const congratsText = scene.add.text(centerX, centerY + 200, 'おめでとう！旅の終わりだ！', {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#ff88ff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setAlpha(0);
            
            // フェードイン
            scene.tweens.add({
                targets: congratsText,
                alpha: 1,
                duration: 1000,
                ease: 'Power2'
            });
            
            // リスタートボタンはキャラクタータップに置き換えるため削除
        }
    }, 50);
}

// ペヨーテの棘のクールダウン更新
function updateSpineCooldown(dt) {
    if (spineCooldown > 0) {
        spineCooldown -= 0.1; // 100ms間隔で呼び出されるため0.1秒減少
    }
}

// ペヨーテの棘を発射する関数
function shootSpine(scene, targetX, targetY) {
    // クールダウン中なら発射しない
    if (spineCooldown > 0) return;
    
    // クールダウンをリセット
    spineCooldown = spineMaxCooldown;
    
    // プレイヤーの位置から目標位置への方向ベクトルを計算
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const angle = Math.atan2(dy, dx);
    
    // 方向ベクトルを正規化
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    
    // 緑色の線（棘）を作成 - より棘らしく改良
    const spine = scene.add.line(
        player.x, player.y,
        0, 0,
        spineLength * nx, spineLength * ny,
        0x00ff00, 1
    );
    spine.setLineWidth(3); // 線の太さを増加
    spine.setDepth(9); // プレイヤーの下、他のオブジェクトの上に表示
    
    // 棘らしいデザインを追加（短い線を数本追加）
    const spineCount = 3; // 追加する棘の数
    const spineGraphics = scene.add.graphics();
    spineGraphics.lineStyle(2, 0x00ff00, 0.8);
    
    // メイン棘の両側に短い棘を追加
    for (let i = 0; i < spineCount; i++) {
        // 側面にランダムな長さの棘を追加
        const subLength = spineLength * (0.3 + Math.random() * 0.3); // メイン棘の30-60%の長さ
        const offsetRatio = 0.4 + (i / spineCount) * 0.6; // 棘の位置（40-100%の位置に配置）
        
        // 左右にわずかにずらした位置に棘を追加
        const sideOffset = Math.random() > 0.5 ? 1 : -1;
        const perpX = -ny * sideOffset * 5; // 垂直方向に少しずらす
        const perpY = nx * sideOffset * 5;
        
        // 棘の開始点と終了点
        const startX = player.x + nx * (spineLength * offsetRatio);
        const startY = player.y + ny * (spineLength * offsetRatio);
        const endX = startX + perpX + nx * subLength * 0.5;
        const endY = startY + perpY + ny * subLength * 0.5;
        
        spineGraphics.lineBetween(startX, startY, endX, endY);
    }
    
    // グラフィックスを弾の子要素として追加
    spineGraphics.setDepth(9);
    scene.physics.world.enable(spineGraphics);
    spineGraphics.body.setVelocity(nx * spineSpeed, ny * spineSpeed);
    
    // 3秒後に自動的に削除
    scene.time.delayedCall(3000, () => {
        spineGraphics.destroy();
    });
    
    // 物理ボディを追加
    scene.physics.add.existing(spine);
    spine.body.setVelocity(nx * spineSpeed, ny * spineSpeed);
    spine.rotation = angle; // 回転も設定
    
    // 弾のグループに追加
    spines.add(spine);
    
    // 敵との衝突判定を追加
    scene.physics.add.overlap(spine, symbols, onSpineHitSymbol, null, scene);
    
    // 3秒後に自動的に削除
    scene.time.delayedCall(3000, () => {
        spine.destroy();
    });
}

// 棘が敵に当たった時の処理
function onSpineHitSymbol(spine, symbol) {
    // 変身完了した敵は攻撃対象外
    if (symbol.transformationState === 3) return;
    
    // 無敵時間中の敵は攻撃対象外
    if (symbol.invincibleTimer > 0) return;
    
    // 敵の変身メーターを増加
    symbol.transformationMeter += spineDamage * influencePower;
    
    // 変身状態を更新
    updateSymbolTransformationState(symbol);
    
    // 一定の無敵時間を設定
    symbol.invincibleTimer = 0.5;
    
    // 敵をノックバック - より強いノックバック
    const dx = symbol.x - spine.x;
    const dy = symbol.y - spine.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    symbol.setVelocity(nx * 150, ny * 150); // より強いノックバック
    
    // 小さなヒットエフェクト
    try {
        const hitEffect = spine.scene.add.circle(symbol.x, symbol.y, 10, 0x00ff00, 0.7);
        hitEffect.setDepth(15);
        
        spine.scene.tweens.add({
            targets: hitEffect,
            scale: 0.1,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                hitEffect.destroy();
            }
        });
    } catch (e) {
        console.error("ヒットエフェクト作成エラー:", e);
    }
    
    // 棘を消す
    spine.destroy();
}