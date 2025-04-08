# ペヨーテの旅路 - システムパターン

## アーキテクチャ概要

「ペヨーテの旅路」は、Phaser.jsフレームワークを使用した単一ファイルアーキテクチャを採用しています。全てのゲームロジックは`game.js`ファイルに集約され、以下の主要コンポーネントで構成されています。

```
ゲーム初期化・設定 → アセット読み込み → メインループ → ゲーム終了処理
```

## 主要なシステムコンポーネント

### 1. ゲーム初期化システム

```javascript
const config = { ... }; // Phaser設定
const game = new Phaser.Game(config);
```

- **Phaser.Game**: メインゲームインスタンス
- **config**: 画面サイズ、物理エンジン、レンダラー等の設定

### 2. シーン管理

現在は単一シーンのみ実装：
- `preload`: アセット読み込み
- `create`: ゲームオブジェクト初期化
- `update`: フレームごとの更新

### 3. プレイヤー制御システム

```javascript
function updatePlayerMovement() { ... }
```

- タッチ/クリック位置への移動
- キーボード入力による移動
- 画面内移動範囲制限

### 4. 敵キャラクターAI

```javascript
function updateSymbols(dt) { ... }
```

- ランダムな移動先決定
- プレイヤーとの衝突検出
- 移動方向に応じたアニメーション

### 5. 「影響力」システム

```javascript
function activateInfluence(scene) { ... }
function applyInfluenceToSymbol(symbol, scene) { ... }
```

- 範囲内の敵キャラクターに影響を与える
- 段階的な変化状態管理
- クールダウン時間の管理

### 6. プログレッションシステム

```javascript
function addExperience(amount) { ... }
function checkLevelUp() { ... }
function upgradeInfluence() { ... }
```

- 経験値獲得と蓄積
- レベルアップ処理
- 能力強化ランダム選択

### 7. 背景システム

```javascript
function createBackground(scene) { ... }
function updateBackground(dt) { ... }
```

- 大きな背景画像表示
- 自動スクロール
- 画面外への移動制限

### 8. 音楽システム

```javascript
function setupMusic(scene) { ... }
function playRandomMusic() { ... }
```

- 複数曲のランダム再生
- 曲終了時の自動切り替え
- オーディオエラー処理

### 9. UI管理システム

```javascript
function createUI(scene) { ... }
function updateHealthBar() { ... }
function updateExpBar() { ... }
```

- ヘルスバー表示
- 経験値バー表示
- レベルとスコア表示
- タイマー表示

### 10. ゲーム終了管理

```javascript
function gameOver() { ... }
function gameClear() { ... }
function displayClearRewards() { ... }
```

- ゲームオーバー時の処理
- ゲームクリア時の視覚効果
- リトライ機能

## 重要な実装パターン

### シングルトンパターン

グローバル変数を使用したシングルトンパターンを採用し、ゲーム全体の状態を管理：

```javascript
let player;
let cursors;
let targetPosition;
// その他のグローバル変数
```

### イベント駆動型プログラミング

Phaserのイベントシステムを活用：

```javascript
scene.time.addEvent({
    delay: 1500,
    callback: () => { /* ... */ },
    loop: true
});

scene.input.on('pointerdown', (pointer) => { /* ... */ });
```

### オブジェクト指向アプローチ

敵キャラクターのようなゲームオブジェクトは、プロパティとメソッドを持つオブジェクトとして実装：

```javascript
const sprite = scene.physics.add.sprite(x, y, 'enemy_walk');
sprite.setScale(1);
sprite.setDepth(5);
sprite.symbolType = type;
sprite.transformationMeter = 0;
// その他のプロパティ
```

### エラーハンドリング

主要な機能にはtry-catchを使用したエラーハンドリングを実装：

```javascript
try {
    // 機能実装
} catch (e) {
    console.error("エラーメッセージ:", e);
    // フォールバック処理
}
```

## コードの改善余地

1. **モジュール分割**: 現在の単一ファイル構成を複数のモジュールに分割
2. **クラス化**: 関数ベースの実装をクラスベースに変更
3. **状態管理の改善**: グローバル変数依存を減らしたより堅牢な状態管理
4. **アセット管理の最適化**: 動的ローディングやキャッシュ戦略の改善 