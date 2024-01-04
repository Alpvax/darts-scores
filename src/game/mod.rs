pub use self::gameimpl::{Game, ActiveGame, CompletedGame};
pub use self::gametype::GameType;
pub use self::turn::GameTurn;
pub use self::score::GameScore;

pub mod gametype;
pub mod score;
pub mod turn;
pub mod gameimpl;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameEnd {
    EndGame,
    FinishRound,
    Continue,
}
impl Default for GameEnd {
    fn default() -> Self {
        Self::Continue
    }
}