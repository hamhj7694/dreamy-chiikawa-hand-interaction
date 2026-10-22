let video;
let handpose;
let predictions = [];

let chiikawaImgs = [];
let hachiwareImgs = [];
let usagiImgs = [];
let ppsImg;

let particles = [];
let currentTarget = "NONE";
let resetAwaitRelease = false; // Reset locks gestures until the hand leaves the camera view

let MOVE_SPEED = 0.25;
let COLOR_SPEED = 0.25;
let ALPHA_SPEED = 0.25;

let lastLabel = "";
let labelAnimStart = 0;

function getRandomImage(arr) {
  return random(arr);
}

function preload() {
  chiikawaImgs = [
    loadImage("chiikawa.png"),
    loadImage("chiikawa1.png"),
    loadImage("chiikawa2.png")
  ];

  hachiwareImgs = [
    loadImage("hachiware.png"),
    loadImage("hachiware1.png"),
    loadImage("hachiware2.png")
  ];

  usagiImgs = [
    loadImage("Usagi.png"),
    loadImage("Usagi1.png"),
    loadImage("Usagi2.png")
  ];

  ppsImg = loadImage("pps.png");
}

function setup() {
  let container = document.getElementById("canvas-container");
  let canvasW = container.offsetWidth;
  let canvasH = container.offsetHeight;

  let canvas = createCanvas(canvasW, canvasH);
  canvas.parent("canvas-container");

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handpose = ml5.handpose(video, () => {
    console.log("손 인식 준비 완료");
  });

  handpose.on("predict", (results) => {
    predictions = results;
  });
}

function draw() {
  background(0);

  push();

  translate(width, 0);
  scale(-1, 1);

  // 비디오 원본 비율
  let videoRatio = video.width / video.height;

  // 캔버스 비율
  let canvasRatio = width / height;

  let drawW, drawH;

  if (videoRatio > canvasRatio) {

    // 비디오가 더 가로로 긴 경우
    drawH = height;
    drawW = height * videoRatio;

  } else {

    // 비디오가 더 세로로 긴 경우
    drawW = width;
    drawH = width / videoRatio;
  }

  // 중앙 정렬
  let offsetX = (width - drawW) / 2;
  let offsetY = (height - drawH) / 2;

  image(
    video,
    offsetX,
    offsetY,
    drawW,
    drawH
  );

  pop();

  let gesture = "NO HAND";

  if (resetAwaitRelease && predictions.length === 0) resetAwaitRelease = false;

  if (!resetAwaitRelease && predictions.length > 0) {
    let hand = predictions[0];

    // 테스트용: 손가락 마디 초록 점 표시
    // drawKeypoints(hand);

    gesture = detectGesture(hand);
  }

  if (gesture !== currentTarget) {
    currentTarget = gesture;

    if (gesture === "FIST") {
      setTargetFromImage(
        getRandomImage(chiikawaImgs)
      );

    } else if (gesture === "V") {
      setTargetFromImage(
        getRandomImage(usagiImgs)
      );

    } else if (gesture === "ROCK") {
      setTargetFromImage(
        getRandomImage(hachiwareImgs)
      );

    } else if (gesture === "OPEN PALM") {
      setTargetFromImage(ppsImg);

    } else {
      scatterParticles();
    }
  }

  //캠 어둡게 오버레이
  // fill(0, 0, 0, 40);
  // rect(0, 0, width, height);
  
  drawParticles(); //캠 위에 파티클 생성
  drawGestureLabel(gesture); //파티클보다 앞에 좌측하단 상태 카드 생성
}

