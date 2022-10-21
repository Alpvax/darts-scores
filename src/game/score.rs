use super::Turn;

pub trait GameScore<T>
where
    T: Turn,
{
    type Value: Clone + ::num::Integer + core::fmt::Display;
    type RoundDisplay: ::num::Integer + core::fmt::Display;
    // type RoundIter: Iterator;
    /// 0 = game not started, 1 = first turn taken etc.
    fn current_round(&self) -> usize;
    fn is_finished(&self) -> bool;
    fn new_turn(&self) -> T;
    /// Run function with the turn of the numbered round, if that turn exists or is the next turn
    fn with_turn<F, U>(&mut self, round: usize, f: F) -> Option<U> where F: Fn(&mut T) -> U;
    // fn rounds<'a>(&'a self) -> Self::RoundIter;//Box<dyn Iterator<Item = T::Score> + 'a>;
    fn rounds_display<'a>(
        &'a self,
    ) -> crate::display::scoredisplay::ScoreDisplayIter<Self::Value, Self::RoundDisplay>;
    fn score(&self) -> Self::Value;
    /// Get the score up to and including the passed in round
    fn cumulative_score(&self, round: usize) -> Self::Value;
}
