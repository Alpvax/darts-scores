use crate::{player::Player, target::Target};

use super::score::GameScore;

pub trait Turn {
    type GameScore: GameScore;
    type Score: ::num::Integer;
    type TotalScore: ::num::Integer;
    type Notable;
    fn new(round_num: u8, player: &Player, start_score: Self::TotalScore) -> Self;
    fn round(&self) -> u8;
    fn player(&self) -> &Player;
    fn start_score(&self) -> Self::TotalScore;
    fn score_turn(&mut self, score: Self::Score) -> TurnResult<Self::TotalScore>;
    fn throw_dart(&mut self, target_hit: Option<Target>) -> DartResult<Self::TotalScore>;
    fn result(&self) -> TurnResult<Self::TotalScore>;
}

#[derive(Debug)]
pub enum DartResult<GS, TS> {
    /// `(remaining/new_score, remaining_darts)`
    /// Still current player's turn
    Partial(GS, u8),
    TurnEnded(TurnResult<TS>),
}

#[derive(Debug, Clone, Copy)]
pub enum TurnResult<S> {
    /// Turn ended, but game not over
    NextPlayer,
    /// `(number_of_darts_used)` e.g. in **x01** you could check out with fewer than 3 darts
    /// Player has finished the entire game (win/draw).
    /// Possibly not applicable for game types with set number of rounds.
    PlayerFinish(u8),
    /// `(number_of_darts_used)`
    /// Turn ended, but player's score should not be modified.
    /// Not applicable for all game types
    Bust,
}
