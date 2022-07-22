const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

const generateGame = (h, v, s) => {
	const cellsHorizontal = h;
	const cellsVertical = v;
	const width = window.innerWidth;
	const height = window.innerHeight - 300;

	const unitLengthX = width / cellsHorizontal;
	const unitLengthY = height / cellsVertical;

	const engine = Engine.create();
	engine.world.gravity.y = 0;
	engine.world.gravity.x = 0;
	const { world } = engine;
	const render = Render.create({
		element: document.body,
		engine: engine,
		options: {
			wireframes: false,
			width,
			height,
		},
	});

	Render.run(render);
	Runner.run(Runner.create(), engine);

	// Walls.
	const createBorder = (x, y, w, h) =>
		Bodies.rectangle(x, y, w, h, {
			isStatic: true,
			render: { fillStyle: 'crimson' },
		});

	const walls = [
		createBorder(width / 2, 0, width, 4), // Border top.
		createBorder(0, height / 2, 4, height), // Border left.
		createBorder(width / 2, height, width, 4), // Border bottom.
		createBorder(width, height / 2, 4, height), // Border right.
	];
	World.add(world, walls);

	// Maze generation.

	// true = no wall.
	// false = is a wall.

	const shuffle = arr => {
		let counter = arr.length;

		while (counter > 0) {
			const index = Math.floor(Math.random() * counter);

			counter--;

			const temp = arr[counter];
			arr[counter] = arr[index];
			arr[index] = temp;
		}

		return arr;
	};

	const grid = Array(cellsVertical)
		.fill(null)
		.map(() => Array(cellsHorizontal).fill(false));

	const verticals = Array(cellsVertical)
		.fill(null)
		.map(() => Array(cellsHorizontal - 1).fill(false));

	const horizontals = Array(cellsVertical - 1)
		.fill(null)
		.map(() => Array(cellsHorizontal).fill(false));

	const startRow = Math.floor(Math.random() * cellsVertical);
	const startColumn = Math.floor(Math.random() * cellsHorizontal);

	const stepThroughCell = (row, column) => {
		// If I have visited the cell at [row, column], then return.
		if (grid[row][column]) return;

		// Mark this cell as being visited.
		grid[row][column] = true;

		// Assemble randomly-ordered list of neighbors.
		const neighbors = shuffle([
			[row - 1, column, 'up'],
			[row, column + 1, 'right'],
			[row + 1, column, 'down'],
			[row, column - 1, 'left'],
		]);

		// For each neighbor...
		for (let neighbor of neighbors) {
			const [nextRow, nextColumn, direction] = neighbor;

			// See if that neighbor is out of bounds.
			if (
				nextRow < 0 ||
				nextRow >= cellsVertical ||
				nextColumn < 0 ||
				nextColumn >= cellsHorizontal
			)
				continue;

			// If we have visited that neighbor, continue to next neighbor.
			if (grid[nextRow][nextColumn]) continue;

			// Remove a wall from either horizontals or verticals.
			if (direction === 'left') verticals[row][column - 1] = true;
			else if (direction === 'right') verticals[row][column] = true;
			else if (direction === 'up') horizontals[row - 1][column] = true;
			else if (direction === 'down') horizontals[row][column] = true;

			stepThroughCell(nextRow, nextColumn);
		}

		// Visit that next cell.
	};

	stepThroughCell(startRow, startColumn);

	horizontals.forEach((row, rowIndex) => {
		row.forEach((open, columnIndex) => {
			if (open) return;

			const wall = Bodies.rectangle(
				columnIndex * unitLengthX + unitLengthX / 2,
				rowIndex * unitLengthY + unitLengthY,
				unitLengthX,
				5,
				{
					label: 'wall',
					friction: 0,
					isStatic: true,
					render: { fillStyle: 'crimson' },
				}
			);
			World.add(world, wall);
		});
	});

	verticals.forEach((row, rowIndex) => {
		row.forEach((open, columnIndex) => {
			if (open) return;

			const wall = Bodies.rectangle(
				columnIndex * unitLengthX + unitLengthX,
				rowIndex * unitLengthY + unitLengthY / 2,
				5,
				unitLengthY,
				{
					label: 'wall',
					friction: 0,
					isStatic: true,
					render: { fillStyle: 'crimson' },
				}
			);
			World.add(world, wall);
		});
	});

	// Goal.

	const goal = Bodies.rectangle(
		width - unitLengthX / 2,
		height - unitLengthY / 2,
		unitLengthX * 0.7,
		unitLengthY * 0.7,
		{ label: 'goal', isStatic: true, render: { fillStyle: 'mediumseagreen' } }
	);
	World.add(world, goal);

	// Ball.

	const ballRadius = Math.min(unitLengthX, unitLengthY / 4);
	const ball = Bodies.circle(unitLengthX / 2, unitLengthY / 2, ballRadius, {
		label: 'ball',
		render: { fillStyle: 'steelblue' },
	});
	World.add(world, ball);

	document.addEventListener('keydown', event => {
		const { x, y } = ball.velocity;
		const speed = s;
		const speedLimit = 5;
		const ballSpeed = (x, y) => Body.setVelocity(ball, { x: x, y: y });

		// Wasd keys
		if (event.key === 'w' && y > -speedLimit) ballSpeed(x, y - speed);
		if (event.key === 'a' && x > -speedLimit) ballSpeed(x - speed, y);
		if (event.key === 's' && y < speedLimit) ballSpeed(x, y + speed);
		if (event.key === 'd' && x < speedLimit) ballSpeed(x + speed, y);

		// Arrow keys
		if (event.key === 'ArrowUp' && y > -speedLimit) ballSpeed(x, y - speed);
		if (event.key === 'ArrowLeft' && x > -speedLimit) ballSpeed(x - speed, y);
		if (event.key === 'ArrowDown' && y < speedLimit) ballSpeed(x, y + speed);
		if (event.key === 'ArrowRight' && x < speedLimit) ballSpeed(x + speed, y);
	});

	// Win Condition.

	Events.on(engine, 'collisionStart', event => {
		event.pairs.forEach(collision => {
			const labels = ['ball', 'goal'];

			if (
				labels.includes(collision.bodyA.label) &&
				labels.includes(collision.bodyB.label)
			) {
				document.querySelector('.winner').classList.remove('hidden');
				world.gravity.y = 1;
				world.bodies.forEach(body => {
					if (body.label === 'wall') Body.setStatic(body, false);
				});
				clearInterval(timer);
			}
		});
	});

	// Steel.
	const steelBall = document.querySelector('#steel');

	steelBall.addEventListener('click', e => {
		if (steelBall.checked === true) {
			ball.render.fillStyle = 'grey';
			world.bodies.forEach(body => {
				if (body.label === 'wall') Body.setStatic(body, false);
			});
		}
		steelBall.checked = true;
	});

	// Timer.
	let time = 0;
	const timeText = document.querySelector('#current-time');
	timeText.innerHTML = time;
	const timer = setInterval(() => {
		timeText.innerHTML = time += 1;
	}, 1000);
};

