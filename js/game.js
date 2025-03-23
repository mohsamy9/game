// =======================
// 📦 CONFIGURATION & VARIABLES
// =======================



// DOM Elements
const log = document.getElementById('log');
const attackBtn = document.getElementById('attack-btn');
const defendBtn = document.getElementById('defend-btn');
const healBtn = document.getElementById('heal-btn');
const nextBtn = document.getElementById('next-btn');

const heroHpText = document.getElementById('hero-hp');
const monsterHpText = document.getElementById('monster-hp');
const heroHpFill = document.getElementById('hero-hp-fill');
const monsterHpFill = document.getElementById('monster-hp-fill');
const heroSprite = document.getElementById('hero-sprite');
const monsterSprite = document.getElementById('monster-sprite');
const monsterName = document.getElementById('monster-name');

// Sprites / Animations
let attackFrames = [];
const molotovFrames = [];
let blockFrames = [];
let deathFrames = [];
let currentFrame = 0;
let frameInterval = null;
let redWineCount = 3; // Commence avec 3 bouteilles
updateRedWineDisplay();

function updateRedWineDisplay() {
  document.getElementById('red-wine-count').textContent = redWineCount;
}



// Hero / Monster Stats
let hero, monsters, currentMonster, monster;

// XP & Niveau
let xp = 0;
let level = 1;
let xpToNextLevel = 100;

// Score
let score = localStorage.getItem('rpgScore') || 0;

// Sounds
const sounds = {
  attack: new Audio('assets/sounds/attack.mp3'),
  hit: new Audio('assets/sounds/hit.mp3'),
  potion: new Audio('assets/sounds/potion.mp3'),
  win: new Audio('assets/sounds/win.mp3'),
  lose: new Audio('assets/sounds/lose.mp3')
};

// =======================
// ▶️ INITIALISATION
// =======================

function initGame() {
  hero = { hp: 150, maxHp: 150, attack: 20, defense: 8, potions: 5, defending: false };
  monsters = []; // Vide, on combat que Macron
  
  addLog("🔥 La lutte finale contre Macron commence !");
  
  preloadAttack1Frames();
  preloadMolotovFrames();
  preloadBlockFrames();
  preloadDeathFrames();

  startIdleAnimation();
  newMonster();
  updateUI();
}


// =======================
// 🏹 ACTIONS JOUEUR
// =======================

function lancerDePave() {
  const damage = hero.attack;
  monster.hp -= damage;
  addLog(`🧱 Tu lances un pavé sur ${monster.name} ! -${damage} HP !`);

  // Chance de loot une bouteille de rouge
  if (Math.random() < 0.3) {
    redWineCount++;
    addLog(`🍷 Tu récupères une bouteille de vin rouge ! (${redWineCount} en stock)`);
  }

  endTurn();
}

function cocktailMolotov() {
  const damage = hero.attack * 2;

  if (redWineCount <= 0) {
    addLog(`🚫 Pas de bouteilles de vin rouge pour faire un cocktail molotov !`);
    return;
  }

  // Consomme une bouteille de rouge pour faire le molotov
  redWineCount--;
  updateRedWineDisplay();

  // Inflige les dégâts au monstre
  monster.hp -= damage;
  addLog(`🔥 Tu balances un cocktail molotov sur ${monster.name} ! -${damage} HP !`);

  // 30% de chance de récupérer une bouteille après le lancer
  if (Math.random() < 0.4) {
    redWineCount++;
    addLog(`🍷 Tu récupères une Bouteille de Rouge sur le terrain !`);
    updateRedWineDisplay();
  }

  endTurn();
}


function arretMaladie() {
  hero.defending = true;
  addLog(`🏥 Tu prends un arrêt maladie. Prochaine attaque subie réduite !`);
  endTurn();
}

function bouteilleDeRouge() {
  if (redWineCount <= 0) {
    addLog(`🚫 Plus de Bouteilles de Rouge pour te soigner !`);
    return;
  }

  playBlockAnimation();  // Animation de défense ou de soin si tu veux
  const healAmount = 40;
  hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
  redWineCount--; // Consomme une bouteille

  addLog(`🍷 Tu bois une bouteille de rouge et récupères ${healAmount} HP !`);
  updateRedWineDisplay();
  
  endTurn();
}


