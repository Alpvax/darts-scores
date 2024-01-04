// use crate::game::turn::{DartResult, TurnResult};
use crate::game::turn::impls::SingleTarget;
use crate::{prelude::*};
use crate::game::score::{ActiveGameScore, GameScore};

pub struct GameType27;

impl GameType for GameType27 {
    const ID: &'static str = "twentyseven";

    type Score = Score27;

    type Config = ();

    fn new_score(config: &Self::Config, player: &crate::player::Player) -> <Self::Score as GameScore>::Active {
        ActiveScore27::new()
    }

    fn should_end_game<'g, PR, PU>(round_players: PR, remaining_players: PU, config: &'g Self::Config) -> GameEnd
    where
        PR: IntoIterator<Item = &'g crate::player::Player>,
        PU: IntoIterator<Item = &'g crate::player::Player>,
    {
        if remaining_players.into_iter().count() < 1 {
            GameEnd::EndGame
        } else {
            GameEnd::Continue
        }
    }
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct Score27 {
    rounds: [u8; 5],
    all_positive: bool,
    cliffs: u8,
    score: i16,
}
impl GameScore for Score27 {
    type Active = ActiveScore27;

    type Value = i16;

    fn is_finished(&self) -> bool {
        true
    }

    fn score(&self) -> Self::Value {
        self.score
    }

    fn cumulative_score(&self, round: usize) -> Self::Value {
        todo!()
    }
}
impl From<ActiveScore27> for Score27 {
    fn from(a: ActiveScore27) -> Self {
        if a.dirty.is_some() {
            a.recalc();
        }
        let mut score = Self {
            rounds: [0; 5],
            all_positive: a.all_positive,
            cliffs: 0,
            score: a.score
        };
        for i in 0..4 {
            let start = (4 - i) * 4; // i = 0: 16..20, 1: 12..16, ...
            score.rounds[i] = a.rounds[start..start + 4].into_iter().enumerate().fold(0u8, |mut byte, (o, t)| {
                if let Some(turn) = t {
                    let hits = turn.hits();
                    byte |= (12 + hits) << (o * 2);
                    if hits >= 3 {
                        score.cliffs += 1;
                    }
                }
                byte
            });
        }
        score
    }
}

#[derive(Debug)]
pub struct ActiveScore27 {
    rounds: [Option<ActiveGameTurn>; 20],
    dirty: Option<usize>,
    all_positive: bool,
    score: i16,
}
impl ActiveScore27 {
    fn recalc(&mut self) {
        if let Some(idx) = self.dirty.take() {
            let turn = self.rounds[idx].unwrap();
            self.score = turn.start_score;
            self.all_positive = turn.start_positive;
            for i in idx + 1..20 {
                if let Some(mut t) = self.rounds[i] {
                    t.start_score = self.score;
                    t.start_positive = self.all_positive;
                    self.score += t.delta();
                    if self.score < 0 {
                        self.all_positive = false;
                    }
                }
            }
        }
    }

    fn new() -> Self {
        Self {
            rounds: [None; 20],
            dirty: None,
            all_positive: true,
            score: 27,
        }
    }
}
impl ActiveGameScore for ActiveScore27 {
    type Turn = SingleTarget;

    fn current_round(&self) -> usize {
        self.rounds.iter().enumerate().find_map(|(i, r)| r.and(Some(i))).unwrap_or(20)
    }

    fn make_turn(&self, round: usize) -> Option<Self::Turn> {
        Some(SingleTarget::new(3, BoardSection::Number(round.try_into().unwrap(), Ring::Double)))
    }
}
impl core::ops::AddAssign<SingleTarget> for ActiveScore27 {
    fn add_assign(&mut self, rhs: SingleTarget) {
        if rhs.remaining_darts() > 1 {
            panic!("turn not finished, throw all darts");
        }
        let t = rhs.target().number().unwrap();
        let round = <usize as TryFrom<_>>::try_from(t).unwrap();
        if let Some(mut agt) = &self.rounds[round] {
            agt.set_hits(rhs.hits());
        } else {
            self.rounds[round] = Some(ActiveGameTurn::new_from(self.score, self.all_positive, rhs));
        }
        self.dirty = if let Some(r) = self.dirty {
            Some(core::cmp::min(r, round))
        } else {
            Some(round)
        };
    }
}
#[derive(Debug, Clone, Copy)]
struct ActiveGameTurn {
    start_score: i16,
    round_and_hits: u8,
    start_positive: bool,
}
impl ActiveGameTurn {
    fn new_from(start_score: i16, start_positive: bool, turn: SingleTarget) -> Self {
        Self {
            start_score,
            round_and_hits: (turn.target().number().unwrap() << 2) | (turn.hits() & 3),
            start_positive,
        }
    }
    fn round(&self) -> u8 {
        self.round_and_hits >> 2
    }
    fn hits(&self) -> u8 {
        self.round_and_hits & 3
    }
    fn set_hits(&mut self, hits: u8) {
        self.round_and_hits = (u8::MAX ^ 3) | (hits & 3)
    }
    fn delta(&self) -> i16 {
        let mul = 2 * <i16 as From<u8>>::from(self.round());
        match <i16 as From<u8>>::from(self.hits()) {
            0 => -mul,
            n => n * mul,
        }
    }
    fn final_score(&self) -> i16 {
        self.start_score + self.delta()
    }
}