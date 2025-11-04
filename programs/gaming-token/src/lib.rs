use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer, Burn};

declare_id!("DhkqYC1mAnZ41dgPz6NDLovGM6zxE1j7wHLBAizYkNB8");

#[program]
pub mod gaming_token {
    use super::*;

    pub fn initialize_mint(
        ctx: Context<InitializeMint>,
        token_name: String,
        token_symbol: String,
        decimals: u8,
    ) -> Result<()> {
        let mint_config = &mut ctx.accounts.mint_config;
        let clock = Clock::get()?;

        require!(token_name.len() <= 32, GamingTokenError::NameTooLong);
        require!(token_symbol.len() <= 10, GamingTokenError::SymbolTooLong);
        require!(decimals <= 9, GamingTokenError::InvalidDecimals);

        mint_config.authority = ctx.accounts.authority.key();
        mint_config.mint = ctx.accounts.mint.key();
        mint_config.token_name = token_name;
        mint_config.token_symbol = token_symbol;
        mint_config.decimals = decimals;
        mint_config.total_supply = 0;
        mint_config.is_initialized = true;
        mint_config.created_at = clock.unix_timestamp;

        emit!(MintInitialized {
            mint: mint_config.mint,
            name: mint_config.token_name.clone(),
            symbol: mint_config.token_symbol.clone(),
            decimals,
            authority: mint_config.authority,
            timestamp: mint_config.created_at,
        });

        Ok(())
    }

    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        let mint_config = &mut ctx.accounts.mint_config;

        require!(amount > 0, GamingTokenError::InvalidAmount);
        require!(
            ctx.accounts.authority.key() == mint_config.authority,
            GamingTokenError::Unauthorized
        );

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;

        mint_config.total_supply += amount;

        emit!(TokensMinted {
            mint: mint_config.mint,
            to: ctx.accounts.token_account.key(),
            amount,
            new_supply: mint_config.total_supply,
            timestamp: Clock::get().unwrap().unix_timestamp,
        });

        Ok(())
    }

    pub fn stake_tokens(
        ctx: Context<StakeTokens>,
        amount: u64,
        lock_period: i64, // Lock period in seconds
    ) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(amount > 0, GamingTokenError::InvalidAmount);
        require!(lock_period > 0, GamingTokenError::InvalidLockPeriod);

        // Transfer tokens to stake vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.stake_vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        stake_account.owner = ctx.accounts.authority.key();
        stake_account.amount = amount;
        stake_account.lock_until = clock.unix_timestamp + lock_period;
        stake_account.created_at = clock.unix_timestamp;
        stake_account.last_reward_claim = clock.unix_timestamp;
        stake_account.is_active = true;

        emit!(TokensStaked {
            owner: stake_account.owner,
            amount,
            lock_until: stake_account.lock_until,
            timestamp: stake_account.created_at,
        });

        Ok(())
    }

    pub fn unstake_tokens(
        ctx: Context<UnstakeTokens>,
    ) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(stake_account.is_active, GamingTokenError::StakeNotActive);
        require!(
            ctx.accounts.owner.key() == stake_account.owner,
            GamingTokenError::Unauthorized
        );
        require!(
            clock.unix_timestamp >= stake_account.lock_until,
            GamingTokenError::TokensStillLocked
        );

        // Calculate rewards (5% APY)
        let time_staked = clock.unix_timestamp - stake_account.created_at;
        let reward_amount = (stake_account.amount * 5 * time_staked as u64) / (100 * 365 * 24 * 60 * 60);
        let total_amount = stake_account.amount + reward_amount;

        // Transfer staked tokens + rewards from vault
        let mint_key = ctx.accounts.mint.key();
        let vault_seeds = &[
            b"stake_vault",
            mint_key.as_ref(),
            &[ctx.bumps.vault_authority],
        ];
        let signer = &[&vault_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.stake_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, total_amount)?;

        stake_account.is_active = false;

        emit!(TokensUnstaked {
            owner: stake_account.owner,
            principal: stake_account.amount,
            reward: reward_amount,
            total: total_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
    ) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(stake_account.is_active, GamingTokenError::StakeNotActive);
        require!(
            ctx.accounts.owner.key() == stake_account.owner,
            GamingTokenError::Unauthorized
        );

        // Calculate rewards since last claim
        let time_since_last_claim = clock.unix_timestamp - stake_account.last_reward_claim;
        let reward_amount = (stake_account.amount * 5 * time_since_last_claim as u64) / (100 * 365 * 24 * 60 * 60);

        if reward_amount > 0 {
            // Transfer rewards from reward vault
            let mint_key = ctx.accounts.mint.key();
            let reward_vault_seeds = &[
                b"reward_vault",
                mint_key.as_ref(),
                &[ctx.bumps.reward_vault_authority],
            ];
            let signer = &[&reward_vault_seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.reward_vault_authority.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, reward_amount)?;

            stake_account.last_reward_claim = clock.unix_timestamp;

            emit!(RewardsClaimed {
                owner: stake_account.owner,
                amount: reward_amount,
                timestamp: clock.unix_timestamp,
            });
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 8,
        seeds = [b"mint_config", mint.key().as_ref()],
        bump
    )]
    pub mint_config: Account<'info, MintConfig>,

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
pub struct MintTokens<'info> {
    #[account(mut, has_one = authority)]
    pub mint_config: Account<'info, MintConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"stake", authority.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = vault_authority,
        seeds = [b"stake_vault", mint.key().as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = reward_vault_authority,
        seeds = [b"reward_vault", mint.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"vault_authority", mint.key().as_ref()],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    #[account(
        seeds = [b"reward_vault_authority", mint.key().as_ref()],
        bump
    )]
    pub reward_vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UnstakeTokens<'info> {
    #[account(
        mut,
        has_one = owner,
        constraint = stake_account.is_active @ GamingTokenError::StakeNotActive
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(seeds = [b"vault_authority", mint.key().as_ref()], bump)]
    pub vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the owner of the stake account
    pub owner: Signer<'info>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        has_one = owner,
        constraint = stake_account.is_active @ GamingTokenError::StakeNotActive
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(seeds = [b"reward_vault_authority", mint.key().as_ref()], bump)]
    pub reward_vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the owner of the stake account
    pub owner: Signer<'info>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct MintConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub token_name: String,
    pub token_symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub is_initialized: bool,
    pub created_at: i64,
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub lock_until: i64,
    pub created_at: i64,
    pub last_reward_claim: i64,
    pub is_active: bool,
}

#[event]
pub struct MintInitialized {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TokensMinted {
    pub mint: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub new_supply: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensStaked {
    pub owner: Pubkey,
    pub amount: u64,
    pub lock_until: i64,
    pub timestamp: i64,
}

#[event]
pub struct TokensUnstaked {
    pub owner: Pubkey,
    pub principal: u64,
    pub reward: u64,
    pub total: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardsClaimed {
    pub owner: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum GamingTokenError {
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid lock period")]
    InvalidLockPeriod,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Stake not active")]
    StakeNotActive,
    #[msg("Tokens still locked")]
    TokensStillLocked,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}