Math.fuzzyEqual = (a, b, epsilon=0.0001) => {
	return Math.abs(a - b) < epsilon;
};

const na = (n) => {
	const a = [];
	for (let i = 0; i < n; i++) {
		a.push(0);
	}
	return a;
};

let axes = [na(10), na(10)];
let buttons = [na(12), na(12)];

let gameOver = false;
let winnerName = '';

const checkWinner = () => {
	let name = '';
	let aliveCount = 0;
	for (const p of OBJ.take(Player)) {
		if (p.hp <= 0) {
			if (!p.freeze) {
				p.freeze = true;
				console.log(`${p.name}: is eliminated.`);
			}
		}
		else {
			name = p.name;
			aliveCount++;
		}
	}
	if (aliveCount === 1) {
		gameOver = true;
		winnerName = name;
		return true;
	}
	return false;
};

class Player extends BranthBehaviour {
	constructor(x, y, padIndex, color, name) {
		super(x, y);
		this.padIndex = padIndex;
		this.color = color;
		this.name = name || '';
		this.vx = 0;
		this.vy = 0;
		this.r = 32;
		this.rdraw = this.r;
		this.direction = 0;
		this.targetDirection = 0;
		this.canShoot = true;
		this.isMoving = false;
		this.isBoosting = false;
		this.isShooting = false;
		this.freeze = false;
		this.spd = 2;
		this.maxhp = 20;
		this.hp = this.maxhp;
	}
	shoot() {
		const l = Math.lendir(this.r + 16, this.direction);
		const bulletSpeed = this.isBoosting? Math.range(30, 32) : Math.range(19, 20);
		OBJ.create(Bullet, this.x + l.x, this.y + l.y, bulletSpeed, this.direction);
	}
	contains(x, y) {
		// Check if this circle contains the point with given x and y
		return Math.linedis(this.x, this.y, x, y) < this.r;
	}
	collisionUpdate() {
		const bullets = OBJ.take(Bullet);
		for (let i = bullets.length - 1; i >= 0; --i) {
			const b = bullets[i];
			if (this.contains(b.x, b.y)) {
				this.hp -= 1;
				Emitter.preset('sparkle2');
				Emitter.setArea(b.x, b.x, b.y, b.y);
				Emitter.setDepth(-999);
				Emitter.emit(Math.irange(3, 5));
				Emitter.setDepth(0);
				OBJ.destroy(b.id);
				if (checkWinner()) {
					break;
				}
			}
		}
	}
	update() {
		if (gameOver) {
			if (buttons[this.padIndex][9] > 0) {
				gameOver = false;
				Room.restart();
			}
		}
		if (this.freeze) return;
		this.isMoving = !Math.fuzzyEqual(axes[this.padIndex][0], 0, 0.005) || !Math.fuzzyEqual(axes[this.padIndex][1], 0, 0.005);
		this.isBoosting = buttons[this.padIndex][7] > 0;
		this.isShooting = buttons[this.padIndex][5] > 0 || buttons[this.padIndex][2] > 0;

		// Handles speed
		if (!this.isMoving) {
			this.spd = 0;
		}
		else if (this.isShooting) {
			if (this.isBoosting) {
				this.spd = 10;
			}
			else {
				this.spd = 2;
			}
		}
		else if (this.isBoosting) {
			this.spd = 16;
		}
		else {
			this.spd = 2;
		}

		// Target direction when no aim assist
		const angleToInputAxes = Math.linedir(this.x, this.y, this.x + axes[this.padIndex][0], this.y + axes[this.padIndex][1]);
		this.targetDirection = angleToInputAxes;

		// Handles aim assist
		if (!this.isBoosting) {
			let nearestEnemy = null;
			let nearestDistance = 0xffffffff;
			for (const p of OBJ.take(Player)) {
				if (p.id != this.id) {
					if (p.hp > 0) {
						const d = Math.pointdis(p, this);
						if (d <= nearestDistance) {
							nearestEnemy = p;
							nearestDistance = d;
						}
					}
				}
			}
			if (nearestEnemy instanceof Player) {
				// Aim assist active
				this.targetDirection = Math.pointdir(this, nearestEnemy);
			}
		}

		// Rotate to target
		this.direction -= Math.sin(Math.degtorad(this.direction - this.targetDirection)) * 10;

		// Update motion
		const l = Math.lendir(this.spd, angleToInputAxes);
		this.vx = Math.range(this.vx, l.x, 0.2);
		this.vy = Math.range(this.vy, l.y, 0.2);
		if (Math.abs(this.vx) > 0.005) this.x += this.vx;
		if (Math.abs(this.vy) > 0.005) this.y += this.vy;

		// Handles particles
		if (this.isBoosting) {
			if (Time.step % 5 === 0) {
				Emitter.preset('puff');
				Emitter.setSize(5, 7);
				Emitter.setSpeed(5, 8);
				Emitter.setArea(this.x, this.x, this.y, this.y);
				Emitter.setDirection(this.direction + 160, this.direction + 200);
				Emitter.emit(1);
			}
		}

		// Handles shooting
		if (this.canShoot && this.isShooting) {
			this.shoot();
			this.canShoot = false;
			this.alarm[0] = 100;
		}

		// Handles collision
		this.collisionUpdate();
	}
	render() {
		this.rdraw = Math.range(this.rdraw, this.isBoosting? this.r * 0.95 : this.r, 0.2);

		Draw.setColor(this.color);
		Draw.circle(this.x, this.y, this.rdraw);

		// Draw.setColor(C.black);
		// Draw.text(this.x, this.y, this.vx);
		// Draw.text(this.x, this.y + 24, this.vy);
	}
	alarm0() {
		this.canShoot = true;
	}
}

