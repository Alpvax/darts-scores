use crate::{game::gametype::GameEnd, prelude::*};

#[derive(Debug)] //XXX?
pub struct GameType27;

impl GameType for GameType27 {
    type Turn = Turn27;

    type Score = Score27;

    type PlayerSummary = String; //TODO: summary

    type Config = ();

    fn new_score(_player: &crate::player::Player) -> Self::Score {
        Score27 {
            score: 27,
            rounds: [0; 5],
            taken_round: 0, //TODO: 1-indexed turn
            cliffs: 0,
            all_positive: true,
        }
    }

    fn should_end_game<'g, P>(remaining_players: P, _config: &'g Self::Config) -> GameEnd
    where
        P: IntoIterator<Item = &'g crate::player::Player>,
    {
        if remaining_players.into_iter().next().is_none() {
            GameEnd::EndGame
        } else {
            GameEnd::Continue
        }
    }
}

#[derive(Debug)] //XXX?
pub struct Turn27(u8, u8);
impl Turn27 {
    pub fn score_hits(&mut self, hits: u8) {
        if hits > 3 {
            panic!("Maximum of 3 darts")
        }
        self.1 = 12 | hits;
    }
}
impl Turn for Turn27 {
    /// hits, delta_score
    type Score = (u8, i8);

    fn num_darts(&self) -> NumDarts {
        NumDarts::Exactly(3)
    }

    fn darts_thrown(&self) -> u8 {
        (self.1 >> 2) & 3
    }

    fn current_round_num(&self) -> usize {
        self.0.into() //TODO:? - 1? 0 indexed or 1-indexed?
    }

    fn score_dart(&mut self, target: Target) {
        if self.1 > 12 {
            return; // already thrown 3 darts
        }
        self.1 += 4; // Darts thrown
        if Target::Number(self.0, crate::target::Section::Double) == target {
            self.1 += 1;
        }
    }

    fn score(self) -> Self::Score {
        let hits = self.1 & 3;
        if hits == 0 {
            (hits, -2 * <i8 as TryFrom<u8>>::try_from(self.0).unwrap())
        } else {
            (hits, (self.0 * 2 * hits).try_into().unwrap())
        }
    }
}

pub struct Score27 {
    score: i16,
    /// 20 2-bit scores. Most to least significant
    /// (i.e. [[20,19,18,17],[16..13],..[4,3,2,1]])
    rounds: [u8; 5],
    taken_round: usize,
    cliffs: u8,
    all_positive: bool,
}
impl Score27 {
    /// Returns None if the passed in round has not been played yet
    pub fn hits(&self, round: usize) -> Option<u8> {
        if round == 0 {
            panic!("Round numbers start from 1");
        } else if round > 20 {
            panic!("Maximum round number is 20");
        } else if round >= self.taken_round {
            None
        } else {
            let shift = ((round - 1) & 3) * 2;
            Some((self.rounds[4 - ((round - 1) >> 2)] & (3 << shift)) >> shift)
        }
    }
    // fn expanded_turns(&self) -> impl Iterator<Item = crate::display::scoredisplay::ScoreDisplay<i16, i8>> {

