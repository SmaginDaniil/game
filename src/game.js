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
      throw new Error("At least three dice configurations are required.");
    }

    return args.map((arg) => {
      const values = arg.split(",").map(Number);
      if (values.some(isNaN) || values.length < 1) {
        throw new Error(
          `Invalid die format '${arg}'. Dice must be a comma-separated list of integers.`
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
    console.log("\nProbability Table:");
    console.log("   " + dices.map((_, i) => `D${i}`).join("  "));

    probabilities.forEach((row, i) => {
      console.log(`D${i} ` + row.map((prob) => `${prob}`).join("  "));
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

    console.log(`Determining who goes first. HMAC=${hmac}`);
    const userGuess = await this.readInput(
      "Try to guess the number (0 or 1): "
    );

    console.log(`My number: ${computerChoice} (Key=${key})`);
    if (parseInt(userGuess, 10) === computerChoice) {
      console.log("You guessed correctly. You go first.");
      return true;
    } else {
      console.log("You guessed incorrectly. The computer goes first.");
      return false;
    }
  }

  async userSelectDice() {
    console.log("Choose a die:");
    this.dices.forEach((dice, index) => {
      console.log(`${index} - ${JSON.stringify(dice.values)}`);
    });
    console.log("X - Exit");

    const choice = await this.readInput("Your choice: ");
    if (choice.toLowerCase() === "x") {
      console.log("Exiting the game...");
      process.exit(0);
    }

    const diceIndex = parseInt(choice, 10);
    if (isNaN(diceIndex) || diceIndex < 0 || diceIndex >= this.dices.length) {
      console.error("Invalid choice. Try again.");
      return await this.userSelectDice();
    }

    this.userDice = this.dices[diceIndex];
    console.log(`You chose the die: ${JSON.stringify(this.userDice.values)}`);
  }

  computerTurn() {
    console.log("The computer selects a die...");
    const computerDice = this.dices[0];
    console.log(
      `The computer chose the die: ${JSON.stringify(computerDice.values)}`
    );

    if (!this.userDice) {
      console.error("Error: The user did not select a die!");
      return;
    }

    const computerRoll = computerDice.roll();
    console.log(`Computer's roll: ${computerRoll}`);

    const userRoll = this.userDice.roll();
    console.log(`Your roll: ${userRoll}`);

    if (computerRoll > userRoll) {
      console.log(`The computer wins (${computerRoll} > ${userRoll})!`);
    } else if (computerRoll < userRoll) {
      console.log(`You win (${userRoll} > ${computerRoll})!`);
    } else {
      console.log(`It's a draw (${userRoll} = ${computerRoll})!`);
    }
  }

  async start() {
    console.log("Welcome to the Non-Transitive Dice Game!");

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

  if (args.length === 1 && args[0].toLowerCase() === "help") {
    console.log("Usage: node game.js <dice1> <dice2> <dice3>");
    console.log("Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3");
    console.log("Each die should be a comma-separated list of integers.");
    process.exit(0);
  }

  const dices = DiceParser.parse(args);
  const game = new NonTransitiveDiceGame(dices);
  game.start();
} catch (error) {
  console.error(error.message);
  console.log(
    "Usage example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3"
  );
  console.log(
    "Each die should be specified as a comma-separated list of integers."
  );
}
