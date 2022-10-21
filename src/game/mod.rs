use indexmap::IndexMap;

use crate::player::Player;

pub use self::gametype::GameType;
pub use self::round::{NumDarts, Turn};
pub use self::score::GameScore;

pub mod gametype;
mod round;
mod score;

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

#[derive(Debug)]
pub struct Game<T>
where
    T: GameType,
{
    typ: core::marker::PhantomData<T>,
    date_played: ::chrono::NaiveDateTime,
    scores: IndexMap<Player, T::Score>,
    remaining_players: std::collections::VecDeque<Player>,
    config: T::Config,
    round_number: usize,
    final_round: bool,
    completed: bool,
    // Whether to continue
    // play_until: PlayUntil,
}
impl<T> Game<T>
where
    T: GameType,
{
    pub fn new<P>(/*game_type: T, */ players: P, config: T::Config) -> Self
    where
        P: IntoIterator<Item = Player>,
    {
        Self::new_dated(
            // game_type,
            ::chrono::Utc::now().naive_local(),
            players,
            config,
        )
    }
    pub fn new_dated<D, P>(
        /*game_type: T, */ datetime: D,
        players: P,
        config: T::Config,
    ) -> Self
    where
        D: Into<::chrono::NaiveDateTime>,
        P: IntoIterator<Item = Player>,
    {
        let scores: IndexMap<_, _> = players
            .into_iter()
            .map(|p| {
                let s = T::new_score(&p);
                (p, s)
            })
            .collect();
        assert!(scores.len() > 0, "Game cannot be played with no players!");
        Self {
            // typ: game_type,
            typ: core::marker::PhantomData,
            date_played: datetime.into(),
            scores,
            remaining_players: Default::default(),
            config,
            round_number: 0,
            final_round: false,
            completed: false,
        }
    }

    pub fn take_turn<F>(&mut self, player: Player, mut f: F)
    where
        F: FnMut(&mut T::Turn) -> (),
    {
        let score = self
            .scores
            .get_mut(&player)
            .expect("Player is not playing current game");
        // let t = score.current_round();
        // if t > self.round_number {
        //     self.round_number = t;
        // }
        let mut turn = score.new_turn();
        f(&mut turn);
        self.score_turn(player, turn.score())
    }

    fn score_turn(&mut self, player: Player, score: <T::Turn as Turn>::Score) -> () {
        //TODO: TurnResult?
        let p_score = self
            .scores
            .get_mut(&player)
            .expect("Player is not playing current game");
        *p_score += score;
        self.round_number = core::cmp::max(self.round_number, p_score.current_round());
        if p_score.is_finished() {
            // Players who have not completed the game
            let remaining = self
                .scores
                .iter()
                .filter_map(|(p, s)| if s.is_finished() { None } else { Some(p) })
                .collect::<Vec<_>>();
            if (remaining.len() < 1 && self.final_round)
                || match (remaining.len(), T::should_end_game(remaining, &self.config)) {
                    (_, gametype::GameEnd::EndGame) | (0, gametype::GameEnd::FinishRound) => true,
                    (_, gametype::GameEnd::FinishRound) => {
                        self.final_round = true;
                        println!(
                        "Player {} has finished during round {}\n\t The remainder of the round will play out to allow for draws",
                        player, self.round_number
                    );
                        false
                    }
                    _ => {
                        println!(
                            "Player {} has won during round {}",
                            player, self.round_number
                        );
                        false
                    }
                }
            {
                //TODO: END GAME!
                println!("GAME OVER:\n\t{}", self);
                self.completed = true;
            }
        }
    }
    pub fn date(&self) -> ::chrono::NaiveDateTime {
        self.date_played
    }
    pub fn get_score<F, S>(&self, player: Player, f: F) -> S
    where
        F: Fn(&T::Score) -> S,
    {
        self.scores
            .get(&player)
            .map(f)
            .expect("Player is not playing current game")
    }
    pub fn scores(&self) -> &IndexMap<Player, T::Score> {
        &self.scores
    }
    pub fn scores_mut(&mut self) -> &mut IndexMap<Player, T::Score> {
        &mut self.scores
    }
    pub fn round_number(&self) -> usize {
        self.round_number
    }
    pub fn rounds<'a>(&'a self) -> impl Iterator<Item = impl Iterator<Item = String> + 'a> {
        let score_rounds = self
            .scores
            .values()
            .map(|s| s.rounds_display().collect::<Vec<_>>())
            .collect::<Vec<_>>();
        (1..=self.round_number).into_iter().map(move |r| {
            let mut vec = vec![r.to_string()];
            for player_score in score_rounds.iter() {
                vec.push(
                    player_score
                        .get(&r - 1)
                        .map(|d| d.to_string())
                        .unwrap_or_default(),
                );
            }
            vec.into_iter()
        })
    }
    // /// Get the number of players who haven't scored this round
    // pub fn remaining_players(&self) -> Vec<&Player> {
    //     self.scores.iter().filter_map(|(p, s)| if s.current_round() >= self.round_number { None } else { Some(p) }).collect::<Vec<_>>()
    // }
    pub fn is_finished(&self) -> bool {
        self.completed
    }
    pub fn iter_turns<'g>(&'g mut self) -> GameTurnIter<'g, T> {
        GameTurnIter::new(self)
    }
    pub fn next_turn(&mut self) -> Option<(Player, T::Turn)> {
        if self.is_finished() {
            None
        } else {
            if self.remaining_players.len() < 1 {
                self.remaining_players = self.scores.keys().cloned().collect();
            }
            self.remaining_players.pop_front().and_then(|p| {
                self.scores
                    .get_full_mut(&p)
                    .map(|(_, &p, s)| (p, s.new_turn()))
            })
        }
    }
}

pub struct GameTurnIter<'g, T>
where
    T: GameType,
{
    game: &'g mut Game<T>,
    turn: Option<(Player, T::Turn)>,
}
impl<'g, T> GameTurnIter<'g, T>
where
    T: GameType,
{
    fn new(game: &'g mut Game<T>) -> Self {
        Self { game, turn: None }
    }
}
// impl<T> Iterator for GameTurnIter<'_, T> where T: GameType {
//     type Item = (Player, T::Turn);

//     fn next(&mut self) -> Option<Self::Item> {
//         if let Some((p, t)) = self.turn.take() {
//             self.game.score_turn(p, t.score());
//         }
//         self.turn = self.game.next_turn();
//         self.turn.as_ref()
//     }
// }
// impl<T> Game<T> where T: GameType, <T::Turn as Turn>::Score: ToString {
//     pub fn rounds<'a>(&'a self) -> impl Iterator<Item = impl Iterator<Item = String> + 'a> {
//         (1..=self.round_number).into_iter()
//             .map(|r| core::iter::once(r.to_string()).chain(self.scores.values().map(move |s| s.round_score(r).to_string())))
//     }
// }

pub trait GameDisplay: GameType {
    fn fmt(game: &Game<Self>, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result
    where
        Self: Sized;
}

// impl<T> core::fmt::Display for Game<T>
// where
//     T: GameType,
//     T::Score: core::fmt::Display,
// {
//     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
//         write!(f, "Round")?;
//         for player in self.scores.keys() {
//             write!(f, "\t{:#}\t\t", player)?;
//         }
//         write!(f, "\n{}", self.round_number)?;
//         for score in self.scores.values() {
//             write!(f, "\t{}\t", score)?;
//         }
//         Ok(())
//     }
// }

// impl<T> core::fmt::Display for Game<T>
// where
//     T: GameDisplay,
// {
//     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
//         T::fmt(self, f)
//     }
// }