// =======================
// 🧠 LOGIQUE COMBAT
// =======================

function endTurn() {
  updateUI();

  if (monster.hp <= 0) {
    sounds.win.play();
    gainXP(50);

    score++;
    localStorage.setItem('rpgScore', score);

    addLog(`🏆 Tu as vaincu ${currentMonster.name} ! Score : ${score}`);

    disableButtons();
    nextBtn.style.display = 'inline-block';
    return;
  }

  setTimeout(monsterAttack, 500);
}

function monsterAttack() {
  const attackOptions = [
    {
      name: "Prélèvement à la source",
      damage: 20,
      img: "macron1.png",
      effect: () => addLog("💸 Macron te ponctionne directement sur ton salaire !")
    },
    {
      name: "Réforme des retraites",
      damage: 15,
      img: "macron2.png",
      effect: () => {
        hero.defense = Math.max(0, hero.defense - 2);
        addLog("📉 Ta défense baisse à cause de la réforme !");
      }
    },
    {
      name: "Suppression APL",
      damage: 10,
      img: "macron3.png",
      effect: () => {
        if (redWineCount > 0) {
          redWineCount--;
          addLog("🏚️ Il t’a piqué une bouteille de vin rouge !");
        }
      }
    },
    {
      name: "Augmentation CSG",
      damage: 12,
      img: "macron4.png",
      effect: () => {
        addLog("📈 La CSG t'affaiblit !");
        setTimeout(() => {
          hero.hp -= 5;
          addLog("💸 La CSG continue de te saigner (-5 HP)");
          updateUI();
        }, 3000);
      }
    },
    {
      name: "49.3 Ultime",
      damage: 40,
      img: "macron5.png",
      effect: () => addLog("⚡ Coup de massue législatif avec le 49.3 !")
    },
    {
      name: "Conférence de presse",
      damage: 0,
      img: "macron8.png",
      effect: () => {
        monster.hp = Math.min(monster.maxHp, monster.hp + 30);
        addLog("🎙️ Macron se soigne en parlant : +30 HP !");
      }
    }
  ];

  const action = attackOptions[Math.floor(Math.random() * attackOptions.length)];
  monsterSprite.src = `assets/images/macron/${action.img}`;

  let damage = action.damage;
  if (hero.defending) {
    damage -= hero.defense;
    hero.defending = false;
  }
  damage = Math.max(0, damage);
  hero.hp -= damage;

  action.effect();

  sounds.hit.play();
  heroSprite.classList.add('shake');
  setTimeout(() => heroSprite.classList.remove('shake'), 300);

  addLog(`👹 ${currentMonster.name} utilise "${action.name}" et inflige ${damage} dégâts !`);

  if (hero.hp <= 0) {
    hero.hp = 0;
    sounds.lose.play();
    addLog(`💀 Tu es tombé au combat... Score final : ${score}`);
    disableButtons();
    playDeathAnimation();
  }

  updateUI();
}

function disableButtons() {
  attackBtn.disabled = true;
  defendBtn.disabled = true;
  healBtn.disabled = true;
  nextBtn.style.display = 'none';
}

// =======================
// 🎲 MACRON - BOSS FINAL
// =======================

function newMonster() {
  currentMonster = {
    name: "Emmanuel Macron",
    img: "macron9.png",
    hp: 500,
    maxHp: 500,
    attack: 20
  };

  monster = { ...currentMonster };

  monsterName.textContent = currentMonster.name;
  monsterSprite.src = `assets/images/macron/${currentMonster.img}`;

  enableButtons();
  nextBtn.style.display = 'none';

  addLog(`👔 ${currentMonster.name} fait son entrée !`);

  updateUI();
}