    // }
}
impl GameScore<Turn27> for Score27 {
    type Value = i16;
    // type RoundIter = crate::display::scoredisplay::ScoreDisplayIter<i16, i16>;
    type RoundDisplay = i16;
    fn current_round(&self) -> usize {
        self.taken_round
    }
    fn is_finished(&self) -> bool {
        self.taken_round >= 20
    }
    fn new_turn(&self) -> Turn27 {
        Turn27(
            <u8 as TryFrom<_>>::try_from(self.taken_round).unwrap() + 1,
            0,
        )
    }
    fn with_turn<F, U>(&mut self, round: usize, f: F) -> Option<U> where F: Fn(&mut Turn27) -> U {
        if round > self.taken_round + 1 {
            None
        } else {
            let shift = ((round - 1) & 3) * 2;
            let b_index = 4 - ((round - 1) >> 2);
            let hits = (self.rounds[b_index] >> shift) & 3;
            let mut turn = if round > self.taken_round {
                self.new_turn()
            } else {
                Turn27(
                    <u8 as TryFrom<_>>::try_from(round).unwrap() + 1,
                    12 | hits,
                )
            };
            let res = f(&mut turn);
            let mut score = 
            Some(res)
        }
    }
    // fn rounds<'a>(&'a self) -> Box<dyn Iterator<Item = <Turn27 as Turn>::Score> + 'a> {
    fn rounds_display<'a>(
        &'a self,
    ) -> crate::display::scoredisplay::ScoreDisplayIter<Self::Value, Self::RoundDisplay> {
        crate::display::scoredisplay::ScoreDisplayIter::new_addassign(
            27,
            (0..std::cmp::min(self.taken_round, 20))
                .into_iter()
                .map(|round| {
                    let r = <u8 as TryFrom<_>>::try_from(round).unwrap() & 3;
                    let shift = r * 2;
                    let hits = (self.rounds[4 - (round >> 2)] >> shift) & 3;
                    let s = <i16 as TryFrom<_>>::try_from(round + 1).unwrap() * 2;
                    if hits == 0 {
                        -s
                    } else {
                        <i16 as TryFrom<_>>::try_from(hits).unwrap() * s
                    }
                }),
        )
    }
    // fn rounds(&self) -> Box<dyn Iterator<Item = <Turn27 as Turn>::Score>> {
    //     Box::new((1..=self.current_round).into_iter().map(|round| self.turn_score(round)))
    // }
    // fn round_score(&self, round: usize) -> <Turn27 as Turn>::Score {
    //     let hits = self.hits(round).unwrap_or(0);
    //     let dbl = 2 * <i8 as TryFrom<usize>>::try_from(round).unwrap();
    //     if hits == 0 {
    //         (hits, dbl * -1)
    //     } else {
    //         (hits, dbl * <i8 as TryFrom<u8>>::try_from(hits).unwrap())
    //     }
    // }
    // fn fmt_score(&self, (hits, score): &<Turn27 as Turn>::Score) -> String {
    //     format!("{} ({:+})", score, hits)
    // }
    fn score(&self) -> Self::Value {
        self.score
    }
    fn cumulative_score(&self, round: usize) -> Self::Value {
        fn byte_score(b: u8, r: u8) -> i16 {
            let mut score = 0;
            for u2 in 0..r {
                score += match (b >> (u2 * 2)) & 3 {
                    0 => -<i16 as TryFrom<_>>::try_from(u2 + 1).unwrap(),
                    4.. => unreachable!(),
                    n => <i16 as TryFrom<_>>::try_from((u2 + 1) * n).unwrap(),
                }
            }
            score * 2
        }
        if round >= self.taken_round {
            self.score
        } else {
            let ru8 = <u8 as TryFrom<usize>>::try_from(round).unwrap();
            let mut score = 27;
            for i in 0..=4 {
                if round > i * 4 {
                    score += 4 * <i16 as TryFrom<_>>::try_from(i).unwrap()
                        + byte_score(self.rounds[4 - i], (ru8) & 3);
                } else {
                    break;
                }
            }
            score
        }
    }
}
impl core::ops::AddAssign<(u8, i8)> for Score27 {
    fn add_assign(&mut self, (h, s): (u8, i8)) {
        if self.taken_round < 20 {
            self.score += <i16 as From<i8>>::from(s);
            // index = 4 - ((current - 1) / 4)
            self.rounds[4 - (self.taken_round >> 2)] |= h << ((self.taken_round & 3) * 2);
            if h == 3 {
                self.cliffs += 1;
            }
            if self.all_positive && self.score < 0 {
                self.all_positive = false;
            }
            self.taken_round += 1;
        }
    }
}
// impl core::ops::AddAssign<(i8, bool)> for Score27 {
//     fn add_assign(&mut self, (s, c): (i8, bool)) {
//         self.score += <i16 as From<i8>>::from(s);
//         // index = 4 - ((current - 1) / 4)
//         self.rounds[4 - ((self.current_round - 1) >> 2)] |= ;
//         if c {
//             self.cliffs += 1;
//         }
//         self.current_round += 1;
//         if self.all_positive && self.score < 0 {
//             self.all_positive = false;
//         }
//     }
// }

impl core::fmt::Display for Score27 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if f.alternate() {
            todo!()
        } else {
            write!(f, "{} ({}, {})", self.score, self.cliffs, self.all_positive)
        }
    }
}
impl core::fmt::Debug for Score27 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Score27")
            .field("score", &self.score)
            .field(
                "rounds",
                &self
                    .rounds
                    .iter()
                    .map(|byte| {
                        format!(
                            "{}{}{}{}",
                            (byte >> 6) & 3,
                            (byte >> 4) & 3,
                            (byte >> 2) & 3,
                            byte & 3
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(""),
            )
            .field("current_round", &self.taken_round)
            .field("cliffs", &self.cliffs)
            .field("all_positive", &self.all_positive)
            .finish()
    }
}

impl GameDisplay for GameType27 {
    fn fmt(game: &crate::game::Game<Self>, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result
    where
        Self: Sized,
    {
        write!(f, "Game of 27 started at: {}\n", game.date())?;
        todo!()
    }
}