function setTargetFromImage(img) {
  for (let i = 0; i < particles.length; i++) {
    if (i % 2 === 0) particles[i].burst();
  }

  let isPps = img === ppsImg;
  let isChiikawa = chiikawaImgs.includes(img);

  let gap;
  if (isPps) gap = 3;
  else if (isChiikawa) gap = 2;
  else gap = 2;

  let pts = getPointsFromImage(img, gap, true);

  let maxParticles;

  let isMobile = width < 600;

  if (isMobile) {
    if (isPps) {
      maxParticles = 1400;
    } else if (isChiikawa) {
      maxParticles = 1000;
    } else {
      maxParticles = 1100;
    }
  } else {
    if (isPps) {
      maxParticles = 7200;
    } else if (isChiikawa) {
      maxParticles = 4200;
    } else {
      maxParticles = 5200;
    }
  }

  if (pts.length > maxParticles) {
    pts = shuffle(pts).slice(0, maxParticles);
  }

  let targetSize;

  if (isMobile) {
    if (isPps) {
      targetSize = 310;
    } else {
      targetSize = 215;
    }
  } else {
    if (isPps) {
      targetSize = 620;
    } else if (isChiikawa) {
      targetSize = 430;
    } else {
      targetSize = 430;
    }
  }

  let scale = min(targetSize / img.width, targetSize / img.height);
  let offsetX = width / 2 - (img.width * scale) / 2;
  let offsetY = height / 2 - (img.height * scale) / 2;

  for (let i = 0; i < pts.length; i++) {
    let p = pts[i];

    let tx = p.x * scale + offsetX;
    let ty = p.y * scale + offsetY;

    if (particles[i]) {
      particles[i].setTarget(tx, ty, p.r, p.g, p.b, 245, isPps, isChiikawa);
    } else {
      particles[i] = new Particle(tx, ty, p.r, p.g, p.b, isPps, isChiikawa);
    }
  }

  for (let i = pts.length; i < particles.length; i++) {
    particles[i].scatter();
  }
}

function getPointsFromImage(img, gap, useAlpha) {
  img.loadPixels();
  let pts = [];

  for (let x = 0; x < img.width; x += gap) {
    for (let y = 0; y < img.height; y += gap) {
      let index = (x + y * img.width) * 4;

      let r = img.pixels[index];
      let g = img.pixels[index + 1];
      let b = img.pixels[index + 2];
      let a = img.pixels[index + 3];

      if (useAlpha && a <= 50) continue;

      pts.push({ x, y, r, g, b });
    }
  }

  return pts;
}

function drawParticles() {
  for (let p of particles) {
    p.update();
    p.draw();
  }
}

class Particle {
  constructor(tx, ty, r, g, b, isPps, isChiikawa) {
    this.x = random(width);
    this.y = random(height);

    this.tx = tx;
    this.ty = ty;

    this.r = r;
    this.g = g;
    this.b = b;

    this.tr = r;
    this.tg = g;
    this.tb = b;

    this.alpha = 0;
    this.alphaTarget = 235;

  let isMobile = width < 600;

  if (isMobile) {
    if (isPps) {
      this.size = random(8, 13);
    } else if (isChiikawa) {
      this.size = random(7, 11);
    } else {
      this.size = random(7, 12);
    }
  } else {
    if (isPps) {
      this.size = random(5, 9);
    } else if (isChiikawa) {
      this.size = random(4, 7);
    } else {
      this.size = random(5, 8);
    }
  }

    this.noiseOffset = random(1000);
  }

  setTarget(tx, ty, r, g, b, alpha, isPps, isChiikawa) {
    this.tx = tx;
    this.ty = ty;

    this.tr = r;
    this.tg = g;
    this.tb = b;

    this.alphaTarget = alpha;

  let isMobile = width < 600;

  if (isMobile) {
    if (isPps) {
      this.size = random(8, 13);
    } else if (isChiikawa) {
      this.size = random(7, 11);
    } else {
      this.size = random(7, 12);
    }
  } else {
    if (isPps) {
      this.size = random(5, 9);
    } else if (isChiikawa) {
      this.size = random(4, 7);
    } else {
      this.size = random(5, 8);
    }
  }
}

  scatter() {
    this.tx = random(-250, width + 250);
    this.ty = random(-250, height + 250);
    this.alphaTarget = 0;
  }

  burst() {
    let dx = this.x - width / 2;
    let dy = this.y - height / 2;
    let len = sqrt(dx * dx + dy * dy) || 1;

    this.x += (dx / len) * random(30, 80);
    this.y += (dy / len) * random(30, 80);
  }

  update() {
    let speed = width < 600 ? 0.38 : MOVE_SPEED;

    this.x += (this.tx - this.x) * speed;
    this.y += (this.ty - this.y) * speed;

    this.r += (this.tr - this.r) * COLOR_SPEED;
    this.g += (this.tg - this.g) * COLOR_SPEED;
    this.b += (this.tb - this.b) * COLOR_SPEED;

    this.alpha += (this.alphaTarget - this.alpha) * ALPHA_SPEED;
  }