// =======================
// 🧠 IA DE MACRON
// =======================
function monsterAttack() {
  const attackOptions = [
    {
      name: "Prélèvement à la source",
      damage: 20,
      img: "macron1.png",
      effect: () => addLog("💸 Macron te ponctionne directement sur ton salaire !")
    },
    {
      name: "Réforme des retraites",
      damage: 15,
      img: "macron2.png",
      effect: () => {
        hero.defense = Math.max(0, hero.defense - 2);
        addLog("📉 Ta défense est réduite à cause de la réforme !");
      }
    },
    {
      name: "Suppression APL",
      damage: 10,
      img: "macron3.png",
      effect: () => {
        if (hero.potions > 0) {
          hero.potions--;
          addLog("🏚️ Il t’a volé une potion d’APL !");
        }
      }
    },
    {
      name: "Augmentation CSG",
      damage: 12,
      img: "macron4.png",
      effect: () => {
        addLog("📈 Tu subis une taxe continue !");
        setTimeout(() => {
          hero.hp -= 5;
          addLog("💸 La CSG continue de te saigner (-5 HP)");
          updateUI();
        }, 3000);
      }
    },
    {
      name: "49.3 Ultime",
      damage: 40,
      img: "macron5.png",
      effect: () => addLog("⚡ Coup de massue législatif ! 49.3 utilisé !")
    },
    {
      name: "Conférence de presse",
      damage: 0,
      img: "macron8.png",
      effect: () => {
        monster.hp = Math.min(monster.maxHp, monster.hp + 30);
        addLog("🎙️ Macron se soigne en parlant : +30 HP !");
      }
    }
  ];

  // Macron choisit aléatoirement son attaque
  const action = attackOptions[Math.floor(Math.random() * attackOptions.length)];

  // Affichage et mise à jour
  monsterSprite.src = `assets/images/macron/${action.img}`;

  let damage = action.damage;
  if (hero.defending) {
    damage -= hero.defense;
    hero.defending = false;
  }
  damage = Math.max(0, damage);
  hero.hp -= damage;

  // Effet spécial de l'attaque
  action.effect();

  sounds.hit.play();
  heroSprite.classList.add('shake');
  setTimeout(() => heroSprite.classList.remove('shake'), 300);

  addLog(`👹 ${currentMonster.name} utilise "${action.name}" et inflige ${damage} dégâts !`);

  if (hero.hp <= 0) {
    hero.hp = 0;
    sounds.lose.play();
    addLog(`💀 Tu as été écrasé par le capitalisme... Score final : ${score}`);

    disableButtons();
    playDeathAnimation();
  }

  updateUI();
}


// =======================
// ⭐ XP / LEVEL UP
// =======================
function gainXP(amount) {
  xp += amount;
  addLog(`✨ Tu gagnes ${amount} XP ! (${xp}/${xpToNextLevel})`);

  if (xp >= xpToNextLevel) {
    levelUp();
  }

  updateXPUI();
}

function levelUp() {
  xp -= xpToNextLevel;
  level++;
  xpToNextLevel = Math.floor(xpToNextLevel * 1.5);

  hero.maxHp += 20;
  hero.attack += 5;
  hero.potions++;

  hero.hp = hero.maxHp;

  addLog(`🔺 LEVEL UP ! Tu es maintenant niveau ${level} !`);
  updateUI();
}

function fillInventory() {
  const inventoryItems = [
    "Pancarte Anti-Capitaliste",
    "Bandana Rouge",
    "T-shirt Che Guevara",
    "Taser improvisé",
    "Brochure sur Marx",
    "Gourde d'Eau (ou Pastis)"
  ];

  const inventoryList = document.getElementById('inventory-list');
  inventoryList.innerHTML = "";

  inventoryItems.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `🛠️ ${item}`;
    inventoryList.appendChild(li);
  });
}

function updateXPUI() {
  document.getElementById('xp-bar').style.width = `${(xp / xpToNextLevel) * 100}%`;
  document.getElementById('xp-text').textContent = `XP: ${xp} / ${xpToNextLevel}`;
}

document.getElementById('heal-btn').addEventListener('click', () => {
  if (redWineCount > 0) {
    let healAmount = 30; // Valeur de soin à ajuster si besoin
    heroHealth += healAmount;

    if (heroHealth > heroMaxHealth) heroHealth = heroMaxHealth;

    redWineCount--; // On utilise une bouteille
    addLog(`🍷 Tu bois une Bouteille de Rouge et récupères ${healAmount} HP !`);
    
    updateRedWineDisplay();
    updateStats(); // Actualisation des PV
    monsterTurn(); // Le monstre (Macron) attaque ensuite !
  } else {
    addLog(`❌ Plus de Bouteilles de Rouge !`);
  }
});


