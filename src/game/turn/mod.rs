pub mod impls;
pub mod numdarts;

use crate::target::BoardSection;

pub use self::numdarts::NumDarts;

pub trait GameTurn {
    // const NUM_DARTS: NumDarts;
    fn num_darts(&self) -> NumDarts;
    fn darts_thrown(&self) -> u8;
    fn remaining_darts(&self) -> NumDarts {
        // Self::NUM_DARTS - self.darts_thrown()
        self.num_darts() - self.darts_thrown()
    }
    fn throw_dart(&mut self, hit: BoardSection) -> DartResult;
    fn result(&self) -> TurnResult;
    fn score_darts<const N: usize>(&mut self, darts: [BoardSection; N]) -> TurnResult {
        for dart in darts {
            if let DartResult::EndTurn(turn_res) = self.throw_dart(dart) {
                return turn_res;
            }
        }
        self.result()
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DartResult {
    /// Turn is ended
    EndTurn(TurnResult),
    /// Turn continues, still {remaining} darts left to play
    Continue(NumDarts),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TurnResult {
    /// Player has scored enough to end the game. (num_darts_used) for games which can end without all darts being played)
    GameEnd(u8),
    /// Turn is ended, count score. (num_darts_used) for games which can end without all darts being played)
    Score(u8),
    /// Turn is ended, but score should not be counted. (num_darts_used) for games which can end without all darts being played)
    Bust(u8),
}