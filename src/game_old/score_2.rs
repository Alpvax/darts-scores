use std::ops::{AddAssign, SubAssign};

pub struct Score<I, N>
where
    I: ::num::Integer,
{
    value: I,
    notable: N,
}
// impl<I, N> Score<I, N> where I: ::num::Integer {
//     fn add
// }
impl<I, N, SI, SN> AddAssign<Score<SI, SN>> for Score<I, N>
where
    I: ::num::Integer + AddAssign<SI>,
    N: AddAssign<SN>,
    SI: ::num::Integer,
{
    fn add_assign(&mut self, rhs: Score<SI, SN>) {
        self.value += rhs.value;
        self.notable += rhs.notable;
    }
}
impl<I, N, SI, SN> SubAssign<Score<SI, SN>> for Score<I, N>
where
    I: ::num::Integer + SubAssign<SI>,
    N: AddAssign<SN>,
    SI: ::num::Integer,
{
    fn sub_assign(&mut self, rhs: Score<SI, SN>) {
        self.value -= rhs.value;
        self.notable += rhs.notable;
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScoreDirection {
    /// Hitting targets causes your score to increase
    Ascending,
    /// Hitting targets causes your score to decrease
    Descending,
}

pub trait GameScore {
    type ResultType: ::num::Integer;
    type NotableGame;
    fn score_direction() -> ScoreDirection;
    fn add_score<I, N, R>(&mut self, score: Score<I, N>) -> ();
}
pub trait TurnScore {
    type Points: ::num::Integer;
    type NotableTurn;
    // type TurnScore: TurnScore;
}
