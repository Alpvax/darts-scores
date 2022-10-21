use crate::{
    game::{DartResult, Score, Turn, TurnResult},
    target::{numhits::NumHits, Section, Target},
};

struct Score27 {
    turns: [Option<Turn27>; 20],
    turn_index: usize,
    current_score: i16,
    all_positive: bool,
}
impl Score27 {
    fn all_positive(&self) -> bool {
        let mut score = 27;
        for turn in self.turns.iter().flatten() {
            score += turn.get_score_change();
            if score < 0 {
                return false;
            }
        }
        true
    }
}
impl Score for Score27 {
    type Turn = Turn27;
    type Value = i16;
    fn new() -> Self {
        Self {
            turns: [None; 20],
            turn_index: 0,
            current_score: 27,
            all_positive: true,
        }
    }
    fn current_round(&self) -> u8 {
        u8::try_from(self.turn_index).unwrap() + 1
    }
    fn current_score(&self) -> Self::Value {
        todo!()
    }
    fn next_turn(&mut self) -> Option<&mut Self::Turn> {
        if self.turn_index >= 19 {
            None
        } else {
            self.turns[self.turn_index] = Some(Turn27 {
                start_score: self.current_score(),
                target: self.current_round(),
                darts: 0,
            });
            (&mut self.turns[self.turn_index]).as_mut()
        }
    }
    fn end_turn(&mut self) -> TurnResult {
        self.turn_index += 1;
        todo!()
    }
    fn is_finished(&self) -> bool {
        self.turns[19].map(|t| t.is_finished()).unwrap_or(false)
    }
}

#[derive(Debug, Clone, Copy)]
struct Turn27 {
    start_score: i16,
    target: u8,
    darts: u8,
    // hits: NumHits,
    // darts: NumHits,
}
impl Turn27 {
    fn is_cliff(&self) -> bool {
        self.darts & 3 == 3
    }
}
impl Turn<Score27> for Turn27 {
    type Hit = NumHits;

    fn score_dart(&mut self, hit: Target) -> DartResult<<Score27 as Score>::Value> {
        self.darts += 4;
        if hit == Target::Number(self.target, Section::Double) {
            self.darts += 1;
        }
        if self.is_finished() {
            DartResult::Partial(self.start_score + self.get_score_change(), 3 - self.darts)
        } else {
            DartResult::TurnEnded(if self.target == 20 {
                TurnResult::PlayerFinish(3)
            } else {
                TurnResult::NextPlayer
            })
        }
    }

    fn score_darts<const N: usize>(&mut self, hits: [Target; N]) -> TurnResult {
        self.darts |= 12;
        hits.into_iter()
            .filter(|t| t == &Target::Number(self.target, Section::Double))
            .for_each(|_| self.darts += 1);
        if self.target == 20 {
            TurnResult::PlayerFinish(3)
        } else {
            TurnResult::NextPlayer
        }
    }

    fn is_finished(&self) -> bool {
        self.darts >= 12
    }

    fn get_score_change(&self) -> <Score27 as Score>::Value {
        <Score27 as Score>::Value::from(self.target)
            * match self.darts & 3 {
                0 => -2,
                1 => 2,
                2 => 4,
                3 => 6,
                _ => unreachable!(),
            }
    }

    fn score_turn<T>(&mut self, score: T) -> TurnResult
    where
        T: Into<Self::Hit>,
    {
        let hit: NumHits = score.into();
        self.darts = 12 | u8::from(hit);
        if self.target == 20 {
            TurnResult::PlayerFinish(3)
        } else {
            TurnResult::NextPlayer
        }
    }
}
