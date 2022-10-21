use crate::target::Target;

pub trait Score: Sized {
    type Turn: Turn<Self>;
    type Value;
    fn new() -> Self;
    fn current_round(&self) -> u8;
    fn current_score(&self) -> Self::Value;
    fn next_turn(&mut self) -> Option<&mut Self::Turn>;
    fn end_turn(&mut self) -> TurnResult;
    fn score_turn<F>(&mut self, f: F) -> TurnResult
    where
        F: FnOnce(&mut Self::Turn) -> TurnResult,
    {
        if let Some(turn) = self.next_turn() {
            f(turn)
        } else {
            TurnResult::PlayerFinish(0)
        }
    }
    fn is_finished(&self) -> bool;
}

pub trait Turn<S>
where
    S: Score,
{
    type Hit;
    fn score_dart(&mut self, hit: Target) -> DartResult<S::Value>;
    fn score_darts<const N: usize>(&mut self, hits: [Target; N]) -> TurnResult; //TODO: { for dart in hits {score_dart} }
    fn score_turn<T>(&mut self, score: T) -> TurnResult
    where
        T: Into<Self::Hit>;
    fn is_finished(&self) -> bool;
    fn get_score_change(&self) -> S::Value;
}

// pub trait TargetTurn<S> where S: Score {
//     fn score_hits(&mut self, hits: u8);
//     fn is_finished(&self) -> bool;
//     fn get_score_change(&self) -> S::Value;
// }
// impl<T, S> Turn<S> for T where T: TargetTurn<S> {
//     type Hit = u8;

//     fn score_dart<D>(&mut self, hit: D) -> DartResult<<S as Score>::Value> where D: Into<Self::Hit> {
//         todo!()
//     }

//     fn score_darts<const N: u8, D>(&mut self, hits: [D; N]) -> TurnResult where D: Into<Self::Hit> {
//         todo!()
//     }

//     fn is_finished(&self) -> bool {
//         todo!()
//     }

//     fn get_score_change(&self) -> <S as Score>::Value {
//         todo!()
//     }
// }

#[derive(Debug)]
pub enum DartResult<S> {
    /// `(remaining/new_score, remaining_darts)`
    /// Still current player's turn
    Partial(S, u8),
    TurnEnded(TurnResult),
}

#[derive(Debug, Clone, Copy)]
pub enum TurnResult {
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
