pub trait GameScore: GSSerde + PartialEq + PartialOrd + Sized {
    type Active: ActiveGameScore + Into<Self> + core::fmt::Debug;
    type Value: Clone + ::num::Integer + core::fmt::Display;
    // type RoundDisplay: ::num::Integer + core::fmt::Display;
    // type RoundIter: Iterator;
    fn is_finished(&self) -> bool;
    // /// Run function with the turn of the numbered round, if that turn exists or is the next turn
    // fn with_turn<F, U>(&mut self, round: usize, f: F) -> Option<U>
    // where
    //     F: Fn(&mut T) -> U;
    // fn rounds<'a>(&'a self) -> Self::RoundIter;//Box<dyn Iterator<Item = T::Score> + 'a>;
    // fn rounds_display<'a>(
    //     &'a self,
    // ) -> crate::display::scoredisplay::ScoreDisplayIter<Self::Value, Self::RoundDisplay>;
    fn score(&self) -> Self::Value;
    /// Get the score up to and including the passed in round
    fn cumulative_score(&self, round: usize) -> Self::Value;
}

///
pub trait ActiveGameScore: core::ops::AddAssign<Self::Turn> {
    type Turn: super::GameTurn;
    /// 0 = game not started, 1 = first turn taken etc.
    fn current_round(&self) -> usize;
    fn next_turn(&self) -> Option<Self::Turn> {
        self.make_turn(self.current_round())
    }
    fn make_turn(&self, round: usize) -> Option<Self::Turn>;
}

pub trait GameDisplay: GameScore {
    fn get_turns(&self) -> ();
}

pub struct TurnDelta<S, T>
where
    S: core::fmt::Display,
    T: core::fmt::Display,
{
    start: S,
    delta: T,
    end: S,
}

#[cfg(feature = "serde")]
mod serde_impl {
    pub(super) trait GSSerde: ::serde::Serialize + ::serde::Deserialize {}
    impl<T> GSSerde for T where T: super::GameScore + ::serde::Serialize + ::serde::Deserialize {}
}
#[cfg(not(feature = "serde"))]
mod serde_impl {
    pub(super) trait GSSerde {}
    impl<T> GSSerde for T where T: super::GameScore {}
}
use serde_impl::GSSerde;
