use crate::{player::Player, target::Target};

use super::Game;

pub trait GameRound {
    type RoundScore;
    fn new(round_number: u8) -> Self;
    fn score_round(&mut self, score: Self::RoundScore);
    fn end<G>(self, game: &mut Game<G>) -> Self::RoundScore
    where
        G: super::GameType<Round = Self>;
}

// pub trait Score3DartRound<S>: GameRound<S> + Score
pub trait Score3DartRound: GameRound {
    fn score_round_darts(&mut self, dart1: Target, dart2: Target, dart3: Target);
}

pub struct Turn<G>
where
    G: super::GameType,
{
    bomb: ::drop_bomb::DropBomb,
    pub player: Player,
    score: Option<G::TurnScore>,
}
impl<G> Turn<G> {
    fn throw_darts(&mut self, dart1: Option<Target>, dart2: Option<Target>, dart3: Option<Target>) {
    }
    fn is_scored(&self) -> bool {
        self.score.is_some()
    }
    fn notable_score(&self) -> Option<G::NotableTurnScore> {}
}

pub trait Round {
    type RoundScore;
    fn create(round_num: u8) -> Option<Self>;
    fn next_turn(&mut self) -> ();
}
