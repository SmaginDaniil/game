const readline = require("readline");
const crypto = require("crypto");

class Dice {
  constructor(values) {
    this.values = values;
  }

  roll() {
    const index = crypto.randomInt(0, this.values.length);
    return this.values[index];
  }
}

class DiceParser {
  static parse(args) {
    if (args.length < 3) {
      throw new Error("This is a mistake: it is necessary to discard at least three dice.");
    }

    return args.map((arg) => {
      const values = arg.split(",").map(Number);
      if (values.some(isNaN) || values.length < 1) {
        throw new Error(
          `Error: incorrect cube format '${arg}'. The cube must contain numbers separated by commas.`
        );
      }
      return new Dice(values);
    });
  }
}

class HMACGenerator {
  static generateHMAC(secret, message) {
    return crypto
      .createHmac("sha256", secret)
      .update(message.toString())
      .digest("hex");
  }

  static generateKey() {
    return crypto.randomBytes(32).toString("hex");
  }
}

class ProbabilityCalculator {
  static calculateProbabilities(dices) {
    const probabilities = Array(dices.length)
      .fill(null)
      .map(() => Array(dices.length).fill(0));

    for (let i = 0; i < dices.length; i++) {
      for (let j = 0; j < dices.length; j++) {
        if (i === j) continue;

        const dice1 = dices[i];
        const dice2 = dices[j];
        let wins = 0;

        for (const val1 of dice1.values) {
          for (const val2 of dice2.values) {
            if (val1 > val2) wins++;
          }
        }

        const totalOutcomes = dice1.values.length * dice2.values.length;
        probabilities[i][j] = (wins / totalOutcomes).toFixed(2);
      }
    }

    return probabilities;
  }

  static displayProbabilities(dices) {
    const probabilities = this.calculateProbabilities(dices);
    console.log("\nprobability table:");
    console.log("   " + dices.map((_, i) => `К${i}`).join("  "));

    probabilities.forEach((row, i) => {
      console.log(`К${i} ` + row.map((prob) => `${prob}`).join("  "));
    });
    console.log();
  }
}

class NonTransitiveDiceGame {
  constructor(dices) {
    this.dices = dices;
    this.userDice = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async readInput(prompt) {
    return new Promise((resolve) => this.rl.question(prompt, resolve));
  }

  async determineFirstMove() {
    const key = HMACGenerator.generateKey();
    const computerChoice = crypto.randomInt(0, 2);
    const hmac = HMACGenerator.generateHMAC(key, computerChoice);

    console.log(`We determine who goes first. HMAC=${hmac}`);
    const userGuess = await this.readInput(
      "Try to guess the number (0 or 1): "
    );

    console.log(`My number: ${computerChoice} (Key=${key})`);
    if (parseInt(userGuess, 10) === computerChoice) {
      console.log("You guessed right. You go first.");
      return true;
    } else {
      console.log("You guessed wrong. The computer goes first.");
      return false;
    }
  }

  async userSelectDice() {
    console.log("Choose a cube:");
    this.dices.forEach((dice, index) => {
      console.log(`${index} - ${JSON.stringify(dice.values)}`);
    });
    console.log("X - Exit");

    const choice = await this.readInput("Your choice: ");
    if (choice.toLowerCase() === "x") {
      console.log("Exit the game...");
      process.exit(0);
    }

    const diceIndex = parseInt(choice, 10);
    if (isNaN(diceIndex) || diceIndex < 0 || diceIndex >= this.dices.length) {
      console.error("Wrong choice. Try again.");
      return await this.userSelectDice();
    }

    this.userDice = this.dices[diceIndex];
    console.log(`You have chosen a cube: ${JSON.stringify(this.userDice.values)}`);
  }

  computerTurn() {
    console.log("The computer selects a die...");
    const computerDice = this.dices[0]; 
    console.log(
      `The computer selected a cube: ${JSON.stringify(computerDice.values)}`
    );

    if (!this.userDice) {
      console.error("Error: The user did not select a cube!");
      return;
    }

    const computerRoll = computerDice.roll();
    console.log(`Throwing of computer: ${computerRoll}`);

    const userRoll = this.userDice.roll();
    console.log(`Your throw: ${userRoll}`);

    if (computerRoll > userRoll) {
      console.log(`The computer wins (${computerRoll} > ${userRoll})!`);
    } else if (computerRoll < userRoll) {
      console.log(`You're winning (${userRoll} > ${computerRoll})!`);
    } else {
      console.log(`Draw (${userRoll} = ${computerRoll})!`);
    }
  }

  async start() {
    console.log("Welcome to the intransitive dice game!");
    ProbabilityCalculator.displayProbabilities(this.dices);

    const userGoesFirst = await this.determineFirstMove();

    if (userGoesFirst) {
      await this.userSelectDice();
      this.computerTurn();
    } else {
      this.computerTurn();
      await this.userSelectDice();
    }

    this.rl.close();
  }
}

// Main
try {
  const args = process.argv.slice(2);
  const dices = DiceParser.parse(args);
  const game = new NonTransitiveDiceGame(dices);
  game.start();
} catch (error) {
  console.error(error.message);
  console.log(
    "Launch example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3"
  );
}
