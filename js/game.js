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
let redWineCount = 3;
let defenseTurnsLeft = 0;
let isGameOver = false;
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
  if (isGameOver) return;

  // Ratio de vie (entre 0 et 1)
  let hpRatio = hero.hp / hero.maxHp;

  // Bonus de dégâts aléatoire : entre 0 et 50%, boosté si PV bas
  let bonusMultiplier = 0.5 + (1 - hpRatio) * 0.5; // Va de 0.5 (PV hauts) à 1 (PV bas)
  let randomBonusPercent = Math.random() * bonusMultiplier;

  // Dégâts de base avec le bonus random appliqué
  let baseDamage = Math.floor(hero.attack * (1 + randomBonusPercent));

  let damage = baseDamage;

  // Coup critique (double les dégâts)
  let isCrit = Math.random() < 0.2; // 20% de chance
  if (isCrit) {
    damage *= 2;
    addLog(`💥 Révolte enflammée ! Pavé magistral lancé sur ${monster.name}, -${damage} HP !`);
  } else {
    addLog(`🧱 Pavé lancé sur ${monster.name}, -${damage} HP !`);
  }

  // Appliquer les dégâts au monstre
  monster.hp -= damage;

  // Vérifier si le monstre est vaincu
  if (monster.hp <= 0) {
    monster.hp = 0;
    updateUI();
    victory();
    return;
  }

  // Chance de récupérer une Bouteille de Rouge
  if (Math.random() < 0.3) {
    redWineCount++;
    addLog(`🍷 Bouteille de Rouge ramassée sur le champ de bataille ! (${redWineCount})`);
    updateRedWineDisplay();
  }

  // Mettre à jour l'interface
  updateUI();

  // Fin du tour
  endTurn();
}



function cocktailMolotov() {
  if (isGameOver) return;

  const damage = hero.attack * 2;

  if (redWineCount <= 0) {
    addLog(`🚫 Pas de bouteilles de vin rouge pour faire un cocktail molotov !`);
    return;
  }

  redWineCount--;
  updateRedWineDisplay(); // Ajout ici
  monster.hp -= damage;
  addLog(`🔥 Tu balances un cocktail molotov sur ${monster.name} ! -${damage} HP !`);

  playMolotovAnimation();

  if (Math.random() < 0.3) {
    redWineCount++;
    updateRedWineDisplay(); // Ajout ici
    addLog(`🍷 Une Bouteille de Rouge est récupérée !`);
  }

  updateUI();
  endTurn();
}



function arretMaladie() {
  if (isGameOver) return;

  hero.defending = true;

  // Randomisation : durée entre 1 et 3 tours
  defenseTurnsLeft = Math.floor(Math.random() * 3) + 1;

  // Bonus temporaire : la défense est boostée selon la durée
  const defenseBoost = defenseTurnsLeft * 2; // +2 défense par tour d'arrêt
  hero.defense += defenseBoost;

  addLog(`🏥 Tu es en arrêt maladie pendant ${defenseTurnsLeft} tours ! Tu gagnes +${defenseBoost} en défense. Planqué chez toi avec Netflix et ta carte Vitale...`);

  // Animation / son (optionnel)
  sounds.defend.play();
  playBlockAnimation();

  endTurn();
}

function bouteilleDeRouge() {
  if (isGameOver) return;
  
  if (redWineCount <= 0) {
    addLog(`🚫 Plus de Bouteilles de Rouge pour te soigner !`);
    return;
  }

  // Décrémentation correcte
  redWineCount--;
  updateRedWineDisplay();

  // Calcul du soin : 30 PV de base + variation aléatoire (0-20)
  const baseHeal = 30;
  const randomBonus = Math.floor(Math.random() * 21); // 0 à 20
  const totalHeal = baseHeal + randomBonus;

  // Application du soin avec limite max
  hero.hp = Math.min(hero.maxHp, hero.hp + totalHeal);
  
  // Bonus de défense si HP étaient bas
  if (hero.hp / hero.maxHp < 0.3) {
    totalHeal += 10;
    addLog(`💪 Sursaut révolutionnaire ! +10 PV bonus !`);
  }

  // Animation temporaire (remplacer par animation de soin si disponible)
  playBlockAnimation();
  sounds.potion.play();

  // Message avec le total soigné
  addLog(`🍷 Soin réussi ! (+${totalHeal} PV) Il reste ${redWineCount} bouteilles`);

  // Mise à jour interface et fin de tour
  updateUI();
  endTurn();
}



// =======================
// 🧠 LOGIQUE COMBAT
// =======================

function endTurn() {
  updateUI();

  if (isGameOver) return;  // Ajout ici pour bloquer les tours
  
  if (monster.hp <= 0) {
    sounds.win.play();
    victory();
    return;
  }

  setTimeout(() => {
    if (!isGameOver) monsterAttack();
  }, 500);
}


