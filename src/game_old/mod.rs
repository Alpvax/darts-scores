use std::collections::HashSet;

use chrono::NaiveDateTime;
use indexmap::IndexMap;

use crate::player::Player;

// pub use self::round::GameRound;
// pub use self::score::{PlayerScore, RoundScore, ScoreDirection, ScoreType};
// use self::{
//     score::{GameScore, Score, TurnScore},
//     turn::Turn,
// };
pub use self::score::*;

// mod round;
pub mod score;
// mod turn;

// #[derive(Debug)]
// pub struct Game<G>
// where
//     G: GameType,
// {
//     typ: G,
//     start: NaiveDateTime,
//     scores: IndexMap<
//         Player,
//         Score<<G::Score as GameScore>::ResultType, <G::Score as GameScore>::ResultType>,
//     >,
//     round_num: u8,
//     current_round: HashSet<Player>,
//     current_turn: Option<G::Turn>,
// }
// impl<G> Game<G>
// where
//     G: GameType,
// {
//     pub fn new<P>(game_type: G, players: P) -> Self
//     where
//         P: IntoIterator<Item = Player>,
//     {
//         Self::new_dated(game_type, ::chrono::Utc::now().naive_local(), players)
//     }
//     pub fn new_dated<P>(game_type: G, start_at: NaiveDateTime, players: P) -> Self
//     where
//         P: IntoIterator<Item = Player>,
//     {
//         let scores: IndexMap<_, _> = players
//             .into_iter()
//             .map(|p| {
//                 let s = G::starting_score(&p);
//                 (p, s)
//             })
//             .collect();
//         assert!(scores.len() > 0, "Game cannot be played with no players!");
//         Self {
//             typ: game_type,
//             start: start_at,
//             scores,
//             round_num: 0,
//             current_round: Default::default(),
//             current_turn: None,
//         }
//     }
//     pub fn begin_turn(&mut self, player: Player) -> &mut G::Turn {
//         assert!(
//             self.current_turn.is_none(),
//             "Cannot start new turn before the previous one has ended"
//         );
//         self.current_turn = Some(<G::Turn as Turn>::new(
//             self.current_round,
//             &player,
//             self.scores.get(&player).expect("Player is not playing"),
//         ));
//         &mut self.current_turn
//     }
//     pub fn end_turn(&mut self) {
//         //TODO: return turn result
//         self.current_turn.take().and_then(|turn| {
//             let score = self.scores.get_mut(turn.player()).unwrap();
//             score += turn.
//         });
//     }
//     pub fn begin_round(&mut self) -> G::Round {
//         //TODO: end previous unfinished round
//         //for round in self.current_round.values()
//         // if let Some(round) = self.current_round.take() {
//         //     round.end(self);
//         // }
//         self.round_num += 1;
//         self.current_round = self.scores.keys().map(|p| *p).collect();
//         <G::Round as GameRound>::new(self.round_num)
//     }
//     /// Return true if the round is complete (All players have scored)
//     pub fn score_round(
//         &mut self,
//         player: Player,
//         score: <G::Round as GameRound>::RoundScore,
//     ) -> bool {
//         assert!(!self.is_finished(), "No next turn! Game has ended");
//         if self.current_round.len() < 1 {
//             self.begin_round();
//         }
//         assert!(
//             self.current_round.remove(&player),
//             "Player is not playing current game!"
//         );
//         if let Some(game_score) = self.scores.get_mut(&player) {
//             game_score.score(self.round_num, score);
//         }
//         self.current_round.len() < 1
//     }
//     pub fn is_started(&self) -> bool {
//         self.round_num > 0
//     }
//     pub fn is_finished(&self) -> bool {
//         G::is_finished(&self)
//     }
// }

// pub trait GameType {
//     // type Score: ::num::Integer + std::ops::AddAssign<<Self::Round as GameRound>::RoundScore>;
//     type Score: GameScore;
//     // type TurnScore: TurnScore;
//     type Turn: Turn;
//     type Round: GameRound;
//     // type Score: PlayerScore<ScoreType = Self::ScoreType>;
//     // fn starting_score(player: &Player) -> Self::Score;
//     fn starting_score(player: &Player) -> PlayerScore<Self::Score>;
//     fn is_finished(game: &Game<Self>) -> bool
//     where
//         Self: Sized;
// }

// pub trait PlayerScore {
//     type ScoreType: ::num::Integer;
//     type NotableScores;
//     fn total(&self) -> Self::ScoreType;
//     fn notable_scores(&self) -> Self::NotableScores;
//     fn completed(&self) -> bool;
//     fn score<S>(&mut self, round_num: u8, round_score: S) where Self::ScoreType: std::ops::AddAssign<S>;
//     fn get_pb(scores: Vec<Self::ScoreType>) -> Option<Self::ScoreType>;
// }