// =======================
// 🎨 INTERFACE
// =======================
function updateUI() {
  heroHpText.textContent = `HP: ${hero.hp} / ${hero.maxHp}`;
  monsterHpText.textContent = `HP: ${monster.hp} / ${monster.maxHp}`;

  heroHpFill.style.width = `${(hero.hp / hero.maxHp) * 100}%`;
  monsterHpFill.style.width = `${(monster.hp / monster.maxHp) * 100}%`;
}

function addLog(message) {
  log.innerHTML += `<p>${message}</p>`;
  log.scrollTop = log.scrollHeight;
}

// =======================
// 🎬 ANIMATIONS SPRITES
// =======================
function preloadAttack1Frames() {
  for (let i = 0; i <= 5; i++) {
    attackFrames.push(`assets/images/hero/Attack1/HeroKnight_Attack2_${i}.png`);
  }
}

function preloadMolotovFrames() {
  for (let i = 0; i <= 7; i++) {
    molotovFrames.push(`assets/images/hero/Attack3/HeroKnight_Attack3_${i}.png`);
  }
}


function preloadBlockFrames() {
  for (let i = 0; i <= 4; i++) {
    blockFrames.push(`assets/images/hero/Block/HeroKnight_Block_${i}.png`);
  }
}

function preloadDeathFrames() {
  for (let i = 0; i <= 9; i++) {
    deathFrames.push(`assets/images/hero/Death/HeroKnight_Death_${i}.png`);
  }
}

function playAttack1Animation() {
  clearInterval(frameInterval);
  currentFrame = 0;

  frameInterval = setInterval(() => {
    heroSprite.src = attackFrames[currentFrame];
    currentFrame++;

    if (currentFrame >= attackFrames.length) {
      clearInterval(frameInterval);
      startIdleAnimation();
    }
  }, 80);
}

function playMolotovAnimation() {
  clearInterval(frameInterval);
  currentFrame = 0;

  frameInterval = setInterval(() => {
    heroSprite.src = molotovFrames[currentFrame];
    currentFrame++;

    if (currentFrame >= molotovFrames.length) {
      clearInterval(frameInterval);
      startIdleAnimation(); // Retour à l'idle après l'attaque
    }
  }, 100); // Temps par frame (ajuste si besoin)
}


function playBlockAnimation() {
  clearInterval(frameInterval);
  currentFrame = 0;

  frameInterval = setInterval(() => {
    heroSprite.src = blockFrames[currentFrame];
    currentFrame++;

    if (currentFrame >= blockFrames.length) {
      clearInterval(frameInterval);
      startIdleAnimation();
    }
  }, 100);
}

function playDeathAnimation() {
  clearInterval(frameInterval);
  currentFrame = 0;

  frameInterval = setInterval(() => {
    heroSprite.src = deathFrames[currentFrame];
    currentFrame++;

    if (currentFrame >= deathFrames.length) {
      clearInterval(frameInterval);
      addLog(`💀 Tu es mort... Clique sur 'Prochain combat' pour recommencer !`);
    }
  }, 150);
}

function startIdleAnimation() {
  heroSprite.src = 'assets/images/hero/Idle/HeroKnight_Idle_0.png';
}

// =======================
// 🎮 EVENTS LISTENERS
// =======================
attackBtn.addEventListener('click', () => {
  playAttack1Animation();
  lancerDePave();
});


const molotovButton = document.getElementById('molotovButton');

molotovButton.addEventListener('click', () => {
     // ✅ L'animation
  cocktailMolotov();
  if (redWineCount > 0) {
    playMolotovAnimation();
  }

});

document.getElementById('heal-btn').addEventListener('click', () => {
  if (redWineCount > 0) {
    heroHealth += 30;
    if (heroHealth > heroMaxHealth) heroHealth = heroMaxHealth;

    redWineCount--;
    addLog(`🍷 Tu bois une Bouteille de Rouge et récupères 30 HP !`);

    updateRedWineDisplay();
    updateStats();
    monsterTurn();
  } else {
    addLog(`❌ Plus de Bouteilles de Rouge !`);
  }
});


defendBtn.addEventListener('click', () => {
  playBlockAnimation();
  arretMaladie();
});

healBtn.addEventListener('click', () => {
  bouteilleDeRouge();
});


// =======================
// 🚀 LANCEMENT DU JEU
// =======================

initGame();