(function() {
	const spr = document.createElement('canvas');
	spr.width = 16;
	spr.height = 8;
	const ctx = spr.getContext('2d');
	Draw.setContext(ctx);
	let i = 0;
	for (const c of [C.red, C.yellow]) {
		Draw.setColor(c);
		Draw.rect(i, i, 8 - i, 8 - i * 2);
		Draw.ellipse(8, 4, 8 - i, 4 - i);
		i += 2;
	}
	Draw.resetContext();
	Draw.add(new Vector2(0.5, 0.5), 'sprBullet', spr);
}());

class Bullet extends BranthGameObject {
	constructor(x, y, spd, angle) {
		super(x, y);
		angle = Math.range(angle - 5, angle + 5);
		this.hspeed = Math.lendirx(spd, angle);
		this.vspeed = Math.lendiry(spd, angle);
		this.spriteName = 'sprBullet';
		this.imageAngle = angle;
		this.imageXScale = Math.range(0.7, 1);
		this.alarm[0] = 2000;
		this.imageYScale = Math.max(this.imageXScale, Math.range(0.9, 1));
	}
	update() {
		this.physicsUpdate();
	}
	alarm0() {
		OBJ.destroy(this.id);
	}
}

OBJ.add(Player);
OBJ.add(Bullet);

const Menu = new BranthRoom('Menu');
const Game = new BranthRoom('Game');

let x = 32, y = 32;
const line = (text) => {
	// Draw.text(x, y, text);
	// y += Font.size;
};

Game.start = () => {
	OBJ.create(Transition);
	OBJ.create(Player, Room.mid.w, Room.mid.h * 0.5, 0, C.burlyWood, 'Kakak');
	OBJ.create(Player, Room.mid.w, Room.mid.h, 1, C.lemonChiffon, 'Aa');
	for (let i = 0; i < 20; i++) {
		OBJ.create(Player, Math.range(Room.w), Math.range(Room.h), 1, C.random(), 'Aa');
	}
};

