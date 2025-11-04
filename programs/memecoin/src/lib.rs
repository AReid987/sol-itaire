use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer};

declare_id!("A1WF2rG5Vs5tG6nhq2ZeDEN9hyESrWV3dtyq1XdBWkqT");

#[program]
pub mod memecoin {
    use super::*;

    pub fn initialize_memecoin(
        ctx: Context<InitializeMemecoin>,
        token_name: String,
        token_symbol: String,
        decimals: u8,
        total_supply: u64,
    ) -> Result<()> {
        let memecoin_config = &mut ctx.accounts.memecoin_config;
        let clock = Clock::get()?;

        require!(token_name.len() <= 32, MemecoinError::NameTooLong);
        require!(token_symbol.len() <= 10, MemecoinError::SymbolTooLong);
        require!(decimals <= 9, MemecoinError::InvalidDecimals);
        require!(total_supply > 0, MemecoinError::InvalidSupply);

        memecoin_config.authority = ctx.accounts.authority.key();
        memecoin_config.mint = ctx.accounts.mint.key();
        memecoin_config.token_name = token_name;
        memecoin_config.token_symbol = token_symbol;
        memecoin_config.decimals = decimals;
        memecoin_config.total_supply = total_supply;
        memecoin_config.circulating_supply = 0;
        memecoin_config.is_initialized = true;
        memecoin_config.created_at = clock.unix_timestamp;

        // Initialize distribution pools
        memecoin_config.game_rewards_pool = total_supply * 40 / 100; // 40%
        memecoin_config.liquidity_pool = total_supply * 30 / 100;   // 30%
        memecoin_config.team_allocation = total_supply * 20 / 100;  // 20%
        memecoin_config.community_allocation = total_supply * 10 / 100; // 10%

        emit!(MemecoinInitialized {
            mint: memecoin_config.mint,
            name: memecoin_config.token_name.clone(),
            symbol: memecoin_config.token_symbol.clone(),
            total_supply,
            authority: memecoin_config.authority,
            timestamp: memecoin_config.created_at,
        });

        Ok(())
    }

    pub fn distribute_initial_supply(
        ctx: Context<DistributeInitialSupply>,
    ) -> Result<()> {
        let memecoin_config = &mut ctx.accounts.memecoin_config;

        require!(
            ctx.accounts.authority.key() == memecoin_config.authority,
            MemecoinError::Unauthorized
        );
        require!(
            memecoin_config.circulating_supply == 0,
            MemecoinError::AlreadyDistributed
        );

        // Distribute to game rewards pool
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.game_rewards_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, memecoin_config.game_rewards_pool)?;

