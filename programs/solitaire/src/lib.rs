use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solitaire {
    use super::*;

    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_id: String,
        stake_amount: u64,
        reward_mint: Pubkey,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(stake_amount > 0, SolitaireError::InvalidStakeAmount);
        require!(game_id.len() <= 32, SolitaireError::GameIdTooLong);

        game.authority = ctx.accounts.authority.key();
        game.game_id = game_id;
        game.stake_amount = stake_amount;
        game.reward_mint = reward_mint;
        game.status = GameStatus::Active;
        game.moves = 0;
        game.score = 0;
        game.is_won = false;
        game.created_at = clock.unix_timestamp;
        game.updated_at = clock.unix_timestamp;

        // Initialize game state
        game.game_state = GameState::new(ctx.accounts.authority.key());

        // Transfer stake to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, stake_amount)?;

        emit!(GameStarted {
            game_id: game.game_id.clone(),
            player: game.authority,
            stake_amount,
            timestamp: game.created_at,
        });

        Ok(())
    }

    pub fn make_move(
        ctx: Context<MakeMove>,
        from_pile: String,
        to_pile: String,
        card_index: u8,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == GameStatus::Active, SolitaireError::GameNotActive);
        require!(
            ctx.accounts.authority.key() == game.authority,
            SolitaireError::Unauthorized
        );

        // Validate and execute move
        game.game_state.make_move(&from_pile, &to_pile, card_index)?;
        game.moves += 1;
        game.updated_at = clock.unix_timestamp;

        // Check for win condition
        if game.game_state.is_won() {
            game.is_won = true;
            game.status = GameStatus::Completed;
            game.updated_at = clock.unix_timestamp;

            emit!(GameCompleted {
                game_id: game.game_id.clone(),
                player: game.authority,
                won: true,
                score: game.score,
                moves: game.moves,
                timestamp: game.updated_at,
            });
        }

        emit!(MoveMade {
            game_id: game.game_id.clone(),
            player: game.authority,
            from_pile,
            to_pile,
            card_index,
            moves: game.moves,
            timestamp: game.updated_at,
        });

        Ok(())
    }

    pub fn complete_game(
        ctx: Context<CompleteGame>,
        final_score: u64,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == GameStatus::Active, SolitaireError::GameNotActive);
        require!(
            ctx.accounts.authority.key() == game.authority,
            SolitaireError::Unauthorized
        );

        game.status = GameStatus::Completed;
        game.score = final_score;
        game.is_won = game.game_state.is_won();
        game.updated_at = clock.unix_timestamp;

        // Calculate rewards
        let reward_amount = if game.is_won {
            game.stake_amount * 2 // Double the stake for winning
        } else {
            game.stake_amount / 2 // Return half for completing
        };

        // Transfer rewards back to user
        let escrow_seeds = &[
            b"escrow",
            game.game_id.as_bytes(),
            &[game.bump],
        ];
        let signer = &[&escrow_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, reward_amount)?;

        emit!(GameCompleted {
            game_id: game.game_id.clone(),
            player: game.authority,
            won: game.is_won,
            score: final_score,
            moves: game.moves,
            timestamp: game.updated_at,
        });

        Ok(())
    }

    pub fn withdraw_stake(ctx: Context<WithdrawStake>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        require!(game.status == GameStatus::Active, SolitaireError::GameNotActive);
        require!(
            ctx.accounts.authority.key() == game.authority,
            SolitaireError::Unauthorized
        );

        // Allow withdrawal after 24 hours of inactivity
        let time_since_update = clock.unix_timestamp - game.updated_at;
        require!(time_since_update >= 86400, SolitaireError::WithdrawalTooEarly);

        game.status = GameStatus::Abandoned;
        game.updated_at = clock.unix_timestamp;

        // Return stake (minus penalty)
        let penalty = game.stake_amount / 10; // 10% penalty
        let refund_amount = game.stake_amount - penalty;

        let escrow_seeds = &[
            b"escrow",
            game.game_id.as_bytes(),
            &[game.bump],
        ];
        let signer = &[&escrow_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, refund_amount)?;

        emit!(StakeWithdrawn {
            game_id: game.game_id.clone(),
            player: game.authority,
            amount: refund_amount,
            penalty,
            timestamp: game.updated_at,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 1 + 1 + 8 + 8 + 256 + 32 + 1,
        seeds = [b"game", authority.key().as_ref(), game_id.as_bytes()],
        bump
    )]
    pub game: Account<'info, GameAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = reward_mint,
        token::authority = escrow_authority,
        seeds = [b"escrow", game_id.as_bytes()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"escrow_authority", game_id.as_bytes()],
        bump
    )]
    pub escrow_authority: AccountInfo<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(constraint = reward_mint.key() == reward_mint_info.key())]
    pub reward_mint_info: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MakeMove<'info> {
    #[account(mut)]
    pub game: Account<'info, GameAccount>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteGame<'info> {
    #[account(mut)]
    pub game: Account<'info, GameAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(seeds = [b"escrow_authority", game.game_id.as_bytes()], bump)]
    pub escrow_authority: AccountInfo<'info>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {
    #[account(mut)]
    pub game: Account<'info, GameAccount>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(seeds = [b"escrow_authority", game.game_id.as_bytes()], bump)]
    pub escrow_authority: AccountInfo<'info>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct GameAccount {
    pub authority: Pubkey,
    pub game_id: String,
    pub stake_amount: u64,
    pub reward_mint: Pubkey,
    pub status: GameStatus,
    pub moves: u32,
    pub score: u64,
    pub is_won: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub game_state: GameState,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum GameStatus {
    Active,
    Completed,
    Abandoned,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GameState {
    pub player: Pubkey,
    pub piles: Vec<PileData>,
    pub moves: u32,
    pub score: u64,
    pub is_won: bool,
    pub is_complete: bool,
    pub start_time: i64,
    pub end_time: Option<i64>,
}

impl GameState {
    pub fn new(player: Pubkey) -> Self {
        Self {
            player,
            piles: Vec::new(),
            moves: 0,
            score: 0,
            is_won: false,
            is_complete: false,
            start_time: Clock::get().unwrap().unix_timestamp,
            end_time: None,
        }
    }

    pub fn make_move(&mut self, from_pile: &str, to_pile: &str, card_index: u8) -> Result<()> {
        // Simplified game logic - in a real implementation, this would
        // contain the full solitaire game state management
        self.moves += 1;
        self.score += 10;

        // Here you would implement the actual solitaire move validation
        // and state updates

        Ok(())
    }

    pub fn is_won(&self) -> bool {
        // Check win condition - all cards in foundation piles
        self.is_won
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PileData {
    pub id: String,
    pub pile_type: PileType,
    pub cards: Vec<CardData>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum PileType {
    Tableau,
    Foundation,
    Stock,
    Waste,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CardData {
    pub suit: u8, // 0=hearts, 1=diamonds, 2=clubs, 3=spades
    pub rank: u8, // 1-13 (A-K)
    pub face_up: bool,
}

#[event]
pub struct GameStarted {
    pub game_id: String,
    pub player: Pubkey,
    pub stake_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct MoveMade {
    pub game_id: String,
    pub player: Pubkey,
    pub from_pile: String,
    pub to_pile: String,
    pub card_index: u8,
    pub moves: u32,
    pub timestamp: i64,
}

#[event]
pub struct GameCompleted {
    pub game_id: String,
    pub player: Pubkey,
    pub won: bool,
    pub score: u64,
    pub moves: u32,
    pub timestamp: i64,
}

#[event]
pub struct StakeWithdrawn {
    pub game_id: String,
    pub player: Pubkey,
    pub amount: u64,
    pub penalty: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum SolitaireError {
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Game ID too long")]
    GameIdTooLong,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Invalid move")]
    InvalidMove,
    #[msg("Withdrawal too early")]
    WithdrawalTooEarly,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Game state error")]
    GameStateError,
}