function monsterAttack() {
  if (isGameOver) return;

  const attackOptions = [
    {
      name: "Prélèvement à la source",
      baseDamage: 18,
      img: "macron1.png",
      effect: () => {
        addLog("💸 Macron te ponctionne directement sur ton salaire !");
      },
      getDamage: () => {
        // Peut faire 10 à 30% de dégâts en plus selon ton nombre de bouteilles
        let bonus = redWineCount > 5 ? 1.3 : 1.1;
        return Math.floor(15 * bonus);
      }
    },
    {
      name: "Réforme des retraites",
      baseDamage: 13,
      img: "macron2.png",
      effect: () => {
        hero.defense = Math.max(0, hero.defense - 2);
        addLog("📉 Ta défense est réduite à cause de la réforme !");
      },
      getDamage: () => {
        // Plus tu es vieux (HP faible), plus ça fait mal
        let bonus = hero.hp / hero.maxHp < 0.3 ? 1.5 : 1;
        return Math.floor(13 * bonus);
      }
    },
    {
      name: "Suppression APL",
      baseDamage: 10,
      img: "macron3.png",
      effect: () => {
        if (redWineCount > 0) {
          redWineCount--;
          updateRedWineDisplay();
          addLog("🏚️ Il t’a piqué une bouteille de vin rouge !");
        } else {
          addLog("🏚️ Tu n'avais plus rien, Macron t'humilie publiquement !");
        }
      },
      getDamage: () => {
        // Si tu n'as plus de bouteilles, il te fout 5 de dégâts psychologiques
        return redWineCount === 0 ? 15 : 10;
      }
    },
    {
      name: "Augmentation CSG",
      baseDamage: 12,
      img: "macron4.png",
      effect: () => {
        addLog("📈 Tu subis une taxe continue !");
        setTimeout(() => {
          if (!isGameOver) {
            hero.hp -= 5;
            addLog("💸 La CSG continue de te saigner (-5 HP)");
            updateUI();
          }
        }, 3000);
      },
      getDamage: () => {
        // Dégâts boostés si ton XP est proche d'un level up (rage fiscale)
        let bonus = xp >= xpToNextLevel - 10 ? 1.5 : 1;
        return Math.floor(12 * bonus);
      }
    },
    {
      name: "49.3 Ultime",
      baseDamage: 30,
      img: "macron5.png",
      effect: () => {
        addLog("⚡ Coup de massue législatif ! 49.3 utilisé !");
      },
      getDamage: () => {
        // Si Macron est en dessous de 50% de HP, il tape plus fort : panique à l'Élysée !
        let bonus = monster.hp / monster.maxHp < 0.5 ? 1.5 : 1;
        return Math.floor(40 * bonus);
      }
    },
    {
      name: "Conférence de presse",
      baseDamage: 0,
      img: "macron8.png",
      effect: () => {
        monster.hp = Math.min(monster.maxHp, monster.hp + 30);
        addLog("🎙️ Macron se soigne en parlant : +30 HP !");
        updateUI();
      },
      getDamage: () => 0 // Pas de dégâts
    }
  ];

  // Sélection de l'action
  const action = attackOptions[Math.floor(Math.random() * attackOptions.length)];
  monsterSprite.src = `assets/images/macron/${action.img}`;

  // Calcul des dégâts
  let damage = typeof action.getDamage === 'function' ? action.getDamage() : action.baseDamage;

  // Gestion de la défense du héros
  if (hero.defending) {
    damage -= hero.defense;
    hero.defending = false;
  }

  // Appliquer le minimum 0
  damage = Math.max(0, damage);

  // Appliquer les dégâts
  hero.hp -= damage;

  // Exécuter l'effet spécifique
  action.effect();

  // Effet sonore et animation
  sounds.hit.play();
  heroSprite.classList.add('shake');
  setTimeout(() => heroSprite.classList.remove('shake'), 300);

  // Affichage dans le log
  addLog(`👹 ${currentMonster.name} utilise "${action.name}" et inflige ${damage} dégâts !`);

  // Vérification si le héros est mort
  if (hero.hp <= 0) {
    hero.hp = 0;
    sounds.lose.play();
    addLog(`💀 Tu es tombé au combat... Score final : ${score}`);

    disableButtons();
    playDeathAnimation();
    defeat();
    isGameOver = true;
  }

  // Mise à jour de l'UI
  updateUI();
}




function disableButtons() {
  attackBtn.disabled = true;
  defendBtn.disabled = true;
  healBtn.disabled = true;
  molotovButton.disabled = true;
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

/*document.getElementById('heal-btn').addEventListener('click', () => {
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
});*/


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
  if (isGameOver) return;
  playAttack1Animation();
  lancerDePave();
});


const molotovButton = document.getElementById('molotovButton');

molotovButton.addEventListener('click', () => {
  if (isGameOver) return; // Protection
  cocktailMolotov(); // Il va gérer tout

});



document.getElementById('heal-btn').addEventListener('click', () => {
  if (isGameOver) return;
  bouteilleDeRouge();
});


defendBtn.addEventListener('click', () => {
  if (isGameOver) return;
  playBlockAnimation();
  arretMaladie();
});



function victory() {
  isGameOver = true;
  document.getElementById("victoryModal").style.display = "flex";
}

function defeat() {
  if (isGameOver) return; // Pour éviter plusieurs appels
  isGameOver = true;
  disableButtons();
  playDeathAnimation();
  document.getElementById("defeatModal").style.display = "flex";
}


function restartGame() {
  location.reload();
}


function addLog(message) {
  const log = document.getElementById('log');
  const newLog = document.createElement('p');
  newLog.textContent = message;
  log.appendChild(newLog);
  log.scrollTop = log.scrollHeight;   // <-- Scroll auto
}

function checkVictoryOrDefeat() {
  if (monster.hp <= 0) {
    showVictoryScreen();
  } else if (hero.hp <= 0) {
    showDefeatScreen();
  }
}

function showVictoryScreen() {
  document.getElementById("victory-screen").classList.remove("hidden");
}

function showDefeatScreen() {
  document.getElementById("defeat-screen").classList.remove("hidden");
}

function hideEndScreens() {
  document.getElementById("victory-screen").classList.add("hidden");
  document.getElementById("defeat-screen").classList.add("hidden");
}






// =======================
// 🚀 LANCEMENT DU JEU
// =======================

initGame();