  draw() {
    let wiggleX = sin(frameCount * 0.04 + this.noiseOffset) * 0.25;
    let wiggleY = cos(frameCount * 0.04 + this.noiseOffset) * 0.25;

    noStroke();
    let sparkle = sin(frameCount * 0.12 + this.noiseOffset) * 12;

    fill(
      min(this.r + sparkle, 255),
      min(this.g + sparkle, 255),
      min(this.b + sparkle, 255),
      this.alpha
    );

    circle(this.x + wiggleX, this.y + wiggleY, this.size);
  }
}

function scatterParticles() {
  for (let p of particles) {
    p.scatter();
  }
}

function drawKeypoints(hand) {
  let scaleX = width / video.width;
  let scaleY = height / video.height;

  for (let i = 0; i < hand.landmarks.length; i++) {
    let [x, y] = hand.landmarks[i];

    let flippedX = width - x * scaleX;
    let scaledY = y * scaleY;

    fill(0, 255, 0);
    noStroke();
    circle(flippedX, scaledY, 10);
  }
}

function detectGesture(hand) {
  let lm = hand.landmarks;

  let indexTip = lm[8];
  let middleTip = lm[12];
  let ringTip = lm[16];
  let pinkyTip = lm[20];

  let indexPip = lm[6];
  let middlePip = lm[10];
  let ringPip = lm[14];
  let pinkyPip = lm[18];

  let indexOpen = indexTip[1] < indexPip[1];
  let middleOpen = middleTip[1] < middlePip[1];
  let ringOpen = ringTip[1] < ringPip[1];
  let pinkyOpen = pinkyTip[1] < pinkyPip[1];

  let openCount = 0;
  if (indexOpen) openCount++;
  if (middleOpen) openCount++;
  if (ringOpen) openCount++;
  if (pinkyOpen) openCount++;

  if (indexOpen && !middleOpen && !ringOpen && pinkyOpen) {
    return "ROCK";
  }

  if (indexOpen && middleOpen && openCount < 4) {
    return "V";
  }

  if (openCount >= 4) return "OPEN PALM";

  if (openCount === 0) return "FIST";

  return "OTHER";
}

function drawGestureLabel(label) {

  if (windowWidth < 1100) return;
  
  if (label !== lastLabel) {
    lastLabel = label;
    labelAnimStart = frameCount;
  }

  let message = "";

  if (label === "FIST") {
    message = "✨ 치이카와 등장!";
  } else if (label === "V") {
    message = "🐰 우사기 등장!";
  } else if (label === "ROCK") {
    message = "💙 하치와레 등장!";
  } else if (label === "OPEN PALM") {
    message = "🌙 파자마파티즈 등장!";
  } else if (label === "NO HAND") {
    message = "👋 손동작을 해보세요!";
  } else {
    message = "💫 다른 손동작도 해보세요!";
  }

  let t = frameCount - labelAnimStart;
  let yOffset = -min(t * 0.6, 16);
  let alpha = max(230 - t * 2, 170);

  let boxW = 330;
  let boxH = 58;
  let x = width - boxW - 24;
  let y = 24 + yOffset;

  noStroke();
  fill(255, 245, 235, alpha);

  rect(
    x,
    y,
    boxW,
    boxH,
    18
  );

  fill(90, 70, 60, alpha);

  textAlign(LEFT, CENTER);
  textSize(26);
  textStyle(BOLD);

  text(
    message,
    x + 18,
    y + boxH / 2
  );

  if (
    t < 45 &&
    label !== "NO HAND" &&
    label !== "OTHER"
  ) {
    fill(255, 220, 120, 220 - t * 4);

    textSize(18);
    text("✨", x + boxW - 46, y + 20);
    text("✦", x + boxW - 24, y + 46);
  }
}

function windowResized() {
  let container = document.getElementById("canvas-container");

  resizeCanvas(
    container.offsetWidth,
    container.offsetHeight
  );

  //video.size(width, height); //카메라 원본 비율을 안정적으로 유지위해 삭제
}
// Press R or use the on-screen button to clear particles. Show a hand again only
// after briefly removing it from the camera frame, to prevent instant retrigger.
function resetExperience() {
  particles = [];
  currentTarget = "NONE";
  resetAwaitRelease = predictions.length > 0;
  lastLabel = "";
}

function keyPressed() {
  if (key === "r" || key === "R") resetExperience();
}
