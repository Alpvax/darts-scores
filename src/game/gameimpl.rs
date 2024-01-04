use indexmap::IndexMap;

use crate::player::Player;

use super::{GameType, GameScore, GameEnd};

// #[derive(Debug, Clone, Copy, PartialEq, Eq)]
// pub enum PlayUntil {
//     /// End game when first player wins
//     FirstWin,
//     /// End game after first player wins, but allow all remaining players to play out the current round, allowing for draws
//     RoundEnd,
//     /// Continue playing game until there is only 1 player who hasn't finished
//     OneLoser,
//     /// Continue playing game until all players finish
//     AllWin,
// }

pub enum State<A, C> {
    Active(A),
    Complete(C),
}

pub trait GameT<T> where T: GameType {
    fn date_played(&self) -> &::chrono::NaiveDateTime;
    fn is_complete(&self) -> bool;
    fn config(&self) -> &T::Config;
    fn players(&self) -> Vec<&Player>;
}

pub enum Game<T> where T: GameType {
    Active(ActiveGame<T>),
    Completed(CompletedGame<T>),
}
impl<T> Game<T> where T: GameType {
    pub fn new<P, C>(players: P, config: C) -> Self
    where
        P: IntoIterator<Item = Player>,
        C: Into<T::Config>,
    {
        Self::new_dated(::chrono::Utc::now().naive_local(), players, config)
    }
    pub fn new_dated<D, P, C>(
        datetime: D,
        players: P,
        config: C,
    ) -> Self
    where
        D: Into<::chrono::NaiveDateTime>,
        P: IntoIterator<Item = Player>,
        C: Into<T::Config>,
    {
        Self::Active(ActiveGame::<T>::new(
            datetime.into(),
            players,
            config,
        ))
    }
}
impl<T> GameT<T> for Game<T> where T: GameType {
    fn date_played(&self) -> &chrono::NaiveDateTime {
        match self {
            Game::Active(g) => g.date_played(),
            Game::Completed(g) => g.date_played(),
        }
    }

    fn is_complete(&self) -> bool {
        todo!()
    }

    fn config(&self) -> &<T as GameType>::Config {
        todo!()
    }

    fn players(&self) -> Vec<&Player> {
        todo!()
    }
}

#[derive(Debug)]
pub struct ActiveGame<T> where T: GameType {
    typ: core::marker::PhantomData<T>,
    date: ::chrono::NaiveDateTime,
    config: T::Config,
    completed_scores: IndexMap<Player, Option<T::Score>>,
    active_scores: IndexMap<Player, <T::Score as GameScore>::Active>,
    /// Players yet to play this round. VecDeque to allow popping first
    round_players: std::collections::VecDeque<Player>,
    /// The latest played round (i.e. 0 = game not started, 1 = at least one player has completed turn 1)
    round_num: usize,
    state: GameEnd,
}
impl<T> ActiveGame<T> where T: GameType {
    pub fn new_now<P, C>(players: P, config: C) -> Self
    where
        P: IntoIterator<Item = Player>,
        C: Into<T::Config>,
    {
        Self::new(::chrono::Utc::now().naive_local(), players, config)
    }
    pub fn new<D, P, C>(
        datetime: D,
        players: P,
        config: C,
    ) -> Self
    where
        D: Into<::chrono::NaiveDateTime>,
        P: IntoIterator<Item = Player>,
        C: Into<T::Config>,
    {
        let config = config.into();
        let scores: IndexMap<_, _> = players
            .into_iter()
            .map(|p| {
                let s = T::new_score(&config, &p);
                (p, s)
            })
            .collect();
        assert!(scores.len() > 0, "Game cannot be played with no players!");
        Self {
            typ: core::marker::PhantomData,
            date: datetime.into(),
            completed_scores: scores.keys().map(|&p| (p, None)).collect(),
            active_scores: scores,
            round_players: std::collections::VecDeque::with_capacity(scores.len()),
            config,
            round_num: 0,
            state: GameEnd::Continue,
        }
    }
}
impl<T> GameT<T> for ActiveGame<T> where T: GameType {
    fn date_played(&self) -> &chrono::NaiveDateTime {
        &self.date
    }

    fn is_complete(&self) -> bool {
        match self.state {
            GameEnd::EndGame => true,
            GameEnd::FinishRound => self.round_players.len() < 1,
            GameEnd::Continue => false,
        }
    }

    fn config(&self) -> &<T as GameType>::Config {
        &self.config
    }

    fn players(&self) -> Vec<&Player> {
        self.completed_scores.keys().collect()
    }
    
}

#[derive(Debug)]
#[cfg_attr(feature = "serde", derive(::serde::Deserialize, ::serde::Serialize))]
pub struct CompletedGame<T> where T: GameType {
    typ: core::marker::PhantomData<T>,
    date: ::chrono::NaiveDateTime,
    config: T::Config,
    scores: IndexMap<Player, T::Score>,
}
impl<T> GameT<T> for CompletedGame<T> where T: GameType {
    fn date_played(&self) -> &chrono::NaiveDateTime {
        &self.date
    }