        // Distribute to liquidity pool
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.liquidity_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, memecoin_config.liquidity_pool)?;

        // Distribute to team
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.team_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, memecoin_config.team_allocation)?;

        // Distribute to community
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.community_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, memecoin_config.community_allocation)?;

        memecoin_config.circulating_supply = memecoin_config.total_supply;

        emit!(InitialSupplyDistributed {
            mint: memecoin_config.mint,
            total_amount: memecoin_config.total_supply,
            timestamp: Clock::get().unwrap().unix_timestamp,
        });

        Ok(())
    }

    pub fn distribute_game_rewards(
        ctx: Context<DistributeGameRewards>,
        player: Pubkey,
        amount: u64,
        game_id: String,
    ) -> Result<()> {
        let memecoin_config = &mut ctx.accounts.memecoin_config;
        let rewards_account = &mut ctx.accounts.rewards_account;

        require!(amount > 0, MemecoinError::InvalidAmount);
        require!(game_id.len() <= 32, MemecoinError::GameIdTooLong);
        require!(
            ctx.accounts.authority.key() == memecoin_config.authority,
            MemecoinError::Unauthorized
        );

        // Check sufficient balance in rewards pool
        require!(
            ctx.accounts.game_rewards_account.amount >= amount,
            MemecoinError::InsufficientRewards
        );

        // Transfer from game rewards pool to player
        let rewards_seeds = &[
            b"rewards_pool",
            memecoin_config.mint.as_ref(),
            &[ctx.accounts.rewards_authority.bump],
        ];
        let signer = &[&rewards_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.game_rewards_account.to_account_info(),
            to: ctx.accounts.player_account.to_account_info(),
            authority: ctx.accounts.rewards_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // Update rewards tracking
        rewards_account.player = player;
        rewards_account.game_id = game_id;
        rewards_account.amount = amount;
        rewards_account.timestamp = Clock::get().unwrap().unix_timestamp;

        emit!(GameRewardDistributed {
            player,
            amount,
            game_id: rewards_account.game_id.clone(),
            timestamp: rewards_account.timestamp,
        });

        Ok(())
    }

    pub fn claim_airdrop(
        ctx: Context<ClaimAirdrop>,
    ) -> Result<()> {
        let airdrop_account = &mut ctx.accounts.airdrop_account;
        let clock = Clock::get()?;

        require!(
            ctx.accounts.authority.key() == airdrop_account.recipient,
            MemecoinError::Unauthorized
        );
        require!(!airdrop_account.claimed, MemecoinError::AlreadyClaimed);

        // Check if airdrop period has started (e.g., 30 days after launch)
        require!(
            clock.unix_timestamp >= airdrop_account.claimable_at,
            MemecoinError::AirdropNotAvailable
        );

        // Transfer airdrop amount
        let airdrop_seeds = &[
            b"airdrop_pool",
            airdrop_account.mint.as_ref(),
            &[ctx.accounts.airdrop_pool.bump],
        ];
        let signer = &[&airdrop_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.airdrop_pool.to_account_info(),
            to: ctx.accounts.recipient_account.to_account_info(),
            authority: ctx.accounts.airdrop_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, airdrop_account.amount)?;

        airdrop_account.claimed = true;
        airdrop_account.claimed_at = clock.unix_timestamp;

        emit!(AirdropClaimed {
            recipient: airdrop_account.recipient,
            amount: airdrop_account.amount,
            timestamp: airdrop_account.claimed_at,
        });

        Ok(())
    }

    pub fn setup_airdrop_account(
        ctx: Context<SetupAirdropAccount>,
        amount: u64,
        claimable_at: i64,
    ) -> Result<()> {
        let airdrop_account = &mut ctx.accounts.airdrop_account;

        require!(amount > 0, MemecoinError::InvalidAmount);
        require!(claimable_at > Clock::get().unwrap().unix_timestamp, MemecoinError::InvalidClaimTime);

        airdrop_account.recipient = ctx.accounts.authority.key();
        airdrop_account.mint = ctx.accounts.mint.key();
        airdrop_account.amount = amount;
        airdrop_account.claimable_at = claimable_at;
        airdrop_account.claimed = false;
        airdrop_account.created_at = Clock::get().unwrap().unix_timestamp;

        emit!(AirdropAccountSetup {
            recipient: airdrop_account.recipient,
            amount,
            claimable_at,
            timestamp: airdrop_account.created_at,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(token_name: String, token_symbol: String)]
pub struct InitializeMemecoin<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 8,
        seeds = [b"memecoin_config", mint.key().as_ref()],
        bump
    )]
    pub memecoin_config: Account<'info, MemecoinConfig>,

    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority,
        mint::freeze_authority = authority,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DistributeInitialSupply<'info> {
    #[account(mut, has_one = authority)]
    pub memecoin_config: Account<'info, MemecoinConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = authority, token::mint = mint)]
    pub game_rewards_account: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = authority, token::mint = mint)]
    pub liquidity_account: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = authority, token::mint = mint)]
    pub team_account: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = authority, token::mint = mint)]
    pub community_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DistributeGameRewards<'info> {
    #[account(mut, has_one = authority)]
    pub memecoin_config: Account<'info, MemecoinConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 8,
        seeds = [b"reward", player.as_ref(), game_id.as_bytes()],
        bump
    )]
    pub rewards_account: Account<'info, RewardAccount>,

    #[account(mut)]
    pub game_rewards_account: Account<'info, TokenAccount>,

    #[account(init_if_needed, payer = authority, token::mint = memecoin_config.mint)]
    pub player_account: Account<'info, TokenAccount>,

    #[account(seeds = [b"rewards_pool", memecoin_config.mint.as_ref()], bump)]
    pub rewards_authority: Account<'info, MemecoinConfig>,

    pub mint: Account<'info, Mint>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ClaimAirdrop<'info> {
    #[account(
        mut,
        has_one = mint,
        constraint = !airdrop_account.claimed @ MemecoinError::AlreadyClaimed
    )]
    pub airdrop_account: Account<'info, AirdropAccount>,

    #[account(mut)]
    pub airdrop_pool: Account<'info, TokenAccount>,

    #[account(seeds = [b"airdrop_pool", airdrop_account.mint.as_ref()], bump)]
    pub airdrop_authority: AccountInfo<'info>,

    #[account(mut)]
    pub recipient_account: Account<'info, TokenAccount>,

    #[account(constraint = authority.key() == airdrop_account.recipient)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetupAirdropAccount<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 1 + 8,
        seeds = [b"airdrop", authority.key().as_ref()],
        bump
    )]
    pub airdrop_account: Account<'info, AirdropAccount>,

    pub mint: Account<'info, Mint>,
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct MemecoinConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub token_name: String,
    pub token_symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub game_rewards_pool: u64,
    pub liquidity_pool: u64,
    pub team_allocation: u64,
    pub community_allocation: u64,
    pub is_initialized: bool,
    pub created_at: i64,
}

#[account]
pub struct RewardAccount {
    pub player: Pubkey,
    pub game_id: String,
    pub amount: u64,
    pub timestamp: i64,
}

#[account]
pub struct AirdropAccount {
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub claimable_at: i64,
    pub claimed: bool,
    pub created_at: i64,
    pub claimed_at: Option<i64>,
}

#[event]
pub struct MemecoinInitialized {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub total_supply: u64,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct InitialSupplyDistributed {
    pub mint: Pubkey,
    pub total_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct GameRewardDistributed {
    pub player: Pubkey,
    pub amount: u64,
    pub game_id: String,
    pub timestamp: i64,
}

#[event]
pub struct AirdropAccountSetup {
    pub recipient: Pubkey,
    pub amount: u64,
    pub claimable_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct AirdropClaimed {
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum MemecoinError {
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid supply")]
    InvalidSupply,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Game ID too long")]
    GameIdTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Already distributed")]
    AlreadyDistributed,
    #[msg("Insufficient rewards")]
    InsufficientRewards,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Airdrop not available")]
    AirdropNotAvailable,
    #[msg("Invalid claim time")]
    InvalidClaimTime,
}