Game.render = () => {
	x = 32;
	y = 32;
	Draw.setFont(Font.m);
	Draw.setColor(C.white);
	Draw.setHVAlign(Align.l, Align.t);
	for (let i = 0; i < navigator.getGamepads().length; i++) {
		const pad = navigator.getGamepads()[i];
		if (pad) {
			line(pad.id);
			line(`Index: ${pad.index}`);
			line(`Connected: ${pad.connected}`);
			line(`Timestamp: ${pad.timestamp}`);
			line(`Mapping: ${pad.mapping}`);
			for (let j = 0; j < pad.axes.length; j++) {
				line(`Axis ${j}: ${pad.axes[j]}`);
				axes[i][j] = pad.axes[j];
			}
			for (let j = 0; j < pad.buttons.length; j++) {
				line(`Button ${j}: ${pad.buttons[j].value}`);
				buttons[i][j] = pad.buttons[j].value;
			}
			y += Font.size;
			if (buttons[i][8] > 0) {
				Room.start('Menu');
			}
		}
	}
};

const drawHealthBar = (centerX, centerY, width, height, value, maxvalue) => {
	const scale = Math.clamp(value / maxvalue, 0, 1);
	const x = centerX - width * 0.5;
	const y = centerY - height * 0.5
	const o = 1; // Stroke weight
	Draw.setColor(C.black);
	Draw.rect(x, y, width, height);
	Draw.setColor(`rgb(${255 * (1 - scale)}, ${255 * scale}, 0)`);
	Draw.rect(x + o, y + o, (width - o-o) * scale, height - o-o);
};

Game.renderUI = () => {
	if (gameOver) {
		Draw.setAlpha(0.5);
		Draw.setColor(C.black);
		Draw.rect(0, 0, Room.w, Room.h);
		Draw.setAlpha(1);
		Draw.setFont(Font.xl);
		Draw.setColor(C.white);
		Draw.setHVAlign(Align.c, Align.m);
		Draw.text(Room.mid.w, Room.mid.h, `${winnerName} is the winner!`);
		return;
	}
	Draw.setFont(Font.m);
	Draw.setHVAlign(Align.c, Align.b);
	for (const p of OBJ.take(Player)) {

		// Player cursor
		const ty = p.y - p.r - 28 + Math.sin(Time.time * 0.01);
		Draw.setColor(C.white);
		Draw.primitiveBegin();
		Draw.vertex(p.x, ty - 4);
		Draw.vertex(p.x - 10, ty - 14);
		Draw.vertex(p.x + 10, ty - 14);
		Draw.primitiveEnd();

		// Health bar
		drawHealthBar(p.x, ty - 24, 128, 8, p.hp, p.maxhp);

		// Player name
		Draw.setColor(C.white);
		Draw.text(p.x, ty - 32, p.name);

		// Draw crosshair
		const l = Math.lendir(p.r + 16, p.direction);
		// Bold crosshair = aim assist active
		if (!p.isBoosting) {
			Draw.setStrokeWeight(2);
		}
		Draw.circle(p.x + l.x, p.y + l.y, 8, true);
		Draw.plus(p.x + l.x, p.y + l.y, 12);
		Draw.resetStrokeWeight();
	}

	Transition.Render();
};

Menu.start = () => {
	OBJ.create(Transition);
};

Menu.renderUI = () => {
	Emitter.preset('fire');
	Emitter.setLife(20000, 20000);
	Emitter.setColor(C.white);
	Emitter.setArea(0, Room.w, Room.h + 100, Room.h + 100);
	Emitter.emit(1);
	let y = Room.mid.h;
	Draw.setFont(Font.xxxl);
	Draw.setColor(C.white);
	Draw.setHVAlign(Align.c, Align.m);
	Draw.text(Room.mid.w, y, 'Twin Shooter');
	y += Font.size;
	Draw.setFont(Font.m, Font.bold);
	Draw.text(Room.mid.w, y, 'Press <START>');

	Transition.Render();

	for (const pad of navigator.getGamepads()) {
		if (pad) {
			if (pad.buttons[9].value > 0) {
				Room.start('Game');
			}
		}
	}
};

Room.add(Menu);
Room.add(Game);

BRANTH.start();
Room.start('Menu');