// Soundtrack
const soundtrack = document.querySelector('#soundtrack');
soundtrack.play();

// Menu.

const landing = document.querySelector('#landing');
const startBtn = document.querySelector('#start');
const menu = document.querySelector('#menu');
const gameName = document.querySelector('#name');
const difficultyMenu = document.querySelector('#difficulty');
const overlay = document.querySelector('#overlay');

const startGame = () => landing.classList.add('hidden');

startBtn.addEventListener('click', e => {
	gameName.classList.add('hidden');
	menu.classList.add('hidden');
	difficultyMenu.classList.remove('hidden');
});

// Select difficulty.
// Run generateGame(v, h, s)

// DIFFICULTY:
// h = cellsHorizontal | v = cellsVertical | s = Speed
// Easy: h = 25, v = 10, s = 5.
// Medium: h = 35, v = 20, s = 2.
// Hard: h = 40, v = 25, s = 2.

// Easy.
const easyBtn = document.querySelector('#easy');
easyBtn.addEventListener('click', e => {
	generateGame(25, 10, 5);
	startGame();
	overlay.classList.remove('hidden');
});

// Medium.
const mediumBtn = document.querySelector('#medium');
mediumBtn.addEventListener('click', e => {
	generateGame(35, 15, 3);
	startGame();
	overlay.classList.remove('hidden');
});

// Hard.
const hardBtn = document.querySelector('#hard');
hardBtn.addEventListener('click', e => {
	generateGame(40, 25, 3);
	startGame();
	overlay.classList.remove('hidden');
});

// Option Menu.

// Music on/off.

const musicBtn = document.querySelector('#music');
let isPlaying = true;

musicBtn.addEventListener('click', e => {
	if (isPlaying === true) {
		soundtrack.pause();
		musicBtn.classList.add('stop');
		isPlaying = false;
	} else {
		soundtrack.play();
		musicBtn.classList.remove('stop');
		isPlaying = true;
	}
});
