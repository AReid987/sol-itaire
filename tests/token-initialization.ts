import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import fs from "fs";

// Configure the provider
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const wallet = new Wallet(Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync("/Users/antonioreid/.config/solana/id.json", "utf8")))
));
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

// Load the IDLs for the programs
const gamingTokenIdl = require("../target/idl/gaming_token.json");
const memecoinIdl = require("../target/idl/memecoin.json");

// Program IDs
const GAMING_TOKEN_PROGRAM_ID = new PublicKey("DhkqYC1mAnZ41dgPz6NDLovGM6zxE1j7wHLBAizYkNB8");
const MEMECOIN_PROGRAM_ID = new PublicKey("A1WF2rG5Vs5tG6nhq2ZeDEN9hyESrWV3dtyq1XdBWkqT");

// Token specifications
const GAMING_TOKEN_SUPPLY = 10_000_000_000_000_000_000n; // 10 billion tokens with 9 decimals
const GAMING_TOKEN_NAME = "Solitaire Gaming Token";
const GAMING_TOKEN_SYMBOL = "SOL-IT";

const MEMECOIN_SUPPLY = 100_000_000_000_000_000_000n; // 100 billion tokens with 9 decimals
const MEMECOIN_NAME = "Solitaire Memecoin";
const MEMECOIN_SYMBOL = "SOL-COIN";

async function initializeGamingToken() {
  console.log("🎮 Initializing Gaming Token...");

  const program = new Program(gamingTokenIdl as Idl, GAMING_TOKEN_PROGRAM_ID, provider);

  // Generate a new keypair for the mint
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Generate a keypair for the mint config
  const [mintConfigPDA] = await PublicKey.findProgramAddress(
    [Buffer.from("mint_config"), mint.toBuffer()],
    program.programId
  );

  try {
    const tx = await program.methods
      .initializeMint(GAMING_TOKEN_NAME, GAMING_TOKEN_SYMBOL, 9)
      .accounts({
        mintConfig: mintConfigPDA,
        mint: mint,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log(`✅ Gaming Token initialized!`);
    console.log(`   Mint: ${mint.toString()}`);
    console.log(`   Transaction: ${tx}`);
    console.log(`   Name: ${GAMING_TOKEN_NAME}`);
    console.log(`   Symbol: ${GAMING_TOKEN_SYMBOL}`);
    console.log(`   Total Supply: ${GAMING_TOKEN_SUPPLY.toString()}`);

    return { mint, mintConfig: mintConfigPDA };
  } catch (error) {
    console.error("❌ Failed to initialize gaming token:", error);
    throw error;
  }
}

async function initializeMemecoin() {
  console.log("🪙 Initializing Memecoin...");

  const program = new Program(memecoinIdl as Idl, MEMECOIN_PROGRAM_ID, provider);

  // Generate a new keypair for the mint
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Generate a keypair for the memecoin config
  const [memecoinConfigPDA] = await PublicKey.findProgramAddress(
    [Buffer.from("memecoin_config"), mint.toBuffer()],
    program.programId
  );

  try {
    const tx = await program.methods
      .initializeMemecoin(MEMECOIN_NAME, MEMECOIN_SYMBOL, 9, MEMECOIN_SUPPLY.toString())
      .accounts({
        memecoinConfig: memecoinConfigPDA,
        mint: mint,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log(`✅ Memecoin initialized!`);
    console.log(`   Mint: ${mint.toString()}`);
    console.log(`   Transaction: ${tx}`);
    console.log(`   Name: ${MEMECOIN_NAME}`);
    console.log(`   Symbol: ${MEMECOIN_SYMBOL}`);
    console.log(`   Total Supply: ${MEMECOIN_SUPPLY.toString()}`);

    return { mint, memecoinConfig: memecoinConfigPDA };
  } catch (error) {
    console.error("❌ Failed to initialize memecoin:", error);
    throw error;
  }
}

async function distributeMemecoinSupply(program: Program, memecoinConfig: PublicKey, mint: PublicKey) {
  console.log("📦 Distributing initial memecoin supply...");

  try {
    const tx = await program.methods
      .distributeInitialSupply()
      .accounts({
        memecoinConfig: memecoinConfig,
        mint: mint,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log(`✅ Initial memecoin supply distributed!`);
    console.log(`   Transaction: ${tx}`);

    // Distribution breakdown
    const gameRewards = MEMECOIN_SUPPLY * 40n / 100n;
    const liquidity = MEMECOIN_SUPPLY * 30n / 100n;
    const team = MEMECOIN_SUPPLY * 20n / 100n;
    const community = MEMECOIN_SUPPLY * 10n / 100n;

    console.log(`   Game Rewards Pool: ${gameRewards.toString()} (${(Number(gameRewards) / 1e9).toFixed(0)} tokens)`);
    console.log(`   Liquidity Pool: ${liquidity.toString()} (${(Number(liquidity) / 1e9).toFixed(0)} tokens)`);
    console.log(`   Team Allocation: ${team.toString()} (${(Number(team) / 1e9).toFixed(0)} tokens)`);
    console.log(`   Community Allocation: ${community.toString()} (${(Number(community) / 1e9).toFixed(0)} tokens)`);

  } catch (error) {
    console.error("❌ Failed to distribute memecoin supply:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting Sol-itaire Token Initialization...");
  console.log(`📍 Network: Devnet`);
  console.log(`💳 Wallet: ${provider.wallet.publicKey.toString()}`);
  console.log(`⚖️  Balance: ${(await connection.getBalance(provider.wallet.publicKey)) / 1e9} SOL\n`);

  try {
    // Initialize Gaming Token
    const gamingToken = await initializeGamingToken();

    // Initialize Memecoin
    const memecoin = await initializeMemecoin();

    // Distribute initial memecoin supply
    const memecoinProgram = new Program(memecoinIdl as Idl, MEMECOIN_PROGRAM_ID, provider);
    await distributeMemecoinSupply(memecoinProgram, memecoin.memecoinConfig, memecoin.mint);

    // Save deployment information
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: "devnet",
      wallet: provider.wallet.publicKey.toString(),
      gamingToken: {
        programId: GAMING_TOKEN_PROGRAM_ID.toString(),
        mint: gamingToken.mint.toString(),
        mintConfig: gamingToken.mintConfig.toString(),
        name: GAMING_TOKEN_NAME,
        symbol: GAMING_TOKEN_SYMBOL,
        totalSupply: GAMING_TOKEN_SUPPLY.toString(),
        decimals: 9
      },
      memecoin: {
        programId: MEMECOIN_PROGRAM_ID.toString(),
        mint: memecoin.mint.toString(),
        memecoinConfig: memecoin.memecoinConfig.toString(),
        name: MEMECOIN_NAME,
        symbol: MEMECOIN_SYMBOL,
        totalSupply: MEMECOIN_SUPPLY.toString(),
        decimals: 9
      }
    };

    fs.writeFileSync("token-deployment-info.json", JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎉 Token initialization completed successfully!");
    console.log("📄 Deployment info saved to token-deployment-info.json");

    console.log("\n📋 Summary:");
    console.log(`   Gaming Token Mint: ${gamingToken.mint.toString()}`);
    console.log(`   Memecoin Mint: ${memecoin.mint.toString()}`);
    console.log(`   Gaming Token Program: ${GAMING_TOKEN_PROGRAM_ID.toString()}`);
    console.log(`   Memecoin Program: ${MEMECOIN_PROGRAM_ID.toString()}`);

  } catch (error) {
    console.error("💥 Token initialization failed:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);