use crate::player::Player;

use super::round;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScoreDirection {
    /// Hitting targets causes your score to increase
    Ascending,
    /// Hitting targets causes your score to decrease
    Descending,
}
pub trait ScoreType: Sized {
    type Score: ::num::Integer
        + std::ops::AddAssign<<Self::RoundScore as RoundScore>::Score>
        + std::ops::SubAssign<<Self::RoundScore as RoundScore>::Score>;
    type RoundScore: RoundScore;
    type Tracked: From<PlayerScore<Self>>;
    fn start_score(player: Player) -> Self::Score; // Allow for handicaps
    fn direction() -> ScoreDirection;
    fn get_notable(player_score: PlayerScore<Self>) -> (Self::Score, Self::Tracked) {
        (player_score.score, Self::Tracked::from(player_score))
    }
}

pub trait RoundScore {
    type Score; //: ::num::Integer;
    fn value(&self) -> Self::Score;
}

pub struct PlayerScore<T>
where
    T: ScoreType,
{
    score: T::Score,
    round_scores: Vec<T::RoundScore>,
}
impl<T> PlayerScore<T>
where
    T: ScoreType,
{
    pub fn score_round(&mut self, round_score: T::RoundScore) {
        if T::direction() == ScoreDirection::Ascending {
            self.score += round_score.value();
        } else {
            self.score -= round_score.value();
        }
        self.round_scores.push(round_score);
    }
    pub fn num_rounds(&self) -> usize {
        self.round_scores.len()
    }
}