    fn is_complete(&self) -> bool {
        true
    }

    fn config(&self) -> &<T as GameType>::Config {
        &self.config
    }

    fn players(&self) -> Vec<&Player> {
        self.scores.keys().collect()
    }
}

// impl<T> Game<T>
// where
//     T: GameType,
// {
    

//     pub fn take_turn<F>(&mut self, player: Player, mut f: F)
//     where
//         F: FnMut(&mut T::Turn) -> (),
//     {
//         let score = self
//             .scores
//             .get_mut(&player)
//             .expect("Player is not playing current game");
//         // let t = score.current_round();
//         // if t > self.round_number {
//         //     self.round_number = t;
//         // }
//         let mut turn = score.new_turn();
//         f(&mut turn);
//         self.score_turn(player, turn.score())
//     }

//     fn score_turn(&mut self, player: Player, score: <T::Turn as Turn>::Score) -> () {
//         //TODO: TurnResult?
//         let p_score = self
//             .scores
//             .get_mut(&player)
//             .expect("Player is not playing current game");
//         *p_score += score;
//         self.round_number = core::cmp::max(self.round_number, p_score.current_round());
//         if p_score.is_finished() {
//             // Players who have not completed the game
//             let remaining = self
//                 .scores
//                 .iter()
//                 .filter_map(|(p, s)| if s.is_finished() { None } else { Some(p) })
//                 .collect::<Vec<_>>();
//             if (remaining.len() < 1 && self.final_round)
//                 || match (remaining.len(), T::should_end_game(remaining, &self.config)) {
//                     (_, gametype::GameEnd::EndGame) | (0, gametype::GameEnd::FinishRound) => true,
//                     (_, gametype::GameEnd::FinishRound) => {
//                         self.final_round = true;
//                         println!(
//                         "Player {} has finished during round {}\n\t The remainder of the round will play out to allow for draws",
//                         player, self.round_number
//                     );
//                         false
//                     }
//                     _ => {
//                         println!(
//                             "Player {} has won during round {}",
//                             player, self.round_number
//                         );
//                         false
//                     }
//                 }
//             {
//                 //TODO: END GAME!
//                 println!("GAME OVER:\n\t{}", self);
//                 self.completed = true;
//             }
//         }
//     }
//     pub fn date(&self) -> ::chrono::NaiveDateTime {
//         self.date_played
//     }
//     pub fn get_score<F, S>(&self, player: Player, f: F) -> S
//     where
//         F: Fn(&T::Score) -> S,
//     {
//         self.scores
//             .get(&player)
//             .map(f)
//             .expect("Player is not playing current game")
//     }
//     pub fn scores(&self) -> &IndexMap<Player, T::Score> {
//         &self.scores
//     }
//     pub fn scores_mut(&mut self) -> &mut IndexMap<Player, T::Score> {
//         &mut self.scores
//     }
//     pub fn round_number(&self) -> usize {
//         self.round_number
//     }
//     pub fn rounds<'a>(&'a self) -> impl Iterator<Item = impl Iterator<Item = String> + 'a> {
//         let score_rounds = self
//             .scores
//             .values()
//             .map(|s| s.rounds_display().collect::<Vec<_>>())
//             .collect::<Vec<_>>();
//         (1..=self.round_number).into_iter().map(move |r| {
//             let mut vec = vec![r.to_string()];
//             for player_score in score_rounds.iter() {
//                 vec.push(
//                     player_score
//                         .get(&r - 1)
//                         .map(|d| d.to_string())
//                         .unwrap_or_default(),
//                 );
//             }
//             vec.into_iter()
//         })
//     }
//     // /// Get the number of players who haven't scored this round
//     // pub fn remaining_players(&self) -> Vec<&Player> {
//     //     self.scores.iter().filter_map(|(p, s)| if s.current_round() >= self.round_number { None } else { Some(p) }).collect::<Vec<_>>()
//     // }
//     pub fn is_finished(&self) -> bool {
//         self.completed
//     }
//     pub fn iter_turns<'g>(&'g mut self) -> GameTurnIter<'g, T> {
//         GameTurnIter::new(self)
//     }
//     pub fn next_turn(&mut self) -> Option<(Player, T::Turn)> {
//         if self.is_finished() {
//             None
//         } else {
//             if self.remaining_players.len() < 1 {
//                 self.remaining_players = self.scores.keys().cloned().collect();
//             }
//             self.remaining_players.pop_front().and_then(|p| {
//                 self.scores
//                     .get_full_mut(&p)
//                     .map(|(_, &p, s)| (p, s.new_turn()))
//             })
//         }
//     }
// }
