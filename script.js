// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Application State & Constants ---
    const AppState = {
        currentUser: null,
        userData: {},
        allUserData: {},
        globalCardIdCounter: 0,
        isComputerUI: false,
        isRolling: false,
        rollCooldownTimer: null,
        luckActive: false,
        luckTimerInterval: null,
        luckTimeRemaining: 0,
        speedBoostActive: false,
        speedTimerInterval: null,
        speedTimeRemaining: 0,
        battleBoostActive: false, // Consumed per battle
        currentBattleState: null,
        activeTab: 'roll' // Default active tab
    };

    // --- Constants ---
    const BASE_COOLDOWN_MS = 5000;
    const COOLDOWN_REDUCTION_MS = 250;
    const MIN_COOLDOWN_MS = 1000;
    const BOOST_DURATION_MS = 30000;
    const APPRAISAL_COST = 500;
    const APPRAISAL_VALUE_MULTIPLIER = 1.5;
    const GRADE_UPGRADE_CHANCE = 0.5;
    const QUALITY_UPGRADE_CHANCE = 0.5;
    const DECK_SIZE_LIMIT = 5;
    const LEADERBOARD_SIZE = 10;
    const SELL_DUPLICATE_SCORE_DIVISOR = 10;
    const BATTLE_WIN_SCORE_DIVISOR = 5;
    const DAILY_CHALLENGE_SCORE_DIVISOR = 2;

    // --- Bank Constants ---
    const PASSIVE_INCOME_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours
    const SAVINGS_INTEREST_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours
    const LOAN_INTEREST_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day
    const SAVINGS_INTEREST_RATE = 0.02; // 2%
    const LOAN_INTEREST_RATE = 0.05; // 5%
    const MAX_LOAN_AMOUNT = 15000;

    // --- Game Data Definitions ---
    const GRADES = Object.freeze(["E", "D", "C", "B", "A", "S", "SS"]);
    const GRADE_MULTIPLIERS = Object.freeze({ E: 0.8, D: 0.9, C: 1.0, B: 1.1, A: 1.2, S: 1.4, SS: 1.6 });
    const QUALITIES = Object.freeze(["destroyed", "ripped", "crumpled", "creased", "Mint condition"]);
    const QUALITY_MULTIPLIERS = Object.freeze({ destroyed: 0.7, ripped: 0.8, crumpled: 0.9, creased: 0.95, "Mint condition": 1.0 });

    const RARITIES = Object.freeze([
        { name: "common", prob: 15, color: "#BBBBBB", stats: { min: 5, max: 15 }, value: 5 },
        { name: "uncommon", prob: 10, color: "#00FF00", stats: { min: 10, max: 25 }, value: 10 },
        { name: "rare", prob: 7.5, color: "#00BFFF", stats: { min: 20, max: 40 }, value: 20 },
        { name: "epic", prob: 5, color: "#800080", stats: { min: 35, max: 60 }, value: 40 },
        { name: "legendary", prob: 4, color: "#FFA500", stats: { min: 50, max: 80 }, value: 75 },
        { name: "mythic", prob: 3, color: "#FF4500", stats: { min: 70, max: 110 }, value: 120 },
        { name: "divine", prob: 2, color: "#FFD700", stats: { min: 100, max: 150 }, value: 200 },
        { name: "cosmic", prob: 1, color: "#FF0000", stats: { min: 140, max: 200 }, value: 300 },
        { name: "eternal", prob: 0.1, color: "#00CED1", stats: { min: 180, max: 250 }, value: 500 },
        { name: "celestial", prob: 0.01, color: "#FF69B4", stats: { min: 220, max: 300 }, value: 800 },
        { name: "transcendent", prob: 0.001, color: "#8A2BE2", stats: { min: 280, max: 380 }, value: 1200 },
        { name: "godly", prob: 0.0001, color: "#DAA520", stats: { min: 350, max: 480 }, value: 2000 },
        { name: "extreme", prob: 0.00001, color: "#800000", stats: { min: 450, max: 600 }, value: 3500 },
        { name: "solar", prob: 0.00005, color: "#FF6347", stats: { min: 400, max: 550 }, value: 2800 },
        { name: "galactic", prob: 0.00003, color: "#483D8B", stats: { min: 420, max: 580 }, value: 3000 },
        { name: "universal", prob: 0.000001, color: "#2F4F4F", stats: { min: 500, max: 700 }, value: 5000 },
        { name: "mythos", prob: 0.000005, color: "#A52A2A", stats: { min: 480, max: 650 }, value: 4500 },
        { name: "primal", prob: 0.000002, color: "#FF1493", stats: { min: 490, max: 680 }, value: 4800 },
        { name: "ethereal", prob: 0.0000001, color: "#8B0000", stats: { min: 600, max: 800 }, value: 7000 },
        { name: "restricted", prob: 0.00000005, color: "#556B2F", stats: { min: 700, max: 1000 }, value: 10000 }
    ]);

    const CASE_PROBABILITIES = Object.freeze({
        basic: { cost: 100, drops: { common: 50, uncommon: 35, rare: 13, epic: 2 }, potionChance: 0.05 },
        premium: { cost: 200, drops: { uncommon: 40, rare: 35, epic: 20, legendary: 5 }, potionChance: 0.10 },
        ultra: { cost: 400, drops: { rare: 40, epic: 30, legendary: 20, mythic: 10 }, potionChance: 0.15 },
        elite: { cost: 800, drops: { epic: 40, legendary: 30, mythic: 20, divine: 10 }, potionChance: 0.20 },
        legendary: { cost: 1200, drops: { legendary: 35, mythic: 30, divine: 20, cosmic: 10, eternal: 5 }, potionChance: 0.25 }
    });
    const POTION_TYPES = Object.freeze(['luck', 'speed', 'battle']);

    // --- DOM Element Cache ---
    // Cache frequently accessed elements
    const DOMElements = {
        body: document.body,
        toggleUIButton: document.getElementById('toggleUI'),
        loginScreen: document.getElementById('loginScreen'),
        gameScreen: document.getElementById('gameScreen'),
        loginForm: document.getElementById('loginForm'),
        usernameInput: document.getElementById('usernameInput'),
        passwordInput: document.getElementById('passwordInput'),
        userGreeting: document.getElementById('userGreeting'),
        totalPowerDisplaySpan: document.querySelector('#totalPowerDisplay span'),
        currencyDisplaySpan: document.querySelector('#currencyDisplay span'),
        logoutBtn: document.getElementById('logoutBtn'),
        deleteDataBtn: document.getElementById('deleteDataBtn'),
        tabNav: document.querySelector('.tab-nav'),
        tabContents: document.querySelectorAll('.tabContent'),
        tabButtons: document.querySelectorAll('.tabButton'),
        inventoryFilters: document.getElementById('inventoryFilters'),
        deckFilters: document.getElementById('deckFilters'),
        rarityFilterSelect: document.getElementById('rarityFilter'),
        deckRarityFilterSelect: document.getElementById('deckRarityFilter'),
        rollContent: document.getElementById('rollContent'), // Added
        rollInstructions: document.getElementById('rollInstructions'),
        boostStatusP: document.getElementById('boostStatus'),
        rollLuckDisplayP: document.getElementById('rollLuckDisplay'),
        rollButton: document.getElementById('rollButton'),
        cooldownTimerP: document.getElementById('cooldownTimer'),
        rollResultDiv: document.getElementById('rollResult'),
        flipCardBtn: document.getElementById('flipCardBtn'),
        rarityRolledListUl: document.getElementById('rarityRolledList'),
        deckContent: document.getElementById('deckContent'), // Added
        deckInventoryListUl: document.getElementById('deckInventoryList'),
        currentDeckDiv: document.getElementById('currentDeck'),
        deckListUl: document.getElementById('deckList'),
        deckCountSpan: document.querySelector('#currentDeck h3 span'),
        deckPowerSpan: document.getElementById('deckPower'),
        inventoryContent: document.getElementById('inventoryContent'), // Added
        inventoryCountSpan: document.getElementById('inventoryCount'),
        sellDuplicatesBtn: document.getElementById('sellDuplicatesBtn'),
        inventoryListUl: document.getElementById('inventoryList'),
        appraisalContent: document.getElementById('appraisalContent'), // Added
        appraisalListUl: document.getElementById('appraisalList'),
        upgradesContent: document.getElementById('upgradesContent'), // Added
        cooldownLevelP: document.getElementById('cooldownLevelDisplay'),
        luckLevelP: document.getElementById('luckLevelDisplay'),
        currentCooldownP: document.getElementById('currentCooldownDisplay'),
        upgradeLuckDisplayP: document.getElementById('upgradeLuckDisplay'),
        upgradeCooldownBtn: document.getElementById('upgradeCooldownBtn'),
        cooldownCostSpan: document.getElementById('cooldownCost'),
        upgradeLuckBtn: document.getElementById('upgradeLuckBtn'),
        luckCostSpan: document.getElementById('luckCost'),
        potionStatusDiv: document.getElementById('potionStatus'),
        luckPotionCountSpan: document.getElementById('luckPotionCount'),
        buyLuckPotionBtn: document.getElementById('buyLuckPotionBtn'),
        useLuckPotionBtn: document.getElementById('useLuckPotionBtn'),
        speedPotionCountSpan: document.getElementById('speedPotionCount'),
        buySpeedPotionBtn: document.getElementById('buySpeedPotionBtn'),
        useSpeedPotionBtn: document.getElementById('useSpeedPotionBtn'),
        battlePotionCountSpan: document.getElementById('battlePotionCount'),
        buyBattlePotionBtn: document.getElementById('buyBattlePotionBtn'),
        useBattlePotionBtn: document.getElementById('useBattlePotionBtn'),
        casesContent: document.getElementById('casesContent'), // Added
        caseAnimationDiv: document.getElementById('caseAnimation'),
        caseResultDiv: document.getElementById('caseResult'),
        caseButtons: document.querySelectorAll('#casesContent .btn-case'), // More specific
        battleContent: document.getElementById('battleContent'), // Added
        startBattleBtn: document.getElementById('startBattleBtn'),
        battleAreaDiv: document.getElementById('battleArea'),
        turnLogDiv: document.getElementById('turnLog'),
        nextTurnBtn: document.getElementById('nextTurnBtn'),
        battleResultDiv: document.getElementById('battleResult'),
        leaderboardContent: document.getElementById('leaderboardContent'), // Added
        playerScoreDisplayP: document.getElementById('playerScoreDisplay'),
        leaderboardListUl: document.getElementById('leaderboardList'),
        dailyContent: document.getElementById('dailyContent'), // Added
        dailyChallengeInfoDiv: document.getElementById('dailyChallengeInfo'),
        claimDailyChallengeBtn: document.getElementById('claimDailyChallengeBtn'),
        generateNewChallengeBtn: document.getElementById('generateNewChallengeBtn'),
        bankContent: document.getElementById('bankContent'), // Added
        passiveIncomeRateP: document.getElementById('passiveIncomeRate'),
        nextPassiveIncomeTimeP: document.getElementById('nextPassiveIncomeTime'),
        savingsBalanceP: document.getElementById('savingsBalance'),
        nextSavingsInterestTimeP: document.getElementById('nextSavingsInterestTime'),
        depositAmountInput: document.getElementById('depositAmount'),
        depositBtn: document.getElementById('depositBtn'),
        withdrawBtn: document.getElementById('withdrawBtn'),
        loanAmountDisplayP: document.getElementById('loanAmountDisplay'),
        nextLoanInterestTimeP: document.getElementById('nextLoanInterestTime'),
        loanRequestAmountInput: document.getElementById('loanRequestAmount'),
        takeLoanBtn: document.getElementById('takeLoanBtn'),
        repayLoanAmountInput: document.getElementById('repayLoanAmount'),
        repayLoanBtn: document.getElementById('repayLoanBtn'),
        appraisalOverlay: document.getElementById('appraisalOverlay'),
        appraisalCircle: document.getElementById('appraisalCircle'),
        appraisalPopup: document.getElementById('appraisalPopup'),
        appraisalPopupMessage: document.getElementById('appraisalPopupMessage'),
        closeAppraisalPopupBtn: document.getElementById('closeAppraisalPopupBtn'),
        // Audio Elements
        rollSound: document.getElementById('rollSound'),
        sellSound: document.getElementById('sellSound'),
        winSound: document.getElementById('winSound'),
        loseSound: document.getElementById('loseSound'),
    };

    // --- Utility Functions ---
    const Utils = {
        capitalize: (s) => {
            if (typeof s !== 'string' || s.length === 0) return '';
            return s.charAt(0).toUpperCase() + s.slice(1);
        },
        getRandomInt: (min, max) => {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        playSound: (soundElement) => {
            if (soundElement && soundElement.readyState >= 2) { // Check if ready
                soundElement.currentTime = 0;
                soundElement.play().catch(e => console.warn("Audio play failed:", e.message));
            }
        },
        showElement: (element) => element?.classList.remove('hidden'),
        hideElement: (element) => element?.classList.add('hidden'),
        setActive: (element) => element?.classList.add('active'),
        setInactive: (element) => element?.classList.remove('active'),
        enableButton: (button) => { if(button) button.disabled = false; },
        disableButton: (button) => { if(button) button.disabled = true; },
        formatTimeRemaining: (ms) => {
            if (ms <= 0) return "Now";
            const totalSeconds = Math.max(0, Math.floor(ms / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            let str = "";
            if (hours > 0) str += `${hours}h `;
            if (minutes > 0 || hours > 0) str += `${minutes}m `;
            str += `${seconds}s`;
            return str.trim() || "0s";
        },
         // Simple debounce function
         debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    // --- Data Persistence (LocalStorage) ---
    const Storage = {
        loadAllUserData: () => {
            try {
                return JSON.parse(localStorage.getItem("allUserData_v2") || "{}");
            } catch (e) {
                console.error("Error parsing allUserData from localStorage:", e);
                alert("Error loading user data. Data might be corrupted. Please check console.");
                // Consider clearing corrupted data: localStorage.removeItem("allUserData_v2");
                return {};
            }
        },
        saveAllUserData: (allData) => {
            try {
                localStorage.setItem("allUserData_v2", JSON.stringify(allData));
            } catch (e) {
                console.error("Error saving allUserData to localStorage:", e);
                alert("Error saving game data. Progress might not be saved.");
            }
        },
        loadGlobalCounter: () => {
            return parseInt(localStorage.getItem("globalCardIdCounter_v2") || "0");
        },
        saveGlobalCounter: (counter) => {
            localStorage.setItem("globalCardIdCounter_v2", counter.toString());
        },
        saveUserData: () => {
            if (AppState.currentUser && AppState.userData) {
                // Deep clone userData to avoid modifying the live state unintentionally before saving
                const dataToSave = JSON.parse(JSON.stringify(AppState.userData));
                AppState.allUserData[AppState.currentUser] = dataToSave;
                Storage.saveAllUserData(AppState.allUserData);
                Storage.saveGlobalCounter(AppState.globalCardIdCounter);
                // console.log("User data saved for", AppState.currentUser);
            } else {
                console.warn("Attempted to save data without a current user or valid userData.");
            }
        }
    };

    // --- Authentication & User Management ---
    const Auth = {
        handleLoginSignup: (event) => {
            event.preventDefault();
            const username = DOMElements.usernameInput.value.trim();
            const password = DOMElements.passwordInput.value; // WARNING: Plain text password
            const action = DOMElements.loginForm.querySelector('input[name="action"]:checked').value;

            if (!username || !password) {
                alert("Please fill in both username and password.");
                return;
            }

            if (action === "login") {
                Auth.login(username, password);
            } else if (action === "signup") {
                Auth.signup(username, password);
            }
        },

        login: (username, password) => {
            if (!AppState.allUserData[username]) {
                alert("User does not exist. Please sign up.");
                return;
            }
            const savedUserData = AppState.allUserData[username];
            // WARNING: Storing and comparing passwords in plain text is highly insecure.
            // This is for demonstration purposes only in a client-side context.
            // In a real application, use secure hashing and server-side validation.
            if (savedUserData.password !== password) {
                alert("Incorrect password.");
                return;
            }

            AppState.currentUser = username;
            AppState.userData = savedUserData;
            Auth.initializeUserData(); // Ensure all fields are present
            Auth.loginSuccess();
        },

        signup: (username, password) => {
            if (AppState.allUserData[username]) {
                alert("Username already exists. Please choose another.");
                return;
            }

            // Create new user data object
            const newUser = Auth.createDefaultUserData(username, password);
            AppState.currentUser = username;
            AppState.userData = newUser;
            AppState.allUserData[username] = newUser;
            Storage.saveAllUserData(AppState.allUserData);
            Auth.initializeUserData(); // Initialize for the new user
            Auth.loginSuccess();
        },

        createDefaultUserData: (username, password) => ({
            username: username,
            password: password, // Insecure: Store securely in real apps!
            currency: 100,
            playerScore: 0,
            cooldownLevel: 0,
            luckLevel: 0,
            inventory: [],
            deck: [],
            potions: { luck: 0, speed: 0, battle: 0 },
            dailyChallenge: null,
            bankSavings: 0,
            loanAmount: 0,
            lastPassiveIncomeTimestamp: Date.now(),
            lastSavingsTimestamp: 0,
            lastLoanInterestTimestamp: 0
        }),

        // Ensures essential properties exist after loading, setting defaults if missing
        initializeUserData: () => {
             const defaults = Auth.createDefaultUserData('', ''); // Get default structure
             for (const key in defaults) {
                 if (!(key in AppState.userData)) {
                     AppState.userData[key] = defaults[key];
                     console.warn(`Initialized missing user data key: ${key}`);
                 }
             }
             // Deeper initialization for nested objects/arrays
             AppState.userData.inventory = AppState.userData.inventory || [];
             AppState.userData.deck = AppState.userData.deck || [];
             AppState.userData.potions = AppState.userData.potions || { luck: 0, speed: 0, battle: 0 };

             // Initialize bank timestamps correctly based on state
             const now = Date.now();
             AppState.userData.lastPassiveIncomeTimestamp = AppState.userData.lastPassiveIncomeTimestamp || now;
             AppState.userData.lastSavingsTimestamp = AppState.userData.lastSavingsTimestamp || (AppState.userData.bankSavings > 0 ? now : 0);
             AppState.userData.lastLoanInterestTimestamp = AppState.userData.lastLoanInterestTimestamp || (AppState.userData.loanAmount > 0 ? now : 0);

             DailyChallenge.initialize();
             Bank.processOfflineChanges(now);
        },

        loginSuccess: () => {
            console.log("Login successful for:", AppState.currentUser);
            Utils.setInactive(DOMElements.loginScreen);
            Utils.setActive(DOMElements.gameScreen);
            UI.updateAll(); // Full UI update
            UI.showTab(AppState.activeTab); // Show last active or default tab
        },

        logout: () => {
            if (!AppState.currentUser) return;
            Storage.saveUserData(); // Save before logging out
            AppState.currentUser = null;
            AppState.userData = {};
            Utils.setInactive(DOMElements.gameScreen);
            Utils.setActive(DOMElements.loginScreen);
            DOMElements.usernameInput.value = "";
            DOMElements.passwordInput.value = "";
            console.log("User logged out.");
            // Clear sensitive timers if necessary
            clearInterval(AppState.rollCooldownTimer);
            clearInterval(AppState.luckTimerInterval);
            clearInterval(AppState.speedTimerInterval);
            AppState.isRolling = false;
        },

        deleteUserData: () => {
            if (!AppState.currentUser) return;
            if (confirm(`Are you sure you want to delete ALL data for ${AppState.currentUser}? This cannot be undone.`)) {
                delete AppState.allUserData[AppState.currentUser];
                Storage.saveAllUserData(AppState.allUserData);
                alert("Data deleted. You will now be logged out.");
                Auth.logout();
            }
        }
    };

    // --- Core Game Logic ---
    const GameLogic = {
        calculateTotalPower: () => {
            if (!AppState.userData) return 0;
            let total = AppState.userData.playerScore || 0;
            (AppState.userData.inventory || []).forEach(card => {
                total += (card.attack || 0) + (card.defense || 0);
            });
            return total;
        },

        calculateLuckBonusPercentage: () => {
            if (!AppState.userData) return 0;
            const levelBonus = (AppState.userData.luckLevel || 0) * 2;
            const potionBonus = AppState.luckActive ? 10 : 0;
            return levelBonus + potionBonus;
        },

        calculateCurrentCooldown: () => {
            if (!AppState.userData) return BASE_COOLDOWN_MS;
            let currentCooldown = Math.max(
                BASE_COOLDOWN_MS - (AppState.userData.cooldownLevel || 0) * COOLDOWN_REDUCTION_MS,
                MIN_COOLDOWN_MS
            );
            if (AppState.speedBoostActive) {
                currentCooldown = Math.max(currentCooldown * 0.7, MIN_COOLDOWN_MS);
            }
            return currentCooldown;
        },

        generateRandomAbility: () => {
            const effects = ["Heal", "Damage Boost", "Defense Buff", "Crit Chance", "Cooldown Reduction", "Life Steal"];
            const targets = ["self", "enemy", "random ally"];
            const triggers = ["On Play", "Start of Turn", "On Attack", "On Defeat"];
            const value = Utils.getRandomInt(5, 25);
            const duration = Utils.getRandomInt(1, 3);
            const effect = effects[Utils.getRandomInt(0, effects.length - 1)];
            const target = targets[Utils.getRandomInt(0, targets.length - 1)];
            const trigger = triggers[Utils.getRandomInt(0, triggers.length - 1)];

            return {
                description: `${effect} ${value} on ${target} (${trigger})`, // Simplified description
                effect: effect,
                value: value,
                target: target,
                trigger: trigger,
                duration: duration
            };
        },

        generateCard: (rarityName) => {
            const rarityData = RARITIES.find(r => r.name === rarityName);
            if (!rarityData) return null;

            const grade = GRADES[Utils.getRandomInt(0, GRADES.length - 1)];
            const quality = QUALITIES[Utils.getRandomInt(0, QUALITIES.length - 1)];
            const baseAttack = Utils.getRandomInt(rarityData.stats.min, rarityData.stats.max);
            const baseDefense = Utils.getRandomInt(rarityData.stats.min, rarityData.stats.max);

            const gradeMultiplier = GRADE_MULTIPLIERS[grade] || 1.0;
            const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1.0;

            const attack = Math.max(1, Math.floor(baseAttack * gradeMultiplier * qualityMultiplier));
            const defense = Math.max(1, Math.floor(baseDefense * gradeMultiplier * qualityMultiplier));
            const value = Math.max(1, Math.floor(rarityData.value * gradeMultiplier * qualityMultiplier));

            AppState.globalCardIdCounter++;

            return {
                id: `card-${AppState.currentUser}-${AppState.globalCardIdCounter}`,
                name: `${Utils.capitalize(rarityName)} Card #${Utils.getRandomInt(1, 100)}`,
                value: value,
                description: `A ${rarityName} card. Grade: ${grade}, Quality: ${quality}.`, // Simpler desc
                ability: GameLogic.generateRandomAbility(),
                attack: attack,
                defense: defense,
                rarity: rarityName,
                grade: grade,
                quality: quality,
                color: rarityData.color
            };
        },

        rollForCard: () => {
            if (AppState.isRolling || !AppState.currentUser || !AppState.userData) return;

            AppState.isRolling = true;
            Utils.disableButton(DOMElements.rollButton);
            Utils.playSound(DOMElements.rollSound);
            DOMElements.rollResultDiv.innerHTML = '<p>Rolling...</p>'; // Indicate rolling
            DOMElements.rollResultDiv.classList.add('visible');
            Utils.hideElement(DOMElements.flipCardBtn);

            const luckBonusPercent = GameLogic.calculateLuckBonusPercentage();
            const luckMultiplier = 1 + (luckBonusPercent / 100);

            const weightedRarities = RARITIES.map(r => ({
                name: r.name,
                weight: r.prob * luckMultiplier
            }));

            const totalWeight = weightedRarities.reduce((sum, r) => sum + r.weight, 0);
            let rollRandom = Math.random() * totalWeight;
            let cumulativeWeight = 0;
            let chosenRarityName = RARITIES[0].name; // Default to common

            for (const rarity of weightedRarities) {
                cumulativeWeight += rarity.weight;
                if (rollRandom <= cumulativeWeight) {
                    chosenRarityName = rarity.name;
                    break;
                }
            }

            // Add a small delay for visual effect before showing the card
            setTimeout(() => {
                let newCard = GameLogic.generateCard(chosenRarityName);
                if (!newCard) {
                    console.error("Failed to generate card for rarity:", chosenRarityName, " - defaulting to common.");
                    newCard = GameLogic.generateCard("common");
                    if (!newCard) { // Still failed?
                        alert("Critical Error: Could not generate card. Please try again.");
                        AppState.isRolling = false;
                        Utils.enableButton(DOMElements.rollButton);
                        DOMElements.rollResultDiv.innerHTML = '';
                         DOMElements.rollResultDiv.classList.remove('visible');
                        return;
                    }
                }

                AppState.userData.inventory = AppState.userData.inventory || [];
                AppState.userData.inventory.push(newCard);

                UI.displayRollResult(newCard);
                GameLogic.startCooldownTimer();
                UI.updateAll(); // Update everything after getting a card
            }, 500); // 500ms delay
        },

        startCooldownTimer: () => {
            const currentCooldownMs = GameLogic.calculateCurrentCooldown();
            let remainingMs = currentCooldownMs;
            Utils.disableButton(DOMElements.rollButton);

            if (AppState.rollCooldownTimer) clearInterval(AppState.rollCooldownTimer);

            const updateTimerDisplay = () => {
                 DOMElements.cooldownTimerP.innerText = remainingMs > 0
                    ? `Cooldown: ${(remainingMs / 1000).toFixed(1)}s`
                    : "Ready to Roll!";
            };
            updateTimerDisplay(); // Initial display

            AppState.rollCooldownTimer = setInterval(() => {
                remainingMs -= 100;
                if (remainingMs <= 0) {
                    clearInterval(AppState.rollCooldownTimer);
                    AppState.rollCooldownTimer = null;
                    DOMElements.cooldownTimerP.innerText = "";
                    Utils.enableButton(DOMElements.rollButton);
                    AppState.isRolling = false;
                 } else {
                     updateTimerDisplay();
                 }
            }, 100);
        },

        sellItem: (cardId) => {
            if (!AppState.userData || !AppState.userData.inventory) return;
            const cardIndex = AppState.userData.inventory.findIndex(item => item.id === cardId);
            if (cardIndex === -1) {
                console.warn("Attempted to sell card not found:", cardId);
                return;
            }

            const item = AppState.userData.inventory[cardIndex];
            const rarityIndex = RARITIES.findIndex(r => r.name === item.rarity);
            const eternalIndex = RARITIES.findIndex(r => r.name === 'eternal'); // Define high value threshold
            const isValuable = rarityIndex >= 2; // Rare or higher
            const isExtremelyValuable = eternalIndex !== -1 && rarityIndex >= eternalIndex;

            let confirmSell = true; // Assume okay for common/uncommon
            if (isExtremelyValuable) {
                confirmSell = confirm(`ARE YOU ABSOLUTELY SURE?\n\nYou are about to sell ${item.name} (${Utils.capitalize(item.rarity)}), an extremely rare card, for ${item.value} coins.\n\nThis action cannot be undone.`);
            } else if (isValuable) {
                confirmSell = confirm(`Are you sure you want to sell ${item.name} (${Utils.capitalize(item.rarity)}) for ${item.value} coins?`);
            }

            if (!confirmSell) return;

            Utils.playSound(DOMElements.sellSound);

            AppState.userData.currency = (AppState.userData.currency || 0) + item.value;
            AppState.userData.playerScore = (AppState.userData.playerScore || 0) + Math.floor(item.value / SELL_DUPLICATE_SCORE_DIVISOR);
            Deck.removeFromDeck(cardId, true); // Silently remove from deck if present

            AppState.userData.inventory.splice(cardIndex, 1);
            UI.updateAll(); // Update UI and save data
        },

        sellDuplicateCards: (rarityThresholdName = "uncommon") => {
            if (!AppState.userData || !AppState.userData.inventory || AppState.userData.inventory.length === 0) {
                alert("Inventory is empty.");
                return;
            }

            const thresholdIndex = RARITIES.findIndex(r => r.name === rarityThresholdName);
            if (thresholdIndex === -1) {
                console.error("Invalid rarity threshold for selling duplicates:", rarityThresholdName);
                return;
            }

            const cardsToSell = [];
            const cardsToKeep = [];
            const keptCardSignatures = new Set(); // Use name+rarity+grade+quality as signature?
                                               // For now, just name as in original code.
            let totalValue = 0;

            // Filter cards below or at the threshold
            const processableCards = AppState.userData.inventory.filter(card => {
                const cardRarityIndex = RARITIES.findIndex(r => r.name === card.rarity);
                return cardRarityIndex <= thresholdIndex;
            });

            // Keep track of cards above threshold to add back later
            const highRarityCards = AppState.userData.inventory.filter(card => {
                 const cardRarityIndex = RARITIES.findIndex(r => r.name === card.rarity);
                 return cardRarityIndex > thresholdIndex;
             });

            // Sort processable cards to keep the most valuable duplicate (by value first, then maybe ID?)
            processableCards.sort((a, b) => b.value - a.value || b.id.localeCompare(a.id));

            for (const card of processableCards) {
                 // Simple duplicate check based on name for now
                if (!keptCardSignatures.has(card.name)) {
                    cardsToKeep.push(card);
                    keptCardSignatures.add(card.name);
                } else {
                    cardsToSell.push(card);
                }
            }

            if (cardsToSell.length === 0) {
                alert(`No duplicate ${Utils.capitalize(rarityThresholdName)} or Common cards found to sell.`);
                return;
            }

            // Calculate value and update state
            cardsToSell.forEach(card => {
                totalValue += card.value;
                AppState.userData.playerScore = (AppState.userData.playerScore || 0) + Math.floor(card.value / SELL_DUPLICATE_SCORE_DIVISOR);
                Deck.removeFromDeck(card.id, true); // Silently remove sold card from deck
            });

            AppState.userData.currency = (AppState.userData.currency || 0) + totalValue;
            // Reconstruct inventory: kept low-rarity + all high-rarity
            AppState.userData.inventory = [...cardsToKeep, ...highRarityCards];

            Utils.playSound(DOMElements.sellSound);
            alert(`Sold ${cardsToSell.length} duplicate Common/Uncommon card(s) for ${totalValue} coins.`);
            UI.updateAll();
        },

        appraiseCard: (cardId) => {
            if (!AppState.userData || !AppState.userData.inventory) return;

            if ((AppState.userData.currency || 0) < APPRAISAL_COST) {
                alert(`Not enough coins to appraise! Need ${APPRAISAL_COST} coins.`);
                return;
            }
            const cardIndex = AppState.userData.inventory.findIndex(item => item.id === cardId);
            if (cardIndex === -1) return;

            const card = AppState.userData.inventory[cardIndex];

            // --- Start Animation --- (Refactored to UI module)
            UI.startAppraisalAnimation();

            // --- Apply Logic ---
            AppState.userData.currency -= APPRAISAL_COST;
            const oldValue = card.value;
            const oldGrade = card.grade;
            const oldQuality = card.quality;

            card.value = Math.floor(card.value * APPRAISAL_VALUE_MULTIPLIER);

            const messages = [
                `<p>Appraisal cost: ${APPRAISAL_COST} coins.</p>`,
                `<p><strong>${card.name}</strong> value increased from ${oldValue} to ${card.value}.</p>`
            ];
            let gradeUpgraded = false;
            let qualityUpgraded = false;

            const currentGradeIndex = GRADES.indexOf(card.grade);
            if (currentGradeIndex < GRADES.length - 1 && Math.random() < GRADE_UPGRADE_CHANCE) {
                card.grade = GRADES[currentGradeIndex + 1];
                messages.push(`<p style="color:var(--luck-color);">Grade upgraded from ${oldGrade} to ${card.grade}!</p>`);
                gradeUpgraded = true;
            }

            const currentQualityIndex = QUALITIES.indexOf(card.quality);
            if (currentQualityIndex < QUALITIES.length - 1 && Math.random() < QUALITY_UPGRADE_CHANCE) {
                card.quality = QUALITIES[currentQualityIndex + 1];
                messages.push(`<p style="color:var(--luck-color);">Quality improved from ${oldQuality} to ${card.quality}!</p>`);
                qualityUpgraded = true;
            }

            if (!gradeUpgraded && !qualityUpgraded) {
                messages.push("<p>Grade and Quality remained the same.</p>");
            }

            // Update stats based on new grade/quality
            const rarityData = RARITIES.find(r => r.name === card.rarity);
            if (rarityData) {
                 const baseAttack = Utils.getRandomInt(rarityData.stats.min, rarityData.stats.max); // Re-roll base? Or keep original base?
                 const baseDefense = Utils.getRandomInt(rarityData.stats.min, rarityData.stats.max); // Let's re-roll for simplicity, though keeping base might be better game design.
                 const gradeMultiplier = GRADE_MULTIPLIERS[card.grade] || 1.0;
                 const qualityMultiplier = QUALITY_MULTIPLIERS[card.quality] || 1.0;
                 card.attack = Math.max(1, Math.floor(baseAttack * gradeMultiplier * qualityMultiplier));
                 card.defense = Math.max(1, Math.floor(baseDefense * gradeMultiplier * qualityMultiplier));
                 messages.push(`<p>Stats updated to ATK ${card.attack}, DEF ${card.defense}.</p>`);
            }

            // --- End Animation & Show Popup --- (Refactored to UI module)
            UI.endAppraisalAnimation(messages.join(""));

            // Update main UI after animation finishes (triggered by UI.endAppraisalAnimation)
        },

        chooseRarityWeighted: (probabilities) => {
            const total = Object.values(probabilities).reduce((sum, prob) => sum + prob, 0);
            if (total <= 0) return "common"; // Fallback

            const rollRandom = Math.random() * total;
            let cumulative = 0;
            for (const rarity in probabilities) {
                cumulative += probabilities[rarity];
                if (rollRandom <= cumulative) return rarity;
            }
            return "common"; // Should not be reached if probabilities sum > 0
        },

        openCase: (caseTypeName) => {
            if (!AppState.userData) return;
            const caseData = CASE_PROBABILITIES[caseTypeName];
            if (!caseData) {
                console.error("Invalid case type:", caseTypeName);
                return;
            }
            if ((AppState.userData.currency || 0) < caseData.cost) {
                alert(`Not enough coins! Need ${caseData.cost} coins.`);
                return;
            }

            AppState.userData.currency -= caseData.cost;
            Utils.disableButton(DOMElements.caseButtons);

            const itemsToShow = 30;
            const animationItems = [];
            for (let i = 0; i < itemsToShow; i++) {
                const randomRarity = GameLogic.chooseRarityWeighted(caseData.drops);
                // Generate a temporary visual card for the animation reel
                const tempCard = GameLogic.generateCard(randomRarity) || GameLogic.generateCard("common");
                if (tempCard) animationItems.push(tempCard);
            }

            // Determine the actual winning item
            const winningRarity = GameLogic.chooseRarityWeighted(caseData.drops);
            const winningCard = GameLogic.generateCard(winningRarity) || GameLogic.generateCard("common");
            let droppedPotionType = null;
            if (Math.random() < caseData.potionChance) {
                droppedPotionType = POTION_TYPES[Utils.getRandomInt(0, POTION_TYPES.length - 1)];
            }

            // --- UI Animation ---
            UI.startCaseOpeningAnimation(animationItems, winningCard, () => {
                 // --- Logic after animation completes ---
                 AppState.userData.inventory = AppState.userData.inventory || [];
                 AppState.userData.inventory.push(winningCard);
                 let resultMessage = `You opened a <strong style="color:${winningCard.color}">${winningCard.name}</strong> (${Utils.capitalize(winningCard.rarity)}) from the ${Utils.capitalize(caseTypeName)} Case!`;

                 if (droppedPotionType) {
                     AppState.userData.potions = AppState.userData.potions || { luck: 0, speed: 0, battle: 0 };
                     AppState.userData.potions[droppedPotionType] = (AppState.userData.potions[droppedPotionType] || 0) + 1;
                     resultMessage += `<br>You also found a ${Utils.capitalize(droppedPotionType)} Potion!`;
                 }

                 DOMElements.caseResultDiv.innerHTML = `<p>${resultMessage}</p>`;
                 DOMElements.caseResultDiv.classList.add('visible');

                 Utils.enableButton(DOMElements.caseButtons);
                 UI.updateAll(); // Update UI and save data
            });
        }
    };

    // --- Deck Management ---
    const Deck = {
        addToDeck: (cardId) => {
            if (!AppState.userData || !AppState.userData.inventory || !AppState.userData.deck)
             {
                console.error("Cannot add to deck: Missing user data, inventory, or deck.");
                 return;
             }

            if (AppState.userData.deck.length >= DECK_SIZE_LIMIT) {
                alert(`Deck is full! Maximum ${DECK_SIZE_LIMIT} cards allowed.`);
                return;
            }

            const card = AppState.userData.inventory.find(item => item.id === cardId);
            if (!card) {
                console.warn("Attempted to add non-existent card to deck:", cardId);
                return;
            }

            if (AppState.userData.deck.some(c => c.id === cardId)) {
                // Already in deck, do nothing (or provide feedback)
                 // console.log("Card already in deck:", cardId);
                return;
            }

            AppState.userData.deck.push(card);
            UI.updateAll(); // Update UI and save
        },

        removeFromDeck: (cardId, silent = false) => {
            if (!AppState.userData || !AppState.userData.deck) return;

            const initialLength = AppState.userData.deck.length;
            AppState.userData.deck = AppState.userData.deck.filter(c => c.id !== cardId);

            if (AppState.userData.deck.length < initialLength) {
                if (!silent) {
                    UI.updateAll(); // Update UI and save if not silent
                } else {
                    // console.log("Silently removed card from deck:", cardId);
                    // If silent (e.g., from selling), save will happen in the calling function's UI.updateAll()
                }
            }
        },

        calculateDeckPower: () => {
            if (!AppState.userData || !AppState.userData.deck) return 0;
            return AppState.userData.deck.reduce((sum, card) => sum + (card.attack || 0) + (card.defense || 0), 0);
        }
    };

    // --- Upgrades & Potions Logic ---
    const Upgrades = {
        upgradeCooldown: () => {
            if (!AppState.userData) return;
            const level = AppState.userData.cooldownLevel || 0;
            const cost = 50 * (level + 1);
            if ((AppState.userData.currency || 0) >= cost) {
                AppState.userData.currency -= cost;
                AppState.userData.cooldownLevel = level + 1;
                UI.updateAll();
                alert(`Roll cooldown upgraded! Current level: ${AppState.userData.cooldownLevel}`);
            } else {
                alert(`Not enough coins! Need ${cost} coins.`);
            }
        },

        upgradeLuck: () => {
            if (!AppState.userData) return;
            const level = AppState.userData.luckLevel || 0;
            const cost = 100 * (level + 1);
            if ((AppState.userData.currency || 0) >= cost) {
                AppState.userData.currency -= cost;
                AppState.userData.luckLevel = level + 1;
                UI.updateAll();
                alert(`Luck upgraded! Current level: ${AppState.userData.luckLevel}`);
            } else {
                alert(`Not enough coins! Need ${cost} coins.`);
            }
        },

        buyPotion: (type, cost) => {
            if (!AppState.userData) return;
            AppState.userData.potions = AppState.userData.potions || { luck: 0, speed: 0, battle: 0 };
            if ((AppState.userData.currency || 0) >= cost) {
                AppState.userData.currency -= cost;
                AppState.userData.potions[type] = (AppState.userData.potions[type] || 0) + 1;
                UI.updateAll();
            } else {
                alert(`Not enough coins! Need ${cost} coins.`);
            }
        },

        usePotion: (type) => {
            if (!AppState.userData || !AppState.userData.potions) return;
            if ((AppState.userData.potions[type] || 0) <= 0) {
                alert(`No ${Utils.capitalize(type)} Potions available!`);
                return;
            }

            switch (type) {
                case 'luck':
                    if (AppState.luckActive) {
                        alert("Luck boost already active!"); return;
                    }
                    AppState.userData.potions.luck--;
                    Upgrades.activateLuckBoost();
                    alert(`Luck Potion used! (+10% bonus luck for ${BOOST_DURATION_MS / 1000}s)`);
                    break;
                case 'speed':
                    if (AppState.speedBoostActive) {
                        alert("Speed boost already active!"); return;
                    }
                    AppState.userData.potions.speed--;
                    Upgrades.activateSpeedBoost();
                    alert(`Speed Potion used! (30% faster rolls for ${BOOST_DURATION_MS / 1000}s)`);
                    break;
                case 'battle':
                    if (AppState.battleBoostActive) {
                        alert("Battle boost already pending for the next battle!"); return;
                    }
                    AppState.userData.potions.battle--;
                    AppState.battleBoostActive = true;
                    alert("Battle Potion activated! Your cards will be stronger in the next battle.");
                    break;
                default:
                    console.error("Unknown potion type:", type);
                    return;
            }
            UI.updateAll(); // Update UI and save state
        },

        activateLuckBoost: () => {
            AppState.luckActive = true;
            AppState.luckTimeRemaining = BOOST_DURATION_MS;
            UI.updateBoostStatus(); // Initial update

            if (AppState.luckTimerInterval) clearInterval(AppState.luckTimerInterval);
            AppState.luckTimerInterval = setInterval(() => {
                AppState.luckTimeRemaining -= 1000;
                if (AppState.luckTimeRemaining <= 0) {
                    clearInterval(AppState.luckTimerInterval);
                    AppState.luckTimerInterval = null;
                    AppState.luckActive = false;
                    AppState.luckTimeRemaining = 0;
                    alert("Luck boost has ended!");
                    UI.updateAll(); // Full update when boost ends
                } else {
                    UI.updateBoostStatus(); // Minimal update during tick
                }
            }, 1000);
        },

        activateSpeedBoost: () => {
            AppState.speedBoostActive = true;
            AppState.speedTimeRemaining = BOOST_DURATION_MS;
            UI.updateBoostStatus(); // Initial update

            if (AppState.speedTimerInterval) clearInterval(AppState.speedTimerInterval);
            AppState.speedTimerInterval = setInterval(() => {
                AppState.speedTimeRemaining -= 1000;
                if (AppState.speedTimeRemaining <= 0) {
                    clearInterval(AppState.speedTimerInterval);
                    AppState.speedTimerInterval = null;
                    AppState.speedBoostActive = false;
                    AppState.speedTimeRemaining = 0;
                    alert("Speed boost has ended!");
                    UI.updateAll(); // Full update when boost ends
                } else {
                    UI.updateBoostStatus(); // Minimal update during tick
                    // Also update cooldown display as it's affected
                    UI.updateCooldownDisplay();
                }
            }, 1000);
        }
    };

    // --- Battle System Logic ---
    const Battle = {
        start: () => {
            if (!AppState.userData || !AppState.userData.deck || AppState.userData.deck.length === 0) {
                alert("Your deck is empty! Add cards in the Deck tab first."); return;
            }
            if (AppState.userData.deck.length > DECK_SIZE_LIMIT) {
                alert(`Deck has too many cards! Maximum ${DECK_SIZE_LIMIT} allowed.`); return;
            }
            if (AppState.currentBattleState && AppState.currentBattleState.isActive) {
                alert("Battle already in progress!"); return;
            }

            const playerDeckOriginals = AppState.userData.deck;
            const deckSize = playerDeckOriginals.length;
            const enemyDeckOriginals = Battle.generateEnemyDeck(deckSize);

            const applyBattleBoost = AppState.battleBoostActive;
            if (applyBattleBoost) {
                AppState.battleBoostActive = false; // Consume the boost
                console.log("Battle Potion consumed!");
                // UI update for potion status will happen in UI.updateAll() later
            }

            AppState.currentBattleState = {
                isActive: true,
                round: 1,
                playerDeck: playerDeckOriginals.map(card => Battle.createBattleCard(card, applyBattleBoost)),
                enemyDeck: enemyDeckOriginals.map(card => Battle.createBattleCard(card, false)),
                turnLog: [],
                winner: null
            };

            Utils.showElement(DOMElements.battleAreaDiv);
            Utils.hideElement(DOMElements.nextTurnBtn); // Hide initially until log is shown
            DOMElements.turnLogDiv.innerHTML = "";
            DOMElements.battleResultDiv.innerHTML = "";
            DOMElements.battleResultDiv.classList.remove('visible');
            Utils.disableButton(DOMElements.startBattleBtn);

            Battle.logTurn("--- Battle Start! Player vs Enemy ---");
            Battle.logTurn(`Player Deck (${AppState.currentBattleState.playerDeck.length}) | Enemy Deck (${AppState.currentBattleState.enemyDeck.length})`);
            if (applyBattleBoost) Battle.logTurn("** Player's cards are boosted by a Battle Potion! **");
            UI.updateBattleUI(); // Update log display
            Utils.showElement(DOMElements.nextTurnBtn);
            UI.updateAll(); // General UI update (e.g., potion count)
        },

        createBattleCard: (originalCard, isBoosted) => {
            // Deep clone to avoid modifying inventory/deck originals
            const battleCard = JSON.parse(JSON.stringify(originalCard));
            battleCard.maxHp = (battleCard.attack || 1) + (battleCard.defense || 1);
            battleCard.hp = battleCard.maxHp;
            battleCard.isDefeated = false;
            if (isBoosted) {
                battleCard.attack = Math.ceil((battleCard.attack || 1) * 1.2);
                battleCard.defense = Math.ceil((battleCard.defense || 1) * 1.2);
                // Optionally add a visual indicator
                // battleCard.name += " (Boosted)";
            }
            // TODO: Add logic for card abilities if implemented
            return battleCard;
        },

        generateEnemyDeck: (size) => {
            const enemyDeck = [];
            const totalPlayerPower = GameLogic.calculateTotalPower();
            let difficultyTier = 0;
            let statMultiplier = 1.0;

            // Determine difficulty tier based on player power
            if (totalPlayerPower > 5000) { difficultyTier = 4; statMultiplier = 1.25; } // Very High
            else if (totalPlayerPower > 2000) { difficultyTier = 3; statMultiplier = 1.15; } // High
            else if (totalPlayerPower > 500) { difficultyTier = 2; statMultiplier = 1.05; }  // Medium
            else if (totalPlayerPower > 100) { difficultyTier = 1; } // Low
            // else tier 0 (default)

            console.log(`Generating enemy deck. Player Power: ${totalPlayerPower}, Tier: ${difficultyTier}, Multiplier: ${statMultiplier}`);

            let allowedRarities = ["common", "uncommon"];
            if (difficultyTier >= 1) allowedRarities.push("rare");
            if (difficultyTier >= 2) allowedRarities.push("epic");
            if (difficultyTier >= 3) allowedRarities.push("legendary");
            if (difficultyTier >= 4) allowedRarities.push("mythic", "divine");

            const availableRarities = RARITIES.filter(r => allowedRarities.includes(r.name));

            for (let i = 0; i < size; i++) {
                // Select rarity randomly from the allowed pool
                const randomRarityName = availableRarities[Utils.getRandomInt(0, availableRarities.length - 1)].name;
                let enemyCard = GameLogic.generateCard(randomRarityName) || GameLogic.generateCard("common"); // Fallback

                if (enemyCard) {
                    // Apply stat multiplier based on difficulty
                    enemyCard.attack = Math.max(1, Math.ceil((enemyCard.attack || 1) * statMultiplier));
                    enemyCard.defense = Math.max(1, Math.ceil((enemyCard.defense || 1) * statMultiplier));
                    // Make enemy cards distinct?
                    enemyCard.name = `Enemy ${enemyCard.name}`;
                }
                enemyDeck.push(enemyCard);
            }
            return enemyDeck;
        },

        executeNextTurn: () => {
            if (!AppState.currentBattleState || !AppState.currentBattleState.isActive) return;
            if (!AppState.currentBattleState.playerDeck.length || !AppState.currentBattleState.enemyDeck.length) {
                Battle.checkBattleEnd(); // Should already be ended, but check anyway
                return;
            }

            Utils.disableButton(DOMElements.nextTurnBtn);

            const playerCard = AppState.currentBattleState.playerDeck[0];
            const enemyCard = AppState.currentBattleState.enemyDeck[0];

            Battle.logTurn(`--- Round ${AppState.currentBattleState.round} ---`);

            // Player's Turn
            if (playerCard && !playerCard.isDefeated && enemyCard && !enemyCard.isDefeated) {
                const playerDamage = Battle.calculateDamage(playerCard, enemyCard);
                enemyCard.hp -= playerDamage;
                Battle.logTurn(`${playerCard.name} (${playerCard.hp}/${playerCard.maxHp}) attacks ${enemyCard.name} for ${playerDamage}. Enemy HP: ${Math.max(0, enemyCard.hp)}/${enemyCard.maxHp}`);
                if (enemyCard.hp <= 0) {
                    enemyCard.isDefeated = true;
                    Battle.logTurn(`** ${enemyCard.name} defeated! **`);
                    AppState.currentBattleState.enemyDeck.shift(); // Remove defeated enemy card
                }
            }

            // Check if battle ended after player turn
            if (Battle.checkBattleEnd()) return;

            // Enemy's Turn
            const currentEnemyCard = AppState.currentBattleState.enemyDeck[0]; // Could have changed if player defeated prev one
            if (currentEnemyCard && !currentEnemyCard.isDefeated && playerCard && !playerCard.isDefeated) {
                const enemyDamage = Battle.calculateDamage(currentEnemyCard, playerCard);
                playerCard.hp -= enemyDamage;
                Battle.logTurn(`${currentEnemyCard.name} (${currentEnemyCard.hp}/${currentEnemyCard.maxHp}) attacks ${playerCard.name} for ${enemyDamage}. Player HP: ${Math.max(0, playerCard.hp)}/${playerCard.maxHp}`);
                if (playerCard.hp <= 0) {
                    playerCard.isDefeated = true;
                    Battle.logTurn(`** ${playerCard.name} defeated! **`);
                    AppState.currentBattleState.playerDeck.shift(); // Remove defeated player card
                }
            }

            AppState.currentBattleState.round++;
            UI.updateBattleUI();
            // Check end again after enemy turn
             if (!Battle.checkBattleEnd()) {
                 Utils.enableButton(DOMElements.nextTurnBtn);
             }
        },

        calculateDamage: (attacker, defender) => {
            // Basic damage calculation: Attack - (Defense / 3)
            // Ensure attack and defense are at least 1 to avoid weird values
            const damage = Math.max(1, Math.floor((attacker.attack || 1) - ((defender.defense || 1) / 3)));
            // TODO: Add ability modifiers here if implemented
            return damage;
        },

        checkBattleEnd: () => {
            if (!AppState.currentBattleState || !AppState.currentBattleState.isActive) return false;

            const playerWon = AppState.currentBattleState.enemyDeck.length === 0;
            const enemyWon = AppState.currentBattleState.playerDeck.length === 0;

            if (playerWon || enemyWon) {
                AppState.currentBattleState.isActive = false;
                AppState.currentBattleState.winner = playerWon ? "Player" : "Enemy";

                Battle.logTurn(`--- Battle Over! ${AppState.currentBattleState.winner} wins! ---`);

                if (playerWon && AppState.userData) {
                    Utils.playSound(DOMElements.winSound);
                    const rewardCoins = Battle.calculateReward(AppState.currentBattleState.round);
                    AppState.userData.currency = (AppState.userData.currency || 0) + rewardCoins;
                    AppState.userData.playerScore = (AppState.userData.playerScore || 0) + Math.floor(rewardCoins / BATTLE_WIN_SCORE_DIVISOR);
                    Battle.logTurn(`Player receives ${rewardCoins} coins and ${Math.floor(rewardCoins / BATTLE_WIN_SCORE_DIVISOR)} score!`);

                    // Update Daily Challenge Progress
                    DailyChallenge.recordWin();

                } else if (enemyWon) {
                    Utils.playSound(DOMElements.loseSound);
                    Battle.logTurn("Better luck next time!");
                }

                Utils.hideElement(DOMElements.nextTurnBtn);
                Utils.enableButton(DOMElements.startBattleBtn);
                DOMElements.battleResultDiv.innerHTML = `<h2>${AppState.currentBattleState.winner} Wins!</h2>`;
                DOMElements.battleResultDiv.classList.add('visible');
                UI.updateAll(); // Update score, currency, daily challenges, etc. and save
                return true; // Battle ended
            }
            return false; // Battle continues
        },

        calculateReward: (rounds) => {
            // Base reward + bonus per round + random element
            const baseReward = 25;
            const roundBonus = Math.max(0, rounds -1) * 5; // Bonus for rounds beyond the first?
            return baseReward + roundBonus + Utils.getRandomInt(5, 25);
        },

        logTurn: (message) => {
            if (!AppState.currentBattleState) return;
            AppState.currentBattleState.turnLog.push(message);
            UI.updateBattleUI(); // Update the log display immediately
        }
    };

    // --- Daily Challenge Logic ---
    const DailyChallenge = {
        initialize: () => {
             if (!AppState.userData) return;
             const today = new Date().toLocaleDateString();
             // Ensure challenge object exists and check date
             if (!AppState.userData.dailyChallenge || typeof AppState.userData.dailyChallenge !== 'object' || AppState.userData.dailyChallenge.date !== today) {
                 DailyChallenge.generateNew();
             }
         },

        generateNew: () => {
            if (!AppState.userData) return;
            const today = new Date().toLocaleDateString();
            const targetWins = Utils.getRandomInt(3, 5);
            const reward = targetWins * 50 + Utils.getRandomInt(25, 75);
            AppState.userData.dailyChallenge = {
                date: today,
                description: `Win ${targetWins} battles today.`, // More specific description
                wins: 0,
                target: targetWins,
                reward: reward,
                claimed: false
            };
            console.log("Generated new daily challenge:", AppState.userData.dailyChallenge);
            // No save here, will be saved by caller (initializeUserData or button click)
        },

        handleGenerateNewClick: () => {
             if (!AppState.userData) return;
             if (AppState.userData.dailyChallenge && (AppState.userData.dailyChallenge.wins > 0 && !AppState.userData.dailyChallenge.claimed)) {
                if (!confirm("Are you sure you want to generate a new challenge? Your current progress will be lost!")) {
                    return;
                }
             }
             DailyChallenge.generateNew();
             UI.updateAll(); // Update UI and save new challenge state
         },

        recordWin: () => {
             if (!AppState.userData || !AppState.userData.dailyChallenge || AppState.userData.dailyChallenge.claimed) {
                 return; // No active challenge or already claimed
             }
             const today = new Date().toLocaleDateString();
             if(AppState.userData.dailyChallenge.date !== today) {
                 console.log("Challenge is from a previous day, generating new one.")
                 DailyChallenge.generateNew(); // Generate new one if date mismatch
             }

             AppState.userData.dailyChallenge.wins = (AppState.userData.dailyChallenge.wins || 0) + 1;
             Battle.logTurn(`Daily Challenge progress: ${AppState.userData.dailyChallenge.wins}/${AppState.userData.dailyChallenge.target}`);
             // UI update happens in checkBattleEnd -> UI.updateAll()
         },

        claimReward: () => {
            if (!AppState.userData || !AppState.userData.dailyChallenge) return;
            const dc = AppState.userData.dailyChallenge;
            if (!dc.claimed && (dc.wins || 0) >= dc.target) {
                AppState.userData.currency = (AppState.userData.currency || 0) + dc.reward;
                AppState.userData.playerScore = (AppState.userData.playerScore || 0) + Math.floor(dc.reward / DAILY_CHALLENGE_SCORE_DIVISOR);
                dc.claimed = true;
                alert(`Daily challenge completed! +${dc.reward} coins and +${Math.floor(dc.reward / DAILY_CHALLENGE_SCORE_DIVISOR)} score.`);
                UI.updateAll(); // Update UI and save
            } else {
                alert("Challenge not completed or reward already claimed!");
            }
        }
    };

    // --- Bank Logic ---
    const Bank = {
        calculatePassiveIncomeRate: () => {
            // Earn 1 coin per 20 total power (adjust as needed)
            return Math.floor(GameLogic.calculateTotalPower() / 20);
        },

        processOfflineChanges: (currentTime) => {
            if (!AppState.userData) return;

            let somethingChanged = false;
            let passiveIncomeEarned = 0;
            let savingsInterestEarned = 0;
            let loanInterestAdded = 0;
            const userData = AppState.userData; // Local reference

            // 1. Passive Income
            const lastPassiveTs = userData.lastPassiveIncomeTimestamp || currentTime;
            const passiveTimeDiff = currentTime - lastPassiveTs;
            const passiveIntervals = Math.floor(passiveTimeDiff / PASSIVE_INCOME_INTERVAL_MS);
            if (passiveIntervals > 0) {
                const incomePerInterval = Bank.calculatePassiveIncomeRate();
                passiveIncomeEarned = passiveIntervals * incomePerInterval;
                userData.currency = (userData.currency || 0) + passiveIncomeEarned;
                userData.lastPassiveIncomeTimestamp = lastPassiveTs + passiveIntervals * PASSIVE_INCOME_INTERVAL_MS;
                somethingChanged = true;
                console.log(`Applied passive income for ${passiveIntervals} intervals: +${passiveIncomeEarned} coins.`);
            }

            // 2. Savings Interest
            if (userData.bankSavings > 0 && userData.lastSavingsTimestamp > 0) {
                const lastSavingsTs = userData.lastSavingsTimestamp;
                const savingsTimeDiff = currentTime - lastSavingsTs;
                const savingsIntervals = Math.floor(savingsTimeDiff / SAVINGS_INTEREST_INTERVAL_MS);
                if (savingsIntervals > 0) {
                    let currentSavings = userData.bankSavings;
                    for (let i = 0; i < savingsIntervals; i++) {
                        const interest = Math.floor(currentSavings * SAVINGS_INTEREST_RATE);
                        currentSavings += interest;
                        savingsInterestEarned += interest;
                    }
                    userData.bankSavings = currentSavings; // Update with compounded interest
                    userData.lastSavingsTimestamp = lastSavingsTs + savingsIntervals * SAVINGS_INTEREST_INTERVAL_MS;
                    somethingChanged = true;
                    console.log(`Applied savings interest for ${savingsIntervals} intervals: +${savingsInterestEarned} coins.`);
                }
            }

            // 3. Loan Interest
            if (userData.loanAmount > 0 && userData.lastLoanInterestTimestamp > 0) {
                const lastLoanTs = userData.lastLoanInterestTimestamp;
                const loanTimeDiff = currentTime - lastLoanTs;
                const loanIntervals = Math.floor(loanTimeDiff / LOAN_INTEREST_INTERVAL_MS);
                if (loanIntervals > 0) {
                    let currentLoan = userData.loanAmount;
                    for (let i = 0; i < loanIntervals; i++) {
                        const interest = Math.ceil(currentLoan * LOAN_INTEREST_RATE); // Use ceil for loan interest
                        currentLoan += interest;
                        loanInterestAdded += interest;
                    }
                    userData.loanAmount = currentLoan; // Update with compounded interest
                    userData.lastLoanInterestTimestamp = lastLoanTs + loanIntervals * LOAN_INTEREST_INTERVAL_MS;
                    somethingChanged = true;
                    console.log(`Applied loan interest for ${loanIntervals} intervals: +${loanInterestAdded} to loan amount.`);
                }
            }

             // Return true if changes were made, so UI update can be triggered if needed
             return somethingChanged;
        },

        deposit: () => {
            if (!AppState.userData) return;
            const amount = parseInt(DOMElements.depositAmountInput.value);

            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid positive amount to deposit.");
                return;
            }
            if ((AppState.userData.currency || 0) < amount) {
                alert("Not enough coins to deposit.");
                return;
            }

            const wasSavingsZero = (AppState.userData.bankSavings || 0) === 0;
            AppState.userData.currency -= amount;
            AppState.userData.bankSavings = (AppState.userData.bankSavings || 0) + amount;

            // Start the interest timer only when the first deposit is made
            if (wasSavingsZero && AppState.userData.bankSavings > 0) {
                AppState.userData.lastSavingsTimestamp = Date.now();
            }

            DOMElements.depositAmountInput.value = ''; // Clear input
            console.log(`Deposited ${amount} coins. New savings: ${AppState.userData.bankSavings}`);
            UI.updateAll(); // Update display and save
        },

        withdraw: () => {
            if (!AppState.userData || (AppState.userData.bankSavings || 0) <= 0) {
                alert("No savings to withdraw.");
                return;
            }

            // Process any final interest before withdrawing
            Bank.processOfflineChanges(Date.now());

            const amountWithdrawn = AppState.userData.bankSavings;
            AppState.userData.currency = (AppState.userData.currency || 0) + amountWithdrawn;
            AppState.userData.bankSavings = 0;
            AppState.userData.lastSavingsTimestamp = 0; // Reset timestamp as savings are gone

            console.log(`Withdrew ${amountWithdrawn} coins. Savings reset.`);
            alert(`Withdrew ${amountWithdrawn} coins (including any accrued interest).`);
            UI.updateAll(); // Update display and save
        },

        takeLoan: () => {
            if (!AppState.userData) return;
            const amount = parseInt(DOMElements.loanRequestAmountInput.value);

            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid positive amount to borrow.");
                return;
            }
            if (amount > MAX_LOAN_AMOUNT) {
                alert(`Loan amount cannot exceed ${MAX_LOAN_AMOUNT} coins.`);
                return;
            }
            if ((AppState.userData.loanAmount || 0) > 0) {
                alert("You already have an outstanding loan. Repay it first.");
                return;
            }

            AppState.userData.currency = (AppState.userData.currency || 0) + amount;
            AppState.userData.loanAmount = amount;
            AppState.userData.lastLoanInterestTimestamp = Date.now(); // Start interest timer

            DOMElements.loanRequestAmountInput.value = ''; // Clear input
            console.log(`Took out a loan of ${amount} coins.`);
            alert(`Loan of ${amount} coins taken. Interest will be added daily.`);
            UI.updateAll(); // Update display and save
        },

        repayLoan: () => {
            if (!AppState.userData) return;
            const amount = parseInt(DOMElements.repayLoanAmountInput.value);

            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid positive amount to repay.");
                return;
            }
            if ((AppState.userData.currency || 0) < amount) {
                alert("Not enough coins to make this repayment.");
                return;
            }
            if ((AppState.userData.loanAmount || 0) <= 0) {
                alert("You do not have an outstanding loan.");
                return;
            }

            // Process any final interest before repaying
            Bank.processOfflineChanges(Date.now());

            const repayment = Math.min(amount, AppState.userData.loanAmount); // Cannot repay more than the loan
            AppState.userData.currency -= repayment;
            AppState.userData.loanAmount -= repayment;

            console.log(`Repaid ${repayment} coins towards loan. Remaining: ${AppState.userData.loanAmount}`);
            alert(`Repaid ${repayment} coins.`);

            if (AppState.userData.loanAmount <= 0) {
                AppState.userData.loanAmount = 0; // Ensure it's exactly zero
                AppState.userData.lastLoanInterestTimestamp = 0; // Stop interest timer
                console.log("Loan fully repaid.");
                alert("Loan fully repaid!");
            }

            DOMElements.repayLoanAmountInput.value = ''; // Clear input
            UI.updateAll(); // Update display and save
        }
    };

    // --- UI Rendering and Management ---
    const UI = {
        // --- Core Update Function ---
        updateAll: () => {
            if (!AppState.currentUser || !AppState.userData) {
                // console.warn("updateAll called without logged-in user.");
                return; // Don't update if not logged in
            }
            UI.updateHeader();
            UI.updateUpgradesTab();
            UI.updatePotions();
            UI.updateBoostStatus();
            UI.updateInventoryList(); // Updates based on current filter
            UI.updateDeckLists();     // Updates deck and available cards based on filter
            UI.updateAppraisalList();
            UI.updateLeaderboard();
            UI.updateDailyChallengeDisplay();
            UI.updateBankDisplay();
            Storage.saveUserData(); // Save state after updates
        },

        // --- Individual UI Update Functions ---
        updateHeader: () => {
            DOMElements.userGreeting.innerText = `Welcome, ${AppState.currentUser}`;
            DOMElements.totalPowerDisplaySpan.innerText = GameLogic.calculateTotalPower();
            DOMElements.currencyDisplaySpan.innerText = AppState.userData.currency || 0;
        },

        updateUpgradesTab: () => {
            const cdLevel = AppState.userData.cooldownLevel || 0;
            const luckLevel = AppState.userData.luckLevel || 0;
            DOMElements.cooldownLevelP.innerText = `Cooldown Upgrade Level: ${cdLevel}`;
            DOMElements.luckLevelP.innerText = `Luck Level: ${luckLevel}`;
            DOMElements.cooldownCostSpan.innerText = 50 * (cdLevel + 1);
            DOMElements.luckCostSpan.innerText = 100 * (luckLevel + 1);
            UI.updateCooldownDisplay();
            UI.updateLuckBonusDisplay();
        },

        updateCooldownDisplay: () => {
            const currentCooldownMs = GameLogic.calculateCurrentCooldown();
            DOMElements.currentCooldownP.innerText = `Current Roll Cooldown: ${(currentCooldownMs / 1000).toFixed(1)}s`;
        },

        updateLuckBonusDisplay: () => {
            const luckPercent = GameLogic.calculateLuckBonusPercentage();
            const luckDisplayText = `Current Luck Bonus: +${luckPercent}%`;
            DOMElements.rollLuckDisplayP.innerText = luckDisplayText;
            DOMElements.upgradeLuckDisplayP.innerText = luckDisplayText;
        },

        updatePotions: () => {
            const potions = AppState.userData.potions || { luck: 0, speed: 0, battle: 0 };
            DOMElements.luckPotionCountSpan.innerText = potions.luck;
            DOMElements.speedPotionCountSpan.innerText = potions.speed;
            DOMElements.battlePotionCountSpan.innerText = potions.battle;
            Utils.enableButton(DOMElements.useLuckPotionBtn, potions.luck > 0 && !AppState.luckActive);
            Utils.enableButton(DOMElements.useSpeedPotionBtn, potions.speed > 0 && !AppState.speedBoostActive);
            Utils.enableButton(DOMElements.useBattlePotionBtn, potions.battle > 0 && !AppState.battleBoostActive);
        },

        updateBoostStatus: () => {
            let boostText = "";
            if (AppState.luckActive) {
                boostText += `Luck Boost Active: ${Math.ceil(AppState.luckTimeRemaining / 1000)}s left. `;
            }
            if (AppState.speedBoostActive) {
                boostText += `Speed Boost Active: ${Math.ceil(AppState.speedTimeRemaining / 1000)}s left. `;
            }
            DOMElements.boostStatusP.innerText = boostText;
            DOMElements.potionStatusDiv.innerText = AppState.battleBoostActive ? "Battle Boost Pending for next battle!" : "";
            // Also update luck/cooldown displays as they depend on boost status
            UI.updateLuckBonusDisplay();
            UI.updateCooldownDisplay();
        },

        // --- List Rendering Functions ---
        renderList: (listElement, items, renderItemFunc, emptyMessage) => {
            listElement.innerHTML = ""; // Clear previous items
            if (!items || items.length === 0) {
                listElement.innerHTML = `<li>${emptyMessage}</li>`;
                return;
            }
            items.forEach(item => {
                const li = renderItemFunc(item);
                if (li) listElement.appendChild(li);
            });
        },

        createCardListItem: (card, actions = []) => {
            const li = document.createElement('li');
            li.dataset.cardId = card.id;
            li.innerHTML = `
                <strong style="color:${card.color || '#FFF'};">${card.name}</strong> (${Utils.capitalize(card.rarity)}) - Value: ${card.value}<br>
                Grade: ${card.grade}, Quality: ${card.quality}<br>
                Stats: ATK ${card.attack} / DEF ${card.defense}<br>
                <em>Ability: ${card.ability?.description || 'None'}</em>
                <div class="card-actions"></div>
            `;
            const actionsContainer = li.querySelector('.card-actions');
            actions.forEach(action => {
                 const button = document.createElement('button');
                 button.innerText = action.text;
                 button.onclick = () => action.handler(card.id);
                 button.disabled = action.disabled || false;
                 button.classList.add(action.class || 'btn-secondary'); // Add default class
                 actionsContainer.appendChild(button);
            });
            return li;
        },

        updateInventoryList: () => {
             const selectedRarity = DOMElements.rarityFilterSelect.value;
             const inventory = AppState.userData.inventory || [];
             const filteredItems = selectedRarity
                 ? inventory.filter(card => card.rarity === selectedRarity)
                 : inventory;

             DOMElements.inventoryCountSpan.innerText = inventory.length;

             UI.renderList(
                 DOMElements.inventoryListUl,
                 filteredItems,
                 (card) => UI.createCardListItem(card, [
                     { text: 'Sell', handler: GameLogic.sellItem, class: 'btn-secondary' }
                 ]),
                 selectedRarity ? "No cards match the filter." : "Inventory is empty."
             );
         },

        updateDeckLists: () => {
            const deck = AppState.userData.deck || [];
            const inventory = AppState.userData.inventory || [];
            const selectedDeckRarity = DOMElements.deckRarityFilterSelect.value;
            const deckCardIds = new Set(deck.map(card => card.id));
            const deckIsFull = deck.length >= DECK_SIZE_LIMIT;

            // Update Current Deck List
            UI.renderList(
                DOMElements.deckListUl,
                deck,
                (card) => UI.createCardListItem(card, [
                    { text: 'Remove', handler: Deck.removeFromDeck, class: 'btn-secondary' }
                ]),
                "Deck is empty."
            );

            // Update Available Cards List (Inventory - Deck Cards)
            let availableItems = inventory.filter(card => !deckCardIds.has(card.id));
            if (selectedDeckRarity) {
                availableItems = availableItems.filter(card => card.rarity === selectedDeckRarity);
            }

            UI.renderList(
                DOMElements.deckInventoryListUl,
                availableItems,
                (card) => UI.createCardListItem(card, [
                    { text: 'Add to Deck', handler: Deck.addToDeck, disabled: deckIsFull, class: 'btn-primary' }
                ]),
                 selectedDeckRarity ? "No available cards match filter." : "No available cards to add."
            );

             // Update Deck Header Info
            DOMElements.deckCountSpan.innerText = deck.length;
            DOMElements.deckPowerSpan.innerText = Deck.calculateDeckPower();
        },

        updateAppraisalList: () => {
            const inventory = AppState.userData.inventory || [];
            const canAfford = (AppState.userData.currency || 0) >= APPRAISAL_COST;

            UI.renderList(
                DOMElements.appraisalListUl,
                inventory,
                (card) => UI.createCardListItem(card, [
                    { text: `Appraise (${APPRAISAL_COST} Coins)`, handler: GameLogic.appraiseCard, disabled: !canAfford, class: 'btn-primary' }
                ]),
                "No cards available to appraise."
            );
        },

        updateLeaderboard: () => {
             const leaderboardData = [];
             for (const username in AppState.allUserData) {
                 leaderboardData.push({
                     name: username,
                     score: AppState.allUserData[username].playerScore || 0
                 });
             }

             // Add current player if not already in (e.g., during signup)
              if (AppState.currentUser && !leaderboardData.some(e => e.name === AppState.currentUser)) {
                 leaderboardData.push({ name: AppState.currentUser, score: AppState.userData.playerScore || 0 });
             }

             // Add bots if empty
             if (leaderboardData.length === 0) {
                  leaderboardData.push({ name: "Bot Alice", score: 1000});
                  leaderboardData.push({ name: "Bot Bob", score: 750});
                  leaderboardData.push({ name: "Bot Charlie", score: 500});
             }

             leaderboardData.sort((a, b) => b.score - a.score);

             UI.renderList(
                 DOMElements.leaderboardListUl,
                 leaderboardData.slice(0, LEADERBOARD_SIZE),
                 (entry) => {
                     const li = document.createElement("li");
                     li.textContent = `${entry.name} - Score: ${entry.score}`;
                     if (entry.name === AppState.currentUser) {
                         li.classList.add('current-user');
                     }
                     return li;
                 },
                 "Leaderboard is empty."
             );

             DOMElements.playerScoreDisplayP.innerText = `Your Score: ${AppState.userData.playerScore || 0}`;
         },

        updateDailyChallengeDisplay: () => {
            const dc = AppState.userData.dailyChallenge;

            if (!dc || typeof dc !== 'object') {
                DOMElements.dailyChallengeInfoDiv.innerHTML = "<p>No daily challenge available. Generate one!</p>";
                Utils.hideElement(DOMElements.claimDailyChallengeBtn);
                return;
            }

            DOMElements.dailyChallengeInfoDiv.innerHTML = `
                <p>${dc.description || 'Win battles.'}</p>
                <p>Progress: ${dc.wins || 0} / ${dc.target || 3} wins</p>
                <p>Reward: ${dc.reward || 50} Coins</p>
                ${dc.claimed ? '<p style="color:var(--success-color);">Reward claimed for today!</p>' : ''}
            `;

            const canClaim = (dc.wins || 0) >= dc.target && !dc.claimed;
            if (canClaim) {
                 Utils.showElement(DOMElements.claimDailyChallengeBtn);
                 Utils.enableButton(DOMElements.claimDailyChallengeBtn);
             } else {
                 Utils.hideElement(DOMElements.claimDailyChallengeBtn);
             }
        },

        updateBankDisplay: () => {
             const userData = AppState.userData;
             const now = Date.now();

             // Passive Income
             const incomeRate = Bank.calculatePassiveIncomeRate();
             DOMElements.passiveIncomeRateP.innerText = `Rate: ${incomeRate} Coins / 5 hours`;
             const timeSinceLastPassive = now - (userData.lastPassiveIncomeTimestamp || now);
             const timeToNextPassive = Math.max(0, PASSIVE_INCOME_INTERVAL_MS - timeSinceLastPassive);
             DOMElements.nextPassiveIncomeTimeP.innerText = `Next Payout: ${Utils.formatTimeRemaining(timeToNextPassive)}`;

             // Savings
             const savings = userData.bankSavings || 0;
             DOMElements.savingsBalanceP.innerText = `Balance: ${savings} Coins`;
             let timeToNextSavingsInterest = Infinity;
             if (savings > 0 && userData.lastSavingsTimestamp > 0) {
                 const timeSinceLastSavings = now - userData.lastSavingsTimestamp;
                 timeToNextSavingsInterest = Math.max(0, SAVINGS_INTEREST_INTERVAL_MS - timeSinceLastSavings);
             } else if (savings > 0) {
                 timeToNextSavingsInterest = SAVINGS_INTEREST_INTERVAL_MS;
             }
             DOMElements.nextSavingsInterestTimeP.innerText = savings > 0
                 ? `Next Interest (${(SAVINGS_INTEREST_RATE * 100).toFixed(1)}%): ${Utils.formatTimeRemaining(timeToNextSavingsInterest)}`
                 : 'Deposit to start earning interest.';

             // Loan
             const loan = userData.loanAmount || 0;
             DOMElements.loanAmountDisplayP.innerText = `Current Loan: ${loan} Coins`;
             let timeToNextLoanInterest = Infinity;
             if (loan > 0 && userData.lastLoanInterestTimestamp > 0) {
                 const timeSinceLastLoan = now - userData.lastLoanInterestTimestamp;
                 timeToNextLoanInterest = Math.max(0, LOAN_INTEREST_INTERVAL_MS - timeSinceLastLoan);
             } else if (loan > 0) {
                 timeToNextLoanInterest = LOAN_INTEREST_INTERVAL_MS;
             }
             DOMElements.nextLoanInterestTimeP.innerText = loan > 0
                 ? `Next Interest Added (${(LOAN_INTEREST_RATE * 100).toFixed(1)}%): ${Utils.formatTimeRemaining(timeToNextLoanInterest)}`
                 : 'No loan taken.';

             // Enable/Disable Buttons
             Utils.enableButton(DOMElements.depositBtn, (userData.currency || 0) > 0);
             Utils.enableButton(DOMElements.withdrawBtn, savings > 0);
             Utils.enableButton(DOMElements.takeLoanBtn, loan <= 0); // Can only take if no loan
             Utils.enableButton(DOMElements.repayLoanBtn, loan > 0 && (userData.currency || 0) > 0);
         },

        updateBattleUI: () => {
            if (!AppState.currentBattleState) return;
            // Update battle log
            DOMElements.turnLogDiv.innerHTML = AppState.currentBattleState.turnLog.join('\n');
            DOMElements.turnLogDiv.scrollTop = DOMElements.turnLogDiv.scrollHeight; // Auto-scroll
            // TODO: Optionally display current player/enemy cards visually
        },

        displayRollResult: (item) => {
            if (!item) {
                DOMElements.rollResultDiv.innerHTML = ''; // Clear if no item
                 DOMElements.rollResultDiv.classList.remove('visible');
                return;
            }
            DOMElements.rollResultDiv.innerHTML = `
                <div class="card" id="itemCard-${item.id}">
                    <div class="card-inner">
                        <div class="card-front">
                            <strong style="color:${item.color}; font-size: 1.2em;">${item.name}</strong><br>
                            (${Utils.capitalize(item.rarity)})<br>
                            <hr>
                            Grade: ${item.grade}, Quality: ${item.quality}<br>
                            Stats: ATK ${item.attack} / DEF ${item.defense}<br>
                            Value: ${item.value} Coins
                        </div>
                        <div class="card-back">
                            <strong>Ability:</strong><br>
                            ${item.ability?.description || 'None'}
                        </div>
                    </div>
                </div>
            `;
            DOMElements.rollResultDiv.classList.add('visible');
            Utils.showElement(DOMElements.flipCardBtn);
            // Remove previous listener if exists, then add new one
            const newFlipBtn = DOMElements.flipCardBtn.cloneNode(true);
            DOMElements.flipCardBtn.parentNode.replaceChild(newFlipBtn, DOMElements.flipCardBtn);
             DOMElements.flipCardBtn = newFlipBtn; // Update cache
            DOMElements.flipCardBtn.onclick = () => {
                const cardElement = document.getElementById(`itemCard-${item.id}`);
                cardElement?.classList.toggle("flipped");
            };
        },

        // --- UI Mode Toggle ---
        toggleUIMode: () => {
            AppState.isComputerUI = !AppState.isComputerUI;
            DOMElements.body.classList.toggle('computer-ui', AppState.isComputerUI);
            DOMElements.toggleUIButton.innerText = AppState.isComputerUI ? "Switch to Mobile UI" : "Switch to Computer UI";
        },

        // --- Tab Management ---
        showTab: (tabName) => {
            if (!tabName) return;
            AppState.activeTab = tabName;

            // Hide all content, deactivate all buttons
            DOMElements.tabContents.forEach(tab => Utils.setInactive(tab));
            DOMElements.tabButtons.forEach(btn => Utils.setInactive(btn));

            // Activate selected content and button
            const contentToShow = document.getElementById(tabName + "Content");
            const buttonToActivate = DOMElements.tabNav.querySelector(`[data-tab="${tabName}"]`);

            if (contentToShow) Utils.setActive(contentToShow);
            if (buttonToActivate) Utils.setActive(buttonToActivate);

            // Show/hide filters based on tab
            Utils.hideElement(DOMElements.inventoryFilters);
            Utils.hideElement(DOMElements.deckFilters);
            if (tabName === 'inventory') {
                Utils.showElement(DOMElements.inventoryFilters);
                UI.updateInventoryList(); // Ensure list is updated when tab shown
            } else if (tabName === 'deck') {
                 Utils.showElement(DOMElements.deckFilters);
                 UI.updateDeckLists(); // Ensure lists are updated
            } else if (tabName === 'bank') {
                if (Bank.processOfflineChanges(Date.now())) {
                    UI.updateBankDisplay(); // Update if offline changes occurred
                }
            } else if (tabName === 'appraisal') {
                UI.updateAppraisalList();
            }
        },

        // --- Animation & Popup Handling ---
        startAppraisalAnimation: () => {
             DOMElements.appraisalPopup.classList.remove('active');
             DOMElements.appraisalPopupMessage.innerHTML = '';
             DOMElements.appraisalCircle.style.transition = 'none';
             DOMElements.appraisalCircle.style.transform = 'scale(0)';
             // Force reflow
             DOMElements.appraisalCircle.offsetHeight;

             DOMElements.appraisalOverlay.classList.add('active');
             DOMElements.appraisalCircle.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
             requestAnimationFrame(() => {
                 DOMElements.appraisalCircle.style.transform = 'scale(200)'; // Adjust scale as needed
             });
         },

        endAppraisalAnimation: (popupMessages) => {
             // Wait for circle expansion, then show popup and hide overlay
             setTimeout(() => {
                 DOMElements.appraisalOverlay.classList.remove('active');
                 // Reset circle after transition ends
                 setTimeout(() => {
                     DOMElements.appraisalCircle.style.transition = 'none';
                     DOMElements.appraisalCircle.style.transform = 'scale(0)';
                 }, 300);

                 DOMElements.appraisalPopupMessage.innerHTML = popupMessages;
                 DOMElements.appraisalPopup.classList.add('active');

                 // Update the main UI now that appraisal logic is complete
                 UI.updateAll();
             }, 1600); // Match animation duration + buffer
         },

        closeAppraisalPopup: () => {
            DOMElements.appraisalPopup.classList.remove('active');
        },

        startCaseOpeningAnimation: (animationItems, winningCard, callback) => {
            DOMElements.caseAnimationDiv.innerHTML = ''; // Clear previous items
            DOMElements.caseResultDiv.innerHTML = ''; // Clear previous result
             DOMElements.caseResultDiv.classList.remove('visible');

            // Populate animation reel
            animationItems.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('item');
                itemDiv.innerHTML = `<span style="color:${item.color}">${item.name}</span><br>(${Utils.capitalize(item.rarity)})`;
                DOMElements.caseAnimationDiv.appendChild(itemDiv);
            });

            // Ensure the winning item is placed correctly in the reel (e.g., near the end)
            const targetItemIndex = Math.max(0, animationItems.length - 5); // Place it a few items from the end
            const targetDiv = DOMElements.caseAnimationDiv.children[targetItemIndex];
            if (targetDiv && winningCard) {
                targetDiv.innerHTML = `<span style="color:${winningCard.color}">${winningCard.name}</span><br>(${Utils.capitalize(winningCard.rarity)})`;
                 targetDiv.dataset.isWinner = "true"; // Mark the winner for potential styling
            }

            const itemWidth = 120; // Includes margin (100 width + 10*2 margin)
            const containerWidth = DOMElements.caseAnimationDiv.parentElement.offsetWidth;
            const finalPosition = -(targetItemIndex * itemWidth) + (containerWidth / 2) - (itemWidth / 2);

            // Reset position before animation
            DOMElements.caseAnimationDiv.style.transition = 'none';
            DOMElements.caseAnimationDiv.style.transform = 'translateX(0px)';

            // Force reflow before starting transition
            DOMElements.caseAnimationDiv.offsetHeight;

            // Start the animation
            DOMElements.caseAnimationDiv.style.transition = 'transform 3.5s cubic-bezier(0.25, 0.1, 0.2, 1)'; // Slower, smoother
            DOMElements.caseAnimationDiv.style.transform = `translateX(${finalPosition}px)`;

            // After animation finishes
            setTimeout(() => {
                 // Highlight winner briefly (optional)
                 const winnerDiv = DOMElements.caseAnimationDiv.querySelector('[data-is-winner="true"]');
                 if (winnerDiv) {
                     winnerDiv.style.border = "2px solid gold";
                     winnerDiv.style.boxShadow = "0 0 15px gold";
                 }

                if (callback) callback();

                 // Clean up animation styles after a delay
                  setTimeout(() => {
                    if (winnerDiv) {
                         winnerDiv.style.border = "";
                         winnerDiv.style.boxShadow = "";
                     }
                     // Reset transform for next opening, maybe clear items?
                     // DOMElements.caseAnimationDiv.style.transition = 'none';
                     // DOMElements.caseAnimationDiv.style.transform = 'translateX(0px)';
                 }, 1500);

            }, 3600); // Corresponds to transition duration + buffer
        },

        // --- Initial Population ---
        populateStaticData: () => {
            // Populate Rarity Filters and Odds List
            const rarityFilterFragment = document.createDocumentFragment();
            const deckFilterFragment = document.createDocumentFragment();
            const oddsListFragment = document.createDocumentFragment();

            RARITIES.forEach(r => {
                const option = document.createElement('option');
                option.value = r.name;
                option.textContent = Utils.capitalize(r.name);

                rarityFilterFragment.appendChild(option.cloneNode(true));
                deckFilterFragment.appendChild(option.cloneNode(true));

                const li = document.createElement('li');
                li.innerHTML = `<span style="color:${r.color};">${Utils.capitalize(r.name)}</span> (${r.prob}%)`;
                oddsListFragment.appendChild(li);
            });

            DOMElements.rarityFilterSelect.appendChild(rarityFilterFragment);
            DOMElements.deckRarityFilterSelect.appendChild(deckFilterFragment);
            DOMElements.rarityRolledListUl.appendChild(oddsListFragment);
        }
    };

    // --- Event Listeners Setup ---
    const SetupEventListeners = () => {
        DOMElements.toggleUIButton.addEventListener('click', UI.toggleUIMode);
        DOMElements.loginForm.addEventListener('submit', Auth.handleLoginSignup);
        DOMElements.logoutBtn.addEventListener('click', Auth.logout);
        DOMElements.deleteDataBtn.addEventListener('click', Auth.deleteUserData);

        // Tab Navigation
        DOMElements.tabNav.addEventListener('click', (e) => {
            if (e.target.classList.contains('tabButton')) {
                const tabName = e.target.dataset.tab;
                UI.showTab(tabName);
            }
        });

        // Roll Tab
        DOMElements.rollButton.addEventListener('click', GameLogic.rollForCard);
        // Flip button listener is added dynamically in displayRollResult

        // Inventory/Deck Filters
        DOMElements.rarityFilterSelect.addEventListener('change', UI.updateInventoryList);
        DOMElements.deckRarityFilterSelect.addEventListener('change', UI.updateDeckLists);

        // Inventory Tab
        DOMElements.sellDuplicatesBtn.addEventListener('click', () => GameLogic.sellDuplicateCards('uncommon'));
        // Specific item actions (sell) are attached dynamically in createCardListItem

        // Deck Tab
        // Add/Remove actions are attached dynamically in createCardListItem

        // Appraisal Tab
        // Appraise action is attached dynamically in createCardListItem
        DOMElements.closeAppraisalPopupBtn.addEventListener('click', UI.closeAppraisalPopup);

        // Upgrades/Potions Tab
        DOMElements.upgradeCooldownBtn.addEventListener('click', Upgrades.upgradeCooldown);
        DOMElements.upgradeLuckBtn.addEventListener('click', Upgrades.upgradeLuck);
        DOMElements.buyLuckPotionBtn.addEventListener('click', () => Upgrades.buyPotion('luck', 100));
        DOMElements.useLuckPotionBtn.addEventListener('click', () => Upgrades.usePotion('luck'));
        DOMElements.buySpeedPotionBtn.addEventListener('click', () => Upgrades.buyPotion('speed', 120));
        DOMElements.useSpeedPotionBtn.addEventListener('click', () => Upgrades.usePotion('speed'));
        DOMElements.buyBattlePotionBtn.addEventListener('click', () => Upgrades.buyPotion('battle', 150));
        DOMElements.useBattlePotionBtn.addEventListener('click', () => Upgrades.usePotion('battle'));

        // Cases Tab
        DOMElements.caseButtons.forEach(button => {
            const caseType = button.id.replace('open', '').replace('CaseBtn', '').toLowerCase();
             if (caseType && CASE_PROBABILITIES[caseType]) {
                 button.addEventListener('click', () => GameLogic.openCase(caseType));
             }
        });

        // Battle Tab
        DOMElements.startBattleBtn.addEventListener('click', Battle.start);
        DOMElements.nextTurnBtn.addEventListener('click', Battle.executeNextTurn);

        // Daily Challenges Tab
        DOMElements.claimDailyChallengeBtn.addEventListener('click', DailyChallenge.claimReward);
        DOMElements.generateNewChallengeBtn.addEventListener('click', DailyChallenge.handleGenerateNewClick);

        // Bank Tab
        DOMElements.depositBtn.addEventListener('click', Bank.deposit);
        DOMElements.withdrawBtn.addEventListener('click', Bank.withdraw);
        DOMElements.takeLoanBtn.addEventListener('click', Bank.takeLoan);
        DOMElements.repayLoanBtn.addEventListener('click', Bank.repayLoan);

        // Add debounced save on window unload/hide for safety
        window.addEventListener('beforeunload', Storage.saveUserData);
        // Potentially add visibility change listener too
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                Storage.saveUserData();
            }
        });

         // Make certain functions globally accessible if needed for inline HTML handlers (like card actions)
         // This is generally discouraged, prefer adding listeners in JS
         // If keeping inline handlers is necessary for list items:
         window.sellItem = GameLogic.sellItem;
         window.addToDeck = Deck.addToDeck;
         window.removeFromDeck = Deck.removeFromDeck;
         window.appraiseCard = GameLogic.appraiseCard;
    };

    // --- Initialization ---
    const InitializeApp = () => {
        console.log("Initializing Rarity Roll Game...");
        AppState.allUserData = Storage.loadAllUserData();
        AppState.globalCardIdCounter = Storage.loadGlobalCounter();
        UI.populateStaticData();
        SetupEventListeners();
        // Check if a user was previously logged in (e.g., simple flag or checking currentUser)
        // For now, just show login screen by default
        Utils.setActive(DOMElements.loginScreen);
        Utils.setInactive(DOMElements.gameScreen);
        console.log("Initialization complete.");
    };

    // Start the application
    InitializeApp();
